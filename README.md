# 𝘊𝘳𝘺𝘱𝘵𝘪𝘘 2.0

![Version](https://img.shields.io/badge/Version-v2.0-000000?style=for-the-badge&logo=github&logoColor=white)
[![Python](https://img.shields.io/badge/Python-000000?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Quantum Safe](https://img.shields.io/badge/Quantum_Safe-000000?style=for-the-badge&logo=quantum&logoColor=white)](https://csrc.nist.gov/Projects/post-quantum-cryptography)
[![NIST Approved](https://img.shields.io/badge/NIST_Aligned-000000?style=for-the-badge&logo=security&logoColor=white)](https://csrc.nist.gov/Projects/post-quantum-cryptography/selected-algorithms)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![Author](https://img.shields.io/badge/Made_by-Vanessa_Madison-000000?style=for-the-badge)](https://vanessamadison.com)

---

## 𝘖𝘷𝘦𝘳𝘷𝘪𝘦𝘸

**CryptiQ 2.0** is a post-quantum-ready secure messaging platform and reference implementation that pairs a Flask API with a sleek dark-mode client designed for practical demos.

This version was rebuilt around a usable demo story:

* **Tier 1 (Manual share)**
  A room key is generated client-side, shared out-of-band, and never sent to the server. This is the primary production-style demo flow and works across modern browsers.

* **Tier 2 (PQC demo mode)**
  On supported Chromium browsers, room keys can also be shared through ML-KEM envelopes backed by WebAssembly. This is an explicit demo path for post-quantum key distribution.

---

## 𝘞𝘩𝘢𝘵 𝘊𝘩𝘢𝘯𝘨𝘦𝘥 𝘪𝘯 2.0

CryptiQ 2.0 is not just a visual refresh. The app was updated to be substantially more usable and more coherent as a PQC portfolio project:

* **Full room-based encrypted chat flow**
  Users can create rooms, join rooms, generate room keys, share secure links, and exchange encrypted messages with automatic decryption once the correct key is present.

* **Deterministic cross-device room key derivation**
  The room key flow now works correctly across devices. If two clients have the same room key for the same room, they derive the same AES-GCM key and can decrypt each other's messages.

* **Clear dual-path demo story**
  Manual key sharing is the default path. PQC sharing is now framed as an advanced demo mode rather than the only path.

* **Professional interface redesign**
  The frontend was redesigned with a darker enterprise palette, SF-like system typography, liquid gradient background, better mobile spacing, and cleaner room controls.

* **Live room behavior**
  The client supports message streaming and a polling fallback, so new messages appear automatically even when browser SSE behavior is inconsistent.

* **Deployment-ready stack**
  The frontend is configured for Vercel deployment and the backend is configured for an external Flask host.

---

## 𝘋𝘦𝘮𝘰 𝘍𝘭𝘰𝘸 (𝘛𝘦𝘴𝘵𝘪𝘯𝘨)

**Tier 1 (Manual share, recommended)**

1. Create a room.
2. Click **Generate Key** in the Room Key Vault.
3. Click **Copy Secure Link** or **Copy Key**.
4. Share that secret over a separate secure channel such as Signal, iMessage, Proton Mail, or in person.
5. On the second device, sign in and either open the secure link or paste the room key and click **Save Key**.
6. Messages decrypt automatically once both clients hold the same room key.

**Tier 2 (PQC demo, Chromium only)**

1. Use Chrome, Brave, or Edge on both devices.
2. Both clients click **Enable PQC Demo** to register ephemeral PQC demo keys.
3. Sender flow: click **Share via PQC**.
4. Recipient flow: click **Accept PQC Envelope**.
5. The recipient unlocks the room key and can immediately participate in the encrypted chat.

**Browser support**

* **Manual share**
  Works in Safari, Chrome, Edge, and Brave.

* **PQC demo**
  Intended for Chromium browsers. Safari does not support the X25519 path required by the current browser-side PQC demo implementation.

---

## 𝘒𝘦𝘺 𝘊𝘢𝘱𝘢𝘣𝘪𝘭𝘪𝘵𝘪𝘦𝘴

* **Post-quantum alignment**
  Uses modern NIST-aligned terminology such as ML-KEM and ML-DSA in the product and documentation.

* **Room-key encryption**
  Room secrets are created and retained on the client. The server stores ciphertext, nonce, membership metadata, and message timestamps only.

* **Tiered key exchange**
  Manual room-key distribution is always available. PQC sharing is optional and explicit.

* **Automatic room updates**
  Rooms update through server-sent events with polling fallback for reliability.

* **Polished dark-mode interface**
  The UI is optimized for desktop and mobile and avoids the earlier juvenile look in favor of a more enterprise-focused presentation.

---

## 𝘏𝘪𝘨𝘩 𝘓𝘦𝘷𝘦𝘭 𝘈𝘳𝘤𝘩𝘪𝘵𝘦𝘤𝘵𝘶𝘳𝘦

```text
cryptiq/
├── backend/              Flask API and auth layer
│   ├── app.py            REST API + JWT auth + room streams
│   ├── db.py             SQLite models and schema
│   └── requirements.txt  Python dependencies
├── frontend/             Next.js client application
│   ├── app/              App Router UI
│   ├── public/           Static assets + PQC wasm
│   ├── scripts/          Build helpers
│   └── package.json      Frontend dependencies
└── README.md             Overview, flows, deployment, and setup
```

Core concepts:

* Backend Flask service for auth, rooms, room membership, device key registration, PQC envelopes, and encrypted message storage
* Client-side AES-GCM message encryption with a per-room secret
* Optional ML-KEM envelope exchange for demonstration purposes
* Shared room model designed for a concrete portfolio demo rather than a vague crypto showcase

---

## 𝘛𝘦𝘤𝘩 𝘚𝘵𝘢𝘤𝘬

**Backend**

* Python + Flask
* SQLite for lightweight state
* JWT auth with room membership checks
* SSE stream endpoint for near-real-time message delivery

**Frontend**

* Next.js + React
* Web Crypto API with AES-GCM
* PBKDF2-derived room encryption keys
* Optional browser-side PQC WebAssembly with ML-KEM

**Deployment**

* Vercel for frontend hosting
* External Flask host for backend API

---

## 𝘋𝘦𝘱𝘭𝘰𝘺𝘦𝘥 𝘌𝘯𝘷𝘪𝘳𝘰𝘯𝘮𝘦𝘯𝘵

Current deployment targets:

* **Frontend**
  `https://frontend-lovat-xi-33.vercel.app`

* **Backend**
  `https://cryptiq-illapex-d0a26100.koyeb.app`

If you redeploy the frontend, ensure `NEXT_PUBLIC_API_BASE` points at the backend URL above or your replacement backend host.

---

## 𝘘𝘶𝘪𝘤𝘬 𝘚𝘵𝘢𝘳𝘵

**Requirements**

* Python 3.9 or newer
* Node.js 18 or newer

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py   # Flask on :5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev     # Next.js on :3000
```

Access:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
```

---

## 𝘓𝘰𝘤𝘢𝘭 𝘋𝘦𝘷 𝘕𝘰𝘵𝘦𝘴

* Room keys are device-local and should be shared intentionally during testing
* Older messages created before the deterministic room-key fix may not decrypt correctly in previously used rooms
* For the cleanest demo, create a fresh room after pulling the latest changes
* If PQC demo mode was tested before the latest key-handling fix, use **Reset PQC Keys** before re-enabling it

---

## 𝘚𝘦𝘤𝘶𝘳𝘪𝘵𝘺 𝘔𝘰𝘥𝘦𝘭

CryptiQ 2.0 currently focuses on these security properties:

* Client-held room keys
* AES-GCM encryption for message payloads
* JWT-secured API access and room membership enforcement
* Server stores only ciphertext, nonces, and room metadata
* Manual out-of-band key delivery as the primary usable model
* Optional PQC envelope exchange as a separate demonstration path

Important limitation:

* The current PQC mode is a browser-side demonstration layer, not a full audited end-to-end production PQC system

---

## 𝘙𝘰𝘢𝘥𝘮𝘢𝘱

* QR code room sharing for mobile demos
* Cleaner advanced-mode separation for PQC controls
* Full backend liboqs integration where available
* Better persistence and multi-device identity handling
* Optional hardware-backed local key storage

---

## 𝘓𝘪𝘤𝘦𝘯𝘴𝘦 𝘢𝘯𝘥 𝘊𝘰𝘯𝘵𝘢𝘤𝘵

CryptiQ is released under the MIT License. See the [LICENSE](LICENSE) file for details.

**Author**: Vanessa Madison
**Site**: [vanessamadison.com](https://vanessamadison.com)

For research collaboration or security review discussions, open an issue or reach out through the contact details on the site.
