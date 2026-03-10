"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, getApiBase, getToken } from "../../lib/api";
import { decryptMessage, deriveRoomKey, encryptMessage } from "../../lib/crypto";
import { buildRoomLink, copyText } from "../../lib/share";
import { createEnvelope, generateHybridKeypair, isHybridSupported, openEnvelope } from "../../lib/hybrid";

export const dynamic = "force-dynamic";

interface Message {
  id: number;
  sender_id: string;
  sender_name: string;
  ciphertext: string;
  nonce: string;
  created_at: string;
}

const roomKeyStorage = (roomId: string) => `cryptiq_room_key_${roomId}`;
const kemPublicStorage = "cryptiq_kem_public";
const kemPrivateStorage = "cryptiq_kem_private";
const dhPublicStorage = "cryptiq_dh_public";
const dhPrivateStorage = "cryptiq_dh_private";

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
  const [pqcSupported, setPqcSupported] = useState(false);
  const [pqcEnabled, setPqcEnabled] = useState(false);
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
    if (typeof window === "undefined") return;
    const queryKey = searchParams.get("key");
    if (queryKey) {
      window.localStorage.setItem(roomKeyStorage(roomId), queryKey);
      setRoomKey(queryKey);
      setRoomKeyInput("");
      setNotice("Room key loaded from secure link.");
      return;
    }
    const stored = window.localStorage.getItem(roomKeyStorage(roomId));
    if (stored) {
      setRoomKey(stored);
    }
  }, [roomId, searchParams]);

  useEffect(() => {
    const detect = async () => {
      const supported = await isHybridSupported();
      setPqcSupported(supported);
    };
    detect();
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

  const handleSaveKey = () => {
    if (!roomKeyInput.trim()) {
      setError("Enter a room key first.");
      return;
    }
    const value = roomKeyInput.trim();
    window.localStorage.setItem(roomKeyStorage(roomId), value);
    setRoomKey(value);
    setRoomKeyInput("");
    setError(null);
    setNotice("Room key saved to this device.");
  };

  const handleGenerateKey = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = btoa(String.fromCharCode(...bytes));
    setRoomKeyInput(key);
    setNotice("New room key generated. Click Save key.");
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

  const ensurePqcKeys = async () => {
    const storedPub = window.localStorage.getItem(kemPublicStorage);
    const storedPriv = window.localStorage.getItem(kemPrivateStorage);
    const storedDhPub = window.localStorage.getItem(dhPublicStorage);
    const storedDhPriv = window.localStorage.getItem(dhPrivateStorage);

    if (storedPub && storedPriv && storedDhPub && storedDhPriv) {
      return {
        kemPublicKey: storedPub,
        kemPrivateKey: storedPriv,
        dhPublicKey: storedDhPub,
        dhPrivateKey: storedDhPriv,
      };
    }

    const keys = await generateHybridKeypair();
    window.localStorage.setItem(kemPublicStorage, keys.kemPublicKey);
    window.localStorage.setItem(kemPrivateStorage, keys.kemPrivateKey);
    window.localStorage.setItem(dhPublicStorage, keys.dhPublicKey);
    window.localStorage.setItem(dhPrivateStorage, keys.dhPrivateKey);
    return keys;
  };

  const handleEnablePqc = async () => {
    if (!pqcSupported) {
      setError("This browser does not support the PQC demo mode.");
      return;
    }
    try {
      const keys = await ensurePqcKeys();
      await apiFetch("/api/keys/register", {
        method: "POST",
        body: JSON.stringify({
          kem_public_key: keys.kemPublicKey,
          dh_public_key: keys.dhPublicKey,
        }),
      });
      setPqcEnabled(true);
      setNotice("PQC demo enabled. You can now share via PQC envelope.");
    } catch (err: any) {
      setError(err.message || "Unable to enable PQC demo.");
    }
  };

  const handleSharePqc = async () => {
    if (!roomKey) return;
    if (!pqcEnabled) {
      setError("Enable PQC demo first.");
      return;
    }
    try {
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
        setNotice("Room key shared via PQC envelope.");
      }
    } catch (err: any) {
      setError(err.message || "Unable to share PQC envelope.");
    }
  };

  const handleAcceptPqc = async () => {
    if (!pqcEnabled) {
      setError("Enable PQC demo first.");
      return;
    }
    try {
      const data = await apiFetch(`/api/rooms/${roomId}/envelopes`);
      if (!data.envelopes || data.envelopes.length === 0) {
        setNotice("No PQC envelope found yet.");
        return;
      }
      const keys = await ensurePqcKeys();
      const env = data.envelopes[0];
      const recovered = await openEnvelope(
        keys.kemPrivateKey,
        keys.dhPrivateKey,
        env.kem_ciphertext,
        env.dh_public_key,
        env.wrapped_key
      );
      window.localStorage.setItem(roomKeyStorage(roomId), recovered);
      setRoomKey(recovered);
      setNotice("Room key unlocked via PQC envelope.");
    } catch (err: any) {
      setError(err.message || "Unable to decrypt PQC envelope.");
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
        <div className="panel" style={{ marginTop: 12 }}>
          <p className="hero-subtitle">
            Share the room key or secure link using a separate secure channel (Signal, iMessage, or in-person). The
            server never sees the key.
          </p>
        </div>
      </div>
    );
  }, [roomKey]);

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
              Enter a room key to decrypt. Share it out-of-band to invite others.
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
              <button className="button secondary" onClick={handleGenerateKey}>
                Generate key
              </button>
            </div>
            {roomKey && <div className="badge" style={{ marginTop: 16 }}>Key unlocked</div>}
            {shareActions}
          </div>

          <div className="panel">
            <h3>PQC demo mode</h3>
            <p className="hero-subtitle">
              {pqcSupported
                ? "Enable PQC demo to share the room key using ML-KEM envelopes."
                : "PQC demo is not supported in this browser. Use manual sharing."}
            </p>
            <div className="form" style={{ marginTop: 16 }}>
              <button className="button" onClick={handleEnablePqc} disabled={!pqcSupported || pqcEnabled}>
                {pqcEnabled ? "PQC demo enabled" : "Enable PQC demo"}
              </button>
              <button className="button secondary" onClick={handleSharePqc} disabled={!pqcEnabled || !roomKey}>
                Share via PQC
              </button>
              <button className="button secondary" onClick={handleAcceptPqc} disabled={!pqcEnabled}>
                Accept PQC envelope
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
