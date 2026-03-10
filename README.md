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

**CryptiQ 2.0** is a post-quantum-ready secure messaging platform and reference build that pairs a hardened Flask API with a sleek, Apple-inspired, dark-mode client.

This version emphasizes **fully usable** secure rooms with client-held encryption keys, while aligning the crypto language with NIST’s latest naming:

* **ML-KEM (Kyber-768)** for key establishment
* **ML-DSA (Dilithium-3)** for signatures

The production-grade UX is built to feel like Signal and Session — minimal, elegant, and quiet.

---

## 𝘒𝘦𝘺 𝘊𝘢𝘱𝘢𝘣𝘪𝘭𝘪𝘵𝘪𝘦𝘴

* **Post-quantum alignment**
  Uses modern naming (ML-KEM / ML-DSA) and supports server-side PQC hooks when liboqs is available.

* **Room-key encryption**
  Room secrets never leave the client. Servers store ciphertext only.

* **Hybrid PQC key share**
  Client-side ML-KEM + X25519 envelopes distribute room keys to members.

* **Sleek, focused UI**
  Dark-mode glass UI with signal-style layout and Apple-grade polish.

* **Secure auth + room management**
  JWT-based auth, room creation, join flows, and membership tracking.

* **Device-bound vault**
  Room keys and PQC private keys are wrapped with a local IndexedDB vault.

* **MVP that runs out of the box**
  Minimal dependencies and fast local setup.

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
* Server-Sent Events for real-time message delivery
* Hybrid PQC + classical envelopes for room key distribution
* Device-bound vault for local key wrapping

---

## 𝘛𝘦𝘤𝘩 𝘚𝘵𝘢𝘤𝘬

**Backend**

* Python + Flask
* SQLite for fast local state
* JWT auth with room membership

**Frontend**

* Next.js + React
* Web Crypto API (AES-GCM)
* Apple-inspired UI styling

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

## 𝘚𝘦𝘤𝘶𝘳𝘪𝘵𝘺 𝘔𝘰𝘥𝘦𝘭

CryptiQ focuses on the following security properties:

* Client-held room keys derived with PBKDF2
* AES-GCM encryption for message payloads
* Hybrid ML-KEM + X25519 envelopes for room key sharing
* Device-local vault wrapping for PQC and room secrets
* JWT-secured API access and room membership checks
* Server stores only ciphertext, nonce, and metadata

For PQC research extensions, the backend can be augmented with liboqs to provide ML-KEM/ML-DSA operations.

---

## 𝘙𝘰𝘢𝘥𝘮𝘢𝘱

* Optional liboqs integration for server-side PQC key exchange demos
* WebSocket / SSE real-time transport
* Room key envelopes with multi-device support
* Auditable security logging

---

## 𝘓𝘪𝘤𝘦𝘯𝘴𝘦 𝘢𝘯𝘥 𝘊𝘰𝘯𝘵𝘢𝘤𝘵

CryptiQ is released under the MIT License. See the [LICENSE](LICENSE) file for details.

**Author**: Vanessa Madison
**Site**: [vanessamadison.com](https://vanessamadison.com)

For research collaboration or security review discussions, open an issue or reach out through the contact details on the site.
