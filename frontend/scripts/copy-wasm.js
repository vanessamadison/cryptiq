const fs = require("fs");
const path = require("path");

const source = path.join(
  __dirname,
  "..",
  "node_modules",
  "@dashlane",
  "pqc-kem-kyber768-browser",
  "dist",
  "pqc-kem-kyber768.wasm"
);
const targetDir = path.join(__dirname, "..", "public");
const target = path.join(targetDir, "pqc-kem-kyber768.wasm");

if (!fs.existsSync(source)) {
  console.warn("[copy-wasm] Source wasm not found:", source);
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log("[copy-wasm] Copied wasm to", target);
