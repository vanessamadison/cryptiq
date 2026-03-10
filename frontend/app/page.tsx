import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="brand">
          <div className="brand-badge">CQ</div>
          <div>
            <div>CryptiQ 2.0</div>
            <div className="meta">Post-Quantum Secure Messaging</div>
          </div>
        </div>
        <div className="cta-row">
          <Link className="button secondary" href="/auth">
            Sign in
          </Link>
          <Link className="button" href="/auth?mode=register">
            Create account
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-card">
          <h1 className="hero-title">Quiet, modern, quantum-ready messaging.</h1>
          <p className="hero-subtitle">
            CryptiQ 2.0 is a sleek, dark-mode messenger designed for practical PQC research.
            Rooms are secured with a client-held encryption key and backed by a hardened Flask API.
            You control the room key — servers store only ciphertext.
          </p>
          <div className="cta-row">
            <Link className="button" href="/chat">
              Launch Secure Chat
            </Link>
            <Link className="button secondary" href="/auth?mode=register">
              Create Identity
            </Link>
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <h3>ML-KEM + ML-DSA aligned</h3>
            <p className="hero-subtitle">
              CryptiQ tracks the NIST-selected algorithm naming and offers an optional
              PQC-backed key exchange path when liboqs is available on the server.
            </p>
          </div>
          <div className="panel">
            <h3>Room-based encryption</h3>
            <p className="hero-subtitle">
              Room keys never leave your device. Share keys out-of-band to keep chats private.
            </p>
          </div>
          <div className="panel">
            <h3>Signal-style UX, Apple polish</h3>
            <p className="hero-subtitle">
              Crisp typography, glassy panels, and a focus-first layout built for attention.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
