"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken } from "../lib/api";
import { ensureDeviceKeys } from "../lib/device";

export const dynamic = "force-dynamic";

interface Room {
  id: string;
  name: string;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ display_name: string } | null>(null);
  const [pqcStatus, setPqcStatus] = useState<{ oqs_available: boolean; kem_algorithm?: string; signature_algorithm?: string } | null>(null);

  const load = async () => {
    try {
      const profileRes = await apiFetch("/api/profile");
      setProfile(profileRes.user);
      const roomsRes = await apiFetch("/api/rooms");
      setRooms(roomsRes.rooms || []);
      const pqcRes = await apiFetch("/api/pqc/status");
      setPqcStatus(pqcRes);
      await ensureDeviceKeys();
    } catch (err: any) {
      if (err.message === "unauthorized") {
        clearToken();
        router.push("/auth");
        return;
      }
      setError(err.message || "Unable to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!name) return;
    try {
      const data = await apiFetch("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setRooms((prev) => [data.room, ...prev]);
      setName("");
    } catch (err: any) {
      setError(err.message || "Unable to create room");
    }
  };

  const handleJoin = async () => {
    setError(null);
    if (!roomId) return;
    try {
      const data = await apiFetch("/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ room_id: roomId }),
      });
      setRooms((prev) => [data.room, ...prev.filter((r) => r.id !== data.room.id)]);
      setRoomId("");
    } catch (err: any) {
      setError(err.message || "Unable to join room");
    }
  };

  const handleSignOut = () => {
    clearToken();
    window.location.href = "/";
  };

  return (
    <div className="container">
      <nav className="nav">
        <Link className="brand" href="/">
          <div className="brand-text">CryptiQ 2.0</div>
          <div className="meta">Secure Rooms</div>
        </Link>
        <div className="cta-row">
          <button className="button secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="panel">
            <h3>{profile ? `Hello, ${profile.display_name}` : "Loading identity"}</h3>
            <p className="hero-subtitle">
              Rooms are protected by a shared key. Generate one and share it out-of-band.
            </p>
          </div>
          <div className="panel">
            <h3>PQC readiness</h3>
            <p className="hero-subtitle">
              {pqcStatus?.oqs_available
                ? `Server liboqs ready · ${pqcStatus.kem_algorithm || "ML-KEM"} + ${pqcStatus.signature_algorithm || "ML-DSA"}`
                : "Server liboqs not detected. Hybrid key share runs in browser."}
            </p>
            <div className="badge" style={{ marginTop: 12 }}>
              ML-KEM · X25519 · AES-GCM
            </div>
          </div>
          <div className="panel">
            <h3>Create room</h3>
            <div className="form">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Room name"
              />
              <button className="button" onClick={handleCreate}>
                Create room
              </button>
            </div>
          </div>
          <div className="panel">
            <h3>Join room</h3>
            <div className="form">
              <input
                className="input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Room ID"
              />
              <button className="button secondary" onClick={handleJoin}>
                Join room
              </button>
            </div>
          </div>
          {error && <div className="notice">{error}</div>}
        </aside>

        <section className="panel">
          <h3>Your rooms</h3>
          <p className="hero-subtitle">Pick a room to start messaging.</p>
          <div className="grid" style={{ marginTop: 16 }}>
            {rooms.length === 0 ? (
              <div className="meta">No rooms yet.</div>
            ) : (
              rooms.map((room) => (
                <Link key={room.id} className="panel" href={`/room/${room.id}`}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{room.name}</div>
                      <div className="meta">{room.id}</div>
                    </div>
                    <div className="badge">Open</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
