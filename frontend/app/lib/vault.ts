const VAULT_DB = "cryptiq_vault";
const VAULT_STORE = "keys";
const VAULT_KEY_ID = "master";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VAULT_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredKey(): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readonly");
    const store = tx.objectStore(VAULT_STORE);
    const request = store.get(VAULT_KEY_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function storeKey(rawKey: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readwrite");
    const store = tx.objectStore(VAULT_STORE);
    store.put(rawKey, VAULT_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStoredKey(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readwrite");
    const store = tx.objectStore(VAULT_STORE);
    store.delete(VAULT_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function importRawKey(rawKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    fromBase64(rawKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function getVaultKey(): Promise<CryptoKey> {
  const stored = await getStoredKey();
  if (stored && typeof stored === "string") {
    try {
      return await importRawKey(stored);
    } catch {
      await clearStoredKey();
    }
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = await crypto.subtle.exportKey("raw", key);
  const encoded = toBase64(raw);
  await storeKey(encoded);
  return importRawKey(encoded);
}

export async function wrapSecret(secret: string) {
  try {
    const key = await getVaultKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(secret)
    );
    return `${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
  } catch (err: any) {
    await clearStoredKey();
    const key = await getVaultKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(secret)
    );
    return `${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
  }
}

export async function unwrapSecret(wrapped: string) {
  const [ivB64, ctB64] = wrapped.split(":");
  if (!ivB64 || !ctB64) throw new Error("invalid_wrapped_secret");
  try {
    const key = await getVaultKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivB64) },
      key,
      fromBase64(ctB64)
    );
    return textDecoder.decode(plaintext);
  } catch (err: any) {
    await clearStoredKey();
    const key = await getVaultKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivB64) },
      key,
      fromBase64(ctB64)
    );
    return textDecoder.decode(plaintext);
  }
}
