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

**CryptiQ 2.0** is a post-quantum-ready secure messaging platform and reference build that pairs a hardened Flask API with a sleek, Apple-inspired client.

This version supports two modes for secure key exchange:

* **Tier 1 (Manual share)**
  Room keys are generated client-side and shared out-of-band. This always works and is the default demo flow.

* **Tier 2 (PQC demo mode)**
  On supported browsers, room keys can be shared using ML-KEM envelopes (PQC mode).

---

## 𝘋𝘦𝘮𝘰 𝘍𝘭𝘰𝘸 (𝘛𝘦𝘴𝘵𝘪𝘯𝘨)

**Tier 1 (Manual share, recommended for all browsers)**

1. Create a room and generate a key in the Room Key Vault.
2. Click **Copy Secure Link** and send it over a separate channel (Signal, iMessage, or in-person).
3. On the second device, sign in, open the secure link, and the room will auto-join with the key loaded.
4. Messages should decrypt immediately on both sides.

**Tier 2 (PQC demo, Chromium only)**

1. Use Chrome, Edge, or Brave on both devices. Safari does not support X25519 (required for the demo).
2. Both clients click **Enable PQC Demo** to register PQC keys.
3. The sender clicks **Share via PQC** to post an ML-KEM envelope.
4. The recipient clicks **Accept PQC Envelope** to unlock the room key and join.
5. Send encrypted messages as normal.

## 𝘒𝘦𝘺 𝘊𝘢𝘱𝘢𝘣𝘪𝘭𝘪𝘵𝘪𝘦𝘴

* **Post-quantum alignment**
  Uses modern naming (ML-KEM / ML-DSA) and supports PQC demos via WebAssembly.

* **Room-key encryption**
  Room secrets never leave the client. Servers store ciphertext only.

* **Tiered key exchange**
  Manual share always works. PQC mode is optional and gated by browser capability.

* **Sleek, focused UI**
  Dark mode, liquid gradients, and an enterprise-first aesthetic.

---

## 𝘏𝘪𝘨𝘩 𝘓𝘦𝘷𝘦𝘭 𝘈𝘳𝘤𝘩𝘪𝘵𝘦𝘤𝘵𝘶𝘳𝘦

```text
cryptiq/
├── backend/              Flask API and auth layer
│   ├── app.py            REST API + JWT auth
│   ├── db.py             SQLite models
│   └── requirements.txt  Python dependencies
├── frontend/             Next.js client application
│   ├── app/              App Router UI
│   └── package.json      Frontend dependencies
└── README.md             Overview & setup
```

Core concepts:

* Backend Flask service for auth, rooms, and encrypted message storage
* Client-side AES-GCM encryption with per-room secrets
* NIST-aligned algorithm naming for PQC posture
* Tiered key exchange for demos

---

## 𝘛𝘦𝘤𝘩 𝘚𝘵𝘢𝘤𝘬

**Backend**

* Python + Flask
* SQLite for fast local state
* JWT auth with room membership

**Frontend**

* Next.js + React
* Web Crypto API (AES-GCM)
* Optional PQC WebAssembly (ML-KEM)

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

## 𝘛𝘦𝘴𝘵𝘪𝘯𝘨 𝘛𝘪𝘦𝘳 1 (Manual share)

1. Create a room.
2. Click **Generate key**, then **Save key**.
3. Click **Copy secure link** and send it via another secure channel (Signal/iMessage/Proton).
4. Recipient opens the link — key auto-loads, chat decrypts.

---

## 𝘛𝘦𝘴𝘵𝘪𝘯𝘨 𝘛𝘪𝘦𝘳 2 (PQC demo)

1. Open the room in a browser that supports PQC demo mode.
2. Click **Enable PQC demo**.
3. On the sender side, click **Share via PQC**.
4. On the recipient side, click **Accept PQC envelope**.

If the browser does not support PQC demo mode, the UI will indicate this and fall back to manual sharing.

---

## 𝘚𝘦𝘤𝘶𝘳𝘪𝘵𝘺 𝘔𝘰𝘥𝘦𝘭

CryptiQ focuses on the following security properties:

* Client-held room keys
* AES-GCM encryption for message payloads
* JWT-secured API access and room membership checks
* Server stores only ciphertext, nonce, and metadata
* Optional PQC demo mode for ML-KEM envelope exchange

---

## 𝘙𝘰𝘢𝘥𝘮𝘢𝘱

* QR code sharing for room links
* Optional hardware-backed key storage
* Full liboqs integration on backend

---

## 𝘓𝘪𝘤𝘦𝘯𝘴𝘦 𝘢𝘯𝘥 𝘊𝘰𝘯𝘵𝘢𝘤𝘵

CryptiQ is released under the MIT License. See the [LICENSE](LICENSE) file for details.

**Author**: Vanessa Madison
**Site**: [vanessamadison.com](https://vanessamadison.com)

For research collaboration or security review discussions, open an issue or reach out through the contact details on the site.
