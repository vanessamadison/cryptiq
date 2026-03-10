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

async function getStoredKey(): Promise<CryptoKey | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readonly");
    const store = tx.objectStore(VAULT_STORE);
    const request = store.get(VAULT_KEY_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function storeKey(key: CryptoKey): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, "readwrite");
    const store = tx.objectStore(VAULT_STORE);
    store.put(key, VAULT_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVaultKey(): Promise<CryptoKey> {
  let key = await getStoredKey();
  if (key) return key;
  key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await storeKey(key);
  return key;
}

export async function wrapSecret(secret: string) {
  const key = await getVaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(secret)
  );
  return `${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
}

export async function unwrapSecret(wrapped: string) {
  const [ivB64, ctB64] = wrapped.split(":");
  if (!ivB64 || !ctB64) throw new Error("invalid_wrapped_secret");
  const key = await getVaultKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(ctB64)
  );
  return textDecoder.decode(plaintext);
}
