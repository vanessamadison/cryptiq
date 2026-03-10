import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.getenv("CRYPTIQ_DB_PATH", os.path.join(os.path.dirname(__file__), "cryptiq.db"))


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_by INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (created_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS room_members (
                room_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                joined_at TEXT NOT NULL,
                PRIMARY KEY (room_id, user_id),
                FOREIGN KEY (room_id) REFERENCES rooms(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                sender_id INTEGER NOT NULL,
                sender_name TEXT NOT NULL,
                ciphertext TEXT NOT NULL,
                nonce TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (room_id) REFERENCES rooms(id),
                FOREIGN KEY (sender_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS device_keys (
                user_id INTEGER PRIMARY KEY,
                kem_public_key TEXT NOT NULL,
                dh_public_key TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS room_envelopes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                recipient_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                kem_ciphertext TEXT NOT NULL,
                dh_public_key TEXT NOT NULL,
                wrapped_key TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (room_id) REFERENCES rooms(id),
                FOREIGN KEY (recipient_id) REFERENCES users(id),
                FOREIGN KEY (sender_id) REFERENCES users(id)
            );
            """
        )
