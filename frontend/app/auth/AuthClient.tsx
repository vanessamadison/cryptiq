"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, setToken } from "../lib/api";

export default function AuthClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = useMemo(() => searchParams.get("mode") || "login", [searchParams]);
  const nextPath = useMemo(() => searchParams.get("next") || "", [searchParams]);
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, string> = { email, password };
      if (isRegister) {
        payload.display_name = displayName || "Anonymous";
      }
      const data = await apiFetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToken(data.token);
      router.push(nextPath || "/chat");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <nav className="nav">
        <Link className="brand" href="/">
          <div className="brand-text">CryptiQ 2.0</div>
          <div className="meta">Secure Identity</div>
        </Link>
        <div className="cta-row">
          <Link
            className="button secondary"
            href={isRegister ? `/auth${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}` : `/auth?mode=register${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`}
          >
            {isRegister ? "Sign In" : "Create Account"}
          </Link>
        </div>
      </nav>

      <div className="split">
        <section className="hero-card">
          <h2 className="hero-title" style={{ fontSize: "2.2rem" }}>
            {isRegister ? "Create your secure identity" : "Welcome back"}
          </h2>
          <p className="hero-subtitle">
            Your identity is used to authorize room membership. Room keys stay on your device.
          </p>
          <form className="form" onSubmit={handleSubmit}>
            {isRegister && (
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
              />
            )}
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            {error && <div className="notice">{error}</div>}
            <button className="button" disabled={loading}>
              {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Security posture</h3>
          <p className="hero-subtitle">
            CryptiQ 2.0 uses a room-key model: you create the room key and share it out-of-band.
            The server never sees that key, so only participants who know it can decrypt.
          </p>
          <div className="badge" style={{ marginTop: 16 }}>
            AES-GCM • PBKDF2 • Room key isolation
          </div>
        </section>
      </div>
    </div>
  );
}
