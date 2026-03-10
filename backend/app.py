import os
import time
import json
import uuid
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import jwt

from db import get_db, init_db
from crypto_provider import get_pqc_status

app = Flask(__name__)
CORS(app, supports_credentials=True)

JWT_SECRET = os.getenv("CRYPTIQ_JWT_SECRET", "dev-secret-change-me")
JWT_ISSUER = "cryptiq"
TOKEN_TTL_MIN = int(os.getenv("CRYPTIQ_TOKEN_TTL_MIN", "120"))


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def issue_token(user_id, email, display_name):
    exp = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MIN)
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": display_name,
        "iss": JWT_ISSUER,
        "exp": exp,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_auth():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    return decode_token(token)


def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"], issuer=JWT_ISSUER)
    except jwt.PyJWTError:
        return None


def is_member(conn, room_id, user_id):
    return (
        conn.execute(
            "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
            (room_id, user_id),
        ).fetchone()
        is not None
    )


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": now_iso()})


@app.route("/api/pqc/status", methods=["GET"])
def pqc_status():
    available, kem, sig = get_pqc_status()
    return jsonify(
        {
            "oqs_available": available,
            "kem_algorithm": kem,
            "signature_algorithm": sig,
        }
    )


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or "").strip()

    if not email or not password or not display_name:
        return jsonify({"error": "missing_fields"}), 400

    password_hash = generate_password_hash(password)
    created_at = now_iso()

    with get_db() as conn:
        try:
            conn.execute(
                "INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (email, display_name, password_hash, created_at),
            )
        except Exception:
            return jsonify({"error": "email_taken"}), 409
        user_id = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()["id"]

    token = issue_token(user_id, email, display_name)
    return jsonify({"token": token, "user": {"id": user_id, "email": email, "display_name": display_name}})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "missing_fields"}), 400

    with get_db() as conn:
        row = conn.execute(
            "SELECT id, email, display_name, password_hash FROM users WHERE email = ?", (email,)
        ).fetchone()

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "invalid_credentials"}), 401

    token = issue_token(row["id"], row["email"], row["display_name"])
    return jsonify({"token": token, "user": {"id": row["id"], "email": row["email"], "display_name": row["display_name"]}})


@app.route("/api/profile", methods=["GET"])
def profile():
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401
    return jsonify({"user": {"id": payload["sub"], "email": payload["email"], "display_name": payload["name"]}})


@app.route("/api/rooms", methods=["POST"])
def create_room():
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "missing_fields"}), 400

    room_id = str(uuid.uuid4())
    created_at = now_iso()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO rooms (id, name, created_by, created_at) VALUES (?, ?, ?, ?)",
            (room_id, name, payload["sub"], created_at),
        )
        conn.execute(
            "INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
            (room_id, payload["sub"], created_at),
        )

    return jsonify({"room": {"id": room_id, "name": name, "created_at": created_at}})


@app.route("/api/rooms/join", methods=["POST"])
def join_room():
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    room_id = (data.get("room_id") or "").strip()
    if not room_id:
        return jsonify({"error": "missing_fields"}), 400

    with get_db() as conn:
        room = conn.execute("SELECT id, name FROM rooms WHERE id = ?", (room_id,)).fetchone()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        conn.execute(
            "INSERT OR IGNORE INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
            (room_id, payload["sub"], now_iso()),
        )

    return jsonify({"room": {"id": room["id"], "name": room["name"]}})


@app.route("/api/rooms", methods=["GET"])
def list_rooms():
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT rooms.id, rooms.name, rooms.created_at
            FROM rooms
            JOIN room_members ON rooms.id = room_members.room_id
            WHERE room_members.user_id = ?
            ORDER BY rooms.created_at DESC
            """,
            (payload["sub"],),
        ).fetchall()

    rooms = [{"id": r["id"], "name": r["name"], "created_at": r["created_at"]} for r in rows]
    return jsonify({"rooms": rooms})


@app.route("/api/rooms/<room_id>/messages", methods=["GET"])
def list_messages(room_id):
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    with get_db() as conn:
        if not is_member(conn, room_id, payload["sub"]):
            return jsonify({"error": "forbidden"}), 403

        rows = conn.execute(
            """
            SELECT id, sender_id, sender_name, ciphertext, nonce, created_at
            FROM messages
            WHERE room_id = ?
            ORDER BY id ASC
            """,
            (room_id,),
        ).fetchall()

    messages = [
        {
            "id": r["id"],
            "sender_id": r["sender_id"],
            "sender_name": r["sender_name"],
            "ciphertext": r["ciphertext"],
            "nonce": r["nonce"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]
    return jsonify({"messages": messages})


@app.route("/api/rooms/<room_id>/messages", methods=["POST"])
def send_message(room_id):
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    ciphertext = (data.get("ciphertext") or "").strip()
    nonce = (data.get("nonce") or "").strip()
    if not ciphertext or not nonce:
        return jsonify({"error": "missing_fields"}), 400

    with get_db() as conn:
        if not is_member(conn, room_id, payload["sub"]):
            return jsonify({"error": "forbidden"}), 403

        conn.execute(
            """
            INSERT INTO messages (room_id, sender_id, sender_name, ciphertext, nonce, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                room_id,
                payload["sub"],
                payload["name"],
                ciphertext,
                nonce,
                now_iso(),
            ),
        )

    return jsonify({"ok": True})


@app.route("/api/rooms/<room_id>/stream", methods=["GET"])
def stream_messages(room_id):
    payload = require_auth()
    if not payload:
        token = request.args.get("token", "").strip()
        if token:
            payload = decode_token(token)
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    last_id = int(request.args.get("last_id", "0"))

    def event_stream():
        with get_db() as conn:
            if not is_member(conn, room_id, payload["sub"]):
                yield "event: error\ndata: forbidden\n\n"
                return
            current_id = last_id
            while True:
                rows = conn.execute(
                    """
                    SELECT id, sender_id, sender_name, ciphertext, nonce, created_at
                    FROM messages
                    WHERE room_id = ? AND id > ?
                    ORDER BY id ASC
                    """,
                    (room_id, current_id),
                ).fetchall()
                if rows:
                    for row in rows:
                        data = {
                            "id": row["id"],
                            "sender_id": row["sender_id"],
                            "sender_name": row["sender_name"],
                            "ciphertext": row["ciphertext"],
                            "nonce": row["nonce"],
                            "created_at": row["created_at"],
                        }
                        yield f"data: {json.dumps(data)}\n\n"
                        current_id = row["id"]
                time.sleep(2)

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/keys/register", methods=["POST"])
def register_keys():
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    kem_public_key = (data.get("kem_public_key") or "").strip()
    dh_public_key = (data.get("dh_public_key") or "").strip()
    if not kem_public_key or not dh_public_key:
        return jsonify({"error": "missing_fields"}), 400

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO device_keys (user_id, kem_public_key, dh_public_key, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                kem_public_key = excluded.kem_public_key,
                dh_public_key = excluded.dh_public_key,
                created_at = excluded.created_at
            """,
            (payload["sub"], kem_public_key, dh_public_key, now_iso()),
        )

    return jsonify({"ok": True})


@app.route("/api/rooms/<room_id>/keys", methods=["GET"])
def list_room_keys(room_id):
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    with get_db() as conn:
        if not is_member(conn, room_id, payload["sub"]):
            return jsonify({"error": "forbidden"}), 403
        rows = conn.execute(
            """
            SELECT users.id, users.display_name, device_keys.kem_public_key, device_keys.dh_public_key
            FROM room_members
            JOIN users ON room_members.user_id = users.id
            JOIN device_keys ON device_keys.user_id = users.id
            WHERE room_members.room_id = ?
            """,
            (room_id,),
        ).fetchall()

    keys = [
        {
            "user_id": r["id"],
            "display_name": r["display_name"],
            "kem_public_key": r["kem_public_key"],
            "dh_public_key": r["dh_public_key"],
        }
        for r in rows
    ]
    return jsonify({"keys": keys})


@app.route("/api/rooms/<room_id>/envelopes", methods=["POST"])
def create_envelopes(room_id):
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    envelopes = data.get("envelopes") or []
    if not isinstance(envelopes, list) or not envelopes:
        return jsonify({"error": "missing_fields"}), 400

    with get_db() as conn:
        if not is_member(conn, room_id, payload["sub"]):
            return jsonify({"error": "forbidden"}), 403

        for env in envelopes:
            recipient_id = env.get("recipient_id")
            kem_ciphertext = env.get("kem_ciphertext")
            dh_public_key = env.get("dh_public_key")
            wrapped_key = env.get("wrapped_key")
            if not recipient_id or not kem_ciphertext or not dh_public_key or not wrapped_key:
                continue
            conn.execute(
                """
                INSERT INTO room_envelopes (room_id, recipient_id, sender_id, kem_ciphertext, dh_public_key, wrapped_key, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    room_id,
                    recipient_id,
                    payload["sub"],
                    kem_ciphertext,
                    dh_public_key,
                    wrapped_key,
                    now_iso(),
                ),
            )

    return jsonify({"ok": True})


@app.route("/api/rooms/<room_id>/envelopes", methods=["GET"])
def get_envelopes(room_id):
    payload = require_auth()
    if not payload:
        return jsonify({"error": "unauthorized"}), 401

    with get_db() as conn:
        if not is_member(conn, room_id, payload["sub"]):
            return jsonify({"error": "forbidden"}), 403
        rows = conn.execute(
            """
            SELECT id, sender_id, kem_ciphertext, dh_public_key, wrapped_key, created_at
            FROM room_envelopes
            WHERE room_id = ? AND recipient_id = ?
            ORDER BY id ASC
            """,
            (room_id, payload["sub"]),
        ).fetchall()
        conn.execute(
            "DELETE FROM room_envelopes WHERE room_id = ? AND recipient_id = ?",
            (room_id, payload["sub"]),
        )

    envelopes = [
        {
            "id": r["id"],
            "sender_id": r["sender_id"],
            "kem_ciphertext": r["kem_ciphertext"],
            "dh_public_key": r["dh_public_key"],
            "wrapped_key": r["wrapped_key"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]
    return jsonify({"envelopes": envelopes})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
