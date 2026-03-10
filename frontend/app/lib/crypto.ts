const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export async function deriveRoomKey(roomId: string, passphrase: string) {
  if (!crypto?.subtle) {
    throw new Error("webcrypto_unavailable");
  }
  const saltKey = `cryptiq_room_salt_${roomId}`;
  let salt = window.localStorage.getItem(saltKey);
  if (!salt) {
    const random = crypto.getRandomValues(new Uint8Array(16));
    salt = toBase64(random.buffer);
    window.localStorage.setItem(saltKey, salt);
  }

  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(salt),
      iterations: 120000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(key: CryptoKey, message: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    textEncoder.encode(message)
  );

  return {
    nonce: toBase64(nonce.buffer),
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptMessage(key: CryptoKey, nonce: string, ciphertext: string) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(nonce) },
    key,
    fromBase64(ciphertext)
  );
  return textDecoder.decode(plaintext);
}
