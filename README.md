# 𝘊𝘳𝘺𝘱𝘵𝘪𝘘  

![Version](https://img.shields.io/badge/Version-v2.0-000000?style=for-the-badge&logo=github&logoColor=white)
[![Python](https://img.shields.io/badge/Python-000000?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Quantum Safe](https://img.shields.io/badge/Quantum_Safe-000000?style=for-the-badge&logo=quantum&logoColor=white)](https://csrc.nist.gov/Projects/post-quantum-cryptography)
[![NIST Approved](https://img.shields.io/badge/NIST_Approved-000000?style=for-the-badge&logo=security&logoColor=white)](https://csrc.nist.gov/Projects/post-quantum-cryptography/selected-algorithms)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![Author](https://img.shields.io/badge/Made_by-Vanessa_Madison-000000?style=for-the-badge)](https://vanessamadison.com)

---

## 𝘖𝘷𝘦𝘳𝘷𝘪𝘦𝘸  

**CryptiQ** is a post quantum secure messaging platform that demonstrates practical use of NIST selected algorithms in a full stack web application.

The system uses **Kyber 768** for key establishment and **Dilithium 3** for signatures, delivered through a Flask based API and a Next.js frontend. It is designed as a reference implementation for quantum safe end to end messaging with real performance measurements and a clear security model.

---

## 𝘒𝘦𝘺 𝘊𝘢𝘱𝘢𝘣𝘪𝘭𝘪𝘵𝘪𝘦𝘴  

* **Post quantum cryptography**  
  NIST selected Kyber 768 and Dilithium 3 for key exchange and digital signatures

* **End to end encrypted messaging**  
  Client side encryption and authenticated channels so plaintext is never stored on the server

* **Real time secure chat**  
  WebSocket based messaging with session keys derived from Kyber

* **Enterprise style hardening**  
  Rate limiting, session management, audit logging, and environment based configuration

* **Measured performance**  
  Benchmarks for key generation, encapsulation, signing, verification, and full message flow

---

## 𝘏𝘪𝘨𝘩 𝘓𝘦𝘷𝘦𝘭 𝘈𝘳𝘤𝘩𝘪𝘵𝘦𝘤𝘵𝘶𝘳𝘦  

```text
cryptiq/
├── backend/              Flask API and crypto layer
│   ├── crypto/           Kyber and Dilithium wrappers
│   ├── routes/           Auth and message endpoints
│   ├── benchmarks/       Crypto performance tests
│   └── tests/            Unit and integration tests
├── frontend/             Next.js client application
├── docker-compose.yml    Local multi service setup
├── Makefile              Development automation
└── SECURITY.md           Threat model and analysis
````

Core concepts:

* Backend Flask service that owns cryptographic operations
* PQC layer wrapping liboqs for Kyber and Dilithium
* Next.js frontend for registration, login, and secure chat
* Redis support for session data and rate limiting
* Shared configuration for local and production style deployments

---

## 𝘛𝘦𝘤𝘩 𝘚𝘵𝘢𝘤𝘬

**Backend**

* Python and Flask
* liboqs and liboqs python bindings
* Redis for optional state and rate limiting
* Pytest based test suite and benchmark scripts

**Frontend**

* Next.js and React
* TypeScript ready structure
* Secure API integration and WebSocket client

**Tooling**

* Docker and Docker Compose
* Makefile commands for setup, tests, and benchmarks

---

## 𝘘𝘶𝘪𝘤𝘬 𝘚𝘵𝘢𝘳𝘵 (𝘋𝘰𝘤𝘬𝘦𝘳)

**Requirements**

* Docker and Docker Compose
* Git

```bash
git clone https://github.com/vanessamadison/cryptiq
cd cryptiq

docker-compose up --build
```

Access:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
Redis:    localhost:6379
```

---

## 𝘓𝘰𝘤𝘢𝘭 𝘋𝘦𝘷𝘦𝘭𝘰𝘱𝘮𝘦𝘯𝘵

**Requirements**

* Python 3.9 or newer
* Node.js 16 or newer
* liboqs library installed
* Redis (optional but recommended)

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

Makefile helpers are also available:

```bash
make setup       # Initial project setup
make install     # Install dependencies
make test        # Run tests
make benchmark   # Run crypto benchmarks
make run-local   # Backend and frontend without Docker
```

---

## 𝘗𝘦𝘳𝘧𝘰𝘳𝘮𝘢𝘯𝘤𝘦 𝘚𝘶𝘮𝘮𝘢𝘳𝘺

Typical timings on a modern laptop:

* Kyber 768 key generation and encapsulation in a few milliseconds
* Dilithium 3 signatures and verification in the low millisecond range
* One kilobyte end to end message encrypt sign verify decrypt around single digit milliseconds

Run full benchmarks:

```bash
make benchmark
# or
python backend/benchmarks/crypto_benchmarks.py
```

---

## 𝘚𝘦𝘤𝘶𝘳𝘪𝘵𝘺 𝘔𝘰𝘥𝘦𝘭

CryptiQ focuses on the following security properties:

* Quantum safe key establishment and signatures using Kyber and Dilithium
* Authenticated sessions with JSON Web Tokens and strong passwords
* Protection against replay and tampering through nonces and timestamps
* Rate limiting and input validation at the API layer
* Design for zero knowledge style operation where the server does not need access to plaintext content

For a full description of the threat model and assumptions, see **SECURITY.md**.

---

## 𝘙𝘰𝘢𝘥𝘮𝘢𝘱

Planned areas for future versions:

* Group messaging with shared session keys
* File encryption support for larger payloads
* Hardware backed key storage using TPM or HSM
* Kubernetes deployment templates and extended monitoring

---

## 𝘓𝘪𝘤𝘦𝘯𝘴𝘦 𝘢𝘯𝘥 𝘊𝘰𝘯𝘵𝘢𝘤𝘵

CryptiQ is released under the MIT License. See the [LICENSE](LICENSE) file for details.

**Author**: Vanessa Madison
**Site**: [vanessamadison.com](https://vanessamadison.com)

For research collaboration or security review discussions, open an issue or reach out through the contact details on the site.


