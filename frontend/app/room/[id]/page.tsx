"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getApiBase, getToken } from "../../lib/api";
import { decryptMessage, deriveRoomKey, encryptMessage } from "../../lib/crypto";
import { createEnvelope, openEnvelope } from "../../lib/hybrid";
import { ensureDeviceKeys, getPrivateKeys } from "../../lib/device";
import { unwrapSecret, wrapSecret } from "../../lib/vault";

export const dynamic = "force-dynamic";

interface Message {
  id: number;
  sender_id: string;
  sender_name: string;
  ciphertext: string;
  nonce: string;
  created_at: string;
}

const roomKeyStorage = (roomId: string) => `cryptiq_room_key_wrapped_${roomId}`;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [plainMessages, setPlainMessages] = useState<
    { id: number; sender: string; body: string; created_at: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(null);
  const lastIdRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);


  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiFetch("/api/profile");
        setProfile(data.user);
      } catch (err: any) {
        if (err.message === "unauthorized") {
          router.push("/auth");
        }
      }
    };
    loadProfile();
  }, [router]);

  useEffect(() => {
    const loadRoomKey = async () => {
      if (typeof window === "undefined") return;
      const wrapped = window.localStorage.getItem(roomKeyStorage(roomId));
      if (wrapped) {
        try {
          const key = await unwrapSecret(wrapped);
          setRoomKey(key);
        } catch {
          setError("Room key is locked. Re-enter to unlock.");
        }
      }
    };
    loadRoomKey();
  }, [roomId]);

  const loadMessages = async (key: string) => {
    setError(null);
    try {
      const data = await apiFetch(`/api/rooms/${roomId}/messages`);
      const cryptoKey = await deriveRoomKey(roomId, key);
      const items = await Promise.all(
        (data.messages || []).map(async (msg: Message) => {
          const body = await decryptMessage(cryptoKey, msg.nonce, msg.ciphertext);
          return {
            id: msg.id,
            sender: msg.sender_name,
            body,
            created_at: msg.created_at,
          };
        })
      );
      lastIdRef.current = items.length ? items[items.length - 1].id : 0;
      setPlainMessages(items);
    } catch (err: any) {
      if (err.message === "unauthorized") {
        router.push("/auth");
        return;
      }
      setError(err.message || "Unable to load messages");
    }
  };

  const openStream = async (key: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const cryptoKey = await deriveRoomKey(roomId, key);
    const token = getToken();
    const es = new EventSource(
      `${getApiBase()}/api/rooms/${roomId}/stream?last_id=${lastIdRef.current}&token=${encodeURIComponent(
        token || ""
      )}`,
      { withCredentials: false }
    );
    es.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data) as Message;
        const body = await decryptMessage(cryptoKey, msg.nonce, msg.ciphertext);
        setPlainMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { id: msg.id, sender: msg.sender_name, body, created_at: msg.created_at }];
        });
        lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      } catch (err) {
        // ignore parse/decrypt errors
      }
    };
    es.onerror = () => {
      es.close();
    };
    eventSourceRef.current = es;
  };

  useEffect(() => {
    if (!roomKey) return;
    loadMessages(roomKey);
    openStream(roomKey);
    return () => {
      eventSourceRef.current?.close();
    };
  }, [roomKey]);

  useEffect(() => {
    if (roomKey) return;
    handleCheckEnvelopes();
    const timer = setInterval(handleCheckEnvelopes, 6000);
    return () => clearInterval(timer);
  }, [roomKey]);

  const handleSaveKey = async () => {
    if (!roomKeyInput) return;
    const wrapped = await wrapSecret(roomKeyInput);
    window.localStorage.setItem(roomKeyStorage(roomId), wrapped);
    setRoomKey(roomKeyInput);
    setRoomKeyInput("");
    setError(null);
  };

  const handleSend = async () => {
    if (!roomKey) return;
    if (!inputRef.current) return;
    const input = inputRef.current.value.trim();
    if (!input) return;
    setLoading(true);
    setError(null);
    try {
      const key = await deriveRoomKey(roomId, roomKey);
      const payload = await encryptMessage(key, input);
      await apiFetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Unable to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleLock = () => {
    window.localStorage.removeItem(roomKeyStorage(roomId));
    setRoomKey(null);
    setPlainMessages([]);
  };

  const handleShareKey = async () => {
    if (!roomKey) return;
    setError(null);
    try {
      await ensureDeviceKeys();
      const keys = await apiFetch(`/api/rooms/${roomId}/keys`);
      const envelopes = await Promise.all(
        (keys.keys || [])
          .filter((k: any) => k.user_id !== profile?.id)
          .map(async (recipient: any) => {
            const env = await createEnvelope(roomKey, recipient.kem_public_key, recipient.dh_public_key);
            return {
              recipient_id: recipient.user_id,
              ...env,
            };
          })
      );
      if (envelopes.length) {
        await apiFetch(`/api/rooms/${roomId}/envelopes`, {
          method: "POST",
          body: JSON.stringify({ envelopes }),
        });
      }
    } catch (err: any) {
      setError(err.message || "Unable to share room key");
    }
  };

  const handleCheckEnvelopes = async () => {
    if (roomKey) return;
    try {
      await ensureDeviceKeys();
      const data = await apiFetch(`/api/rooms/${roomId}/envelopes`);
      if (!data.envelopes || data.envelopes.length === 0) return;
      const { kemPrivateKey, dhPrivateKey } = await getPrivateKeys();
      const env = data.envelopes[0];
      const recovered = await openEnvelope(
        kemPrivateKey,
        dhPrivateKey,
        env.kem_ciphertext,
        env.dh_public_key,
        env.wrapped_key
      );
      const wrapped = await wrapSecret(recovered);
      window.localStorage.setItem(roomKeyStorage(roomId), wrapped);
      setRoomKey(recovered);
    } catch (err: any) {
      setError("Unable to decrypt room key envelope.");
    }
  };

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="container">
      <nav className="nav">
        <Link className="brand" href="/chat">
          <div className="brand-text">CryptiQ Room</div>
          <div className="meta">{roomId}</div>
        </Link>
        <div className="cta-row">
          <button className="button secondary" onClick={handleLock}>
            Lock room
          </button>
        </div>
      </nav>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="panel">
            <h3>Room key vault</h3>
            <p className="hero-subtitle">
              Room keys are stored in a local device vault (IndexedDB). Share the room key out-of-band.
            </p>
            <div className="form" style={{ marginTop: 16 }}>
              <input
                className="input"
                value={roomKeyInput}
                onChange={(e) => setRoomKeyInput(e.target.value)}
                placeholder="Enter room key"
                type="password"
              />
              <button className="button" onClick={handleSaveKey}>
                Save key
              </button>
            </div>
            {roomKey && <div className="badge" style={{ marginTop: 16 }}>Key unlocked</div>}
          </div>
          <div className="panel">
            <h3>Hybrid key share</h3>
            <p className="hero-subtitle">
              Uses ML-KEM + X25519 to wrap the room key for each member.
            </p>
            <div className="form" style={{ marginTop: 16 }}>
              <button className="button" onClick={handleShareKey} disabled={!roomKey}>
                Share room key
              </button>
              <button className="button secondary" onClick={handleCheckEnvelopes}>
                Check for key envelope
              </button>
            </div>
          </div>
        </aside>

        <section className="chat-window">
          <div className="panel">
            <h3>Encrypted messages</h3>
            <p className="hero-subtitle">Only clients with the room key can read these.</p>
          </div>

          <div className="message-list">
            {!roomKey && <div className="meta">Enter a room key to decrypt messages.</div>}
            {roomKey && plainMessages.length === 0 && <div className="meta">No messages yet.</div>}
            {plainMessages.map((msg) => (
              <div key={msg.id} className="message">
                <div className="meta">{msg.sender} · {new Date(msg.created_at).toLocaleTimeString()}</div>
                <div>{msg.body}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="form" style={{ gridTemplateColumns: "1fr auto" }}>
              <input
                className="input"
                ref={inputRef}
                placeholder="Type a message"
                disabled={!roomKey}
              />
              <button className="button" onClick={handleSend} disabled={!roomKey || loading}>
                {loading ? "Sending" : "Send"}
              </button>
            </div>
            {error && <div className="notice" style={{ marginTop: 12 }}>{error}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
