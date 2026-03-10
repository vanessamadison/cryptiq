"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, getApiBase, getToken } from "../../lib/api";
import { decryptMessage, deriveRoomKey, encryptMessage } from "../../lib/crypto";
import { createEnvelope, openEnvelope, isHybridSupported } from "../../lib/hybrid";
import { ensureDeviceKeys, getPrivateKeys } from "../../lib/device";
import { unwrapSecret, wrapSecret } from "../../lib/vault";
import { buildRoomLink, copyText } from "../../lib/share";

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
  const searchParams = useSearchParams();
  const roomId = params.id as string;

  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [plainMessages, setPlainMessages] = useState<
    { id: number; sender: string; body: string; created_at: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(null);
  const [hybridSupported, setHybridSupported] = useState(true);
  const [shareVisible, setShareVisible] = useState(false);
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
      const queryKey = searchParams.get("key");
      if (queryKey) {
        const wrapped = await wrapSecret(queryKey);
        window.localStorage.setItem(roomKeyStorage(roomId), wrapped);
        setRoomKey(queryKey);
        setRoomKeyInput("");
        setNotice("Room key loaded from secure link.");
        return;
      }
      const wrapped = window.localStorage.getItem(roomKeyStorage(roomId));
      if (wrapped) {
        try {
          const key = await unwrapSecret(wrapped);
          setRoomKey(key);
        } catch {
          window.localStorage.removeItem(roomKeyStorage(roomId));
          setError("Room key vault reset. Please re-enter the room key.");
        }
      }
    };
    loadRoomKey();
  }, [roomId, searchParams]);

  useEffect(() => {
    const checkHybrid = async () => {
      const supported = await isHybridSupported();
      setHybridSupported(supported);
      if (supported) {
        await ensureDeviceKeys();
      }
    };
    checkHybrid();
  }, []);

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
      } catch {
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
    if (roomKey || !hybridSupported) return;
    handleCheckEnvelopes();
    const timer = setInterval(handleCheckEnvelopes, 6000);
    return () => clearInterval(timer);
  }, [roomKey, hybridSupported]);

  const handleSaveKey = async () => {
    if (!roomKeyInput.trim()) return;
    const value = roomKeyInput.trim();
    const wrapped = await wrapSecret(value);
    window.localStorage.setItem(roomKeyStorage(roomId), wrapped);
    setRoomKey(value);
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

  const handleCopyKey = async () => {
    if (!roomKey) return;
    await copyText(roomKey);
    setNotice("Room key copied. Share via a secure channel.");
  };

  const handleCopyLink = async () => {
    if (!roomKey) return;
    const link = buildRoomLink(roomId, roomKey);
    await copyText(link);
    setNotice("Secure link copied.");
  };

  const handleShareKey = async () => {
    if (!roomKey) return;
    setError(null);
    try {
      if (!hybridSupported) {
        setError("Hybrid key share is not supported on this browser.");
        return;
      }
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
        setNotice("Room key shared via hybrid envelope.");
      }
    } catch (err: any) {
      if (err.message === "hybrid_unsupported") {
        setHybridSupported(false);
        setError("Hybrid key share is not supported on this browser.");
        return;
      }
      setError(err.message || "Unable to share room key");
    }
  };

  const handleCheckEnvelopes = async () => {
    if (roomKey || !hybridSupported) return;
    try {
      await ensureDeviceKeys();
      const data = await apiFetch(`/api/rooms/${roomId}/envelopes`);
      if (!data.envelopes || data.envelopes.length === 0) return;
      let kemPrivateKey: string;
      let dhPrivateKey: string;
      try {
        const keys = await getPrivateKeys();
        kemPrivateKey = keys.kemPrivateKey;
        dhPrivateKey = keys.dhPrivateKey;
      } catch {
        return;
      }
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
      if (err.message === "hybrid_unsupported") {
        setHybridSupported(false);
        return;
      }
      if (hybridSupported) {
        setError("Unable to decrypt room key envelope.");
      }
    }
  };

  const inputRef = useRef<HTMLInputElement | null>(null);

  const shareActions = useMemo(() => {
    if (!roomKey) return null;
    return (
      <div className="form" style={{ marginTop: 16 }}>
        <button className="button" onClick={handleCopyKey}>
          Copy room key
        </button>
        <button className="button secondary" onClick={handleCopyLink}>
          Copy secure link
        </button>
        <button className="button secondary" onClick={() => setShareVisible((v) => !v)}>
          {shareVisible ? "Hide instructions" : "Show sharing guide"}
        </button>
        {shareVisible && (
          <div className="panel" style={{ marginTop: 12 }}>
            <p className="hero-subtitle">
              Share the room key or secure link using a separate secure channel (Signal, iMessage, or in-person QR).
              The server never sees the key.
            </p>
          </div>
        )}
      </div>
    );
  }, [roomKey, shareVisible]);

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
            {shareActions}
          </div>
          <div className="panel">
            <h3>Hybrid key share</h3>
            <p className="hero-subtitle">
              {hybridSupported
                ? "Uses ML-KEM + X25519 to wrap the room key for each member."
                : "Hybrid key share is not supported in this browser. Use manual sharing."}
            </p>
            <div className="form" style={{ marginTop: 16 }}>
              <button className="button" onClick={handleShareKey} disabled={!roomKey || !hybridSupported}>
                Share room key
              </button>
              <button className="button secondary" onClick={handleCheckEnvelopes} disabled={!hybridSupported}>
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
            {notice && <div className="badge" style={{ marginTop: 12 }}>{notice}</div>}
            {error && <div className="notice" style={{ marginTop: 12 }}>{error}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
