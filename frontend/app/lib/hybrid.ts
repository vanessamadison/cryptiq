import kyberBuilder from "@dashlane/pqc-kem-kyber768-browser";

const textEncoder = new TextEncoder();

const toBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

let kemInstance: Awaited<ReturnType<typeof kyberBuilder>> | null = null;

async function getKem() {
  if (!kemInstance) {
    kemInstance = await kyberBuilder();
  }
  return kemInstance;
}

async function hashConcat(buffers: Uint8Array[]) {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  buffers.forEach((b) => {
    merged.set(b, offset);
    offset += b.byteLength;
  });
  const digest = await crypto.subtle.digest("SHA-256", merged);
  return new Uint8Array(digest);
}

async function deriveWrapKey(pqcSecret: Uint8Array, dhSecret: Uint8Array) {
  const material = await hashConcat([pqcSecret, dhSecret]);
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function generateDhKeypair() {
  const keypair = await crypto.subtle.generateKey(
    { name: "X25519", namedCurve: "X25519" },
    true,
    ["deriveBits"]
  );
  const publicKey = await crypto.subtle.exportKey("raw", keypair.publicKey);
  const privateKey = await crypto.subtle.exportKey("raw", keypair.privateKey);
  return {
    publicKey: toBase64(publicKey),
    privateKey: toBase64(privateKey),
  };
}

async function deriveDhSecret(privateKeyB64: string, publicKeyB64: string) {
  const privateKey = await crypto.subtle.importKey(
    "raw",
    fromBase64(privateKeyB64),
    { name: "X25519", namedCurve: "X25519" },
    false,
    ["deriveBits"]
  );
  const publicKey = await crypto.subtle.importKey(
    "raw",
    fromBase64(publicKeyB64),
    { name: "X25519", namedCurve: "X25519" },
    false,
    []
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256
  );
  return new Uint8Array(bits);
}

export async function generateHybridKeypair() {
  const kem = await getKem();
  const kemKeys = await kem.keypair();
  const dhKeys = await generateDhKeypair();

  return {
    kemPublicKey: toBase64(kemKeys.publicKey.buffer),
    kemPrivateKey: toBase64(kemKeys.privateKey.buffer),
    dhPublicKey: dhKeys.publicKey,
    dhPrivateKey: dhKeys.privateKey,
  };
}

export async function createEnvelope(roomKey: string, recipientKemPublicKey: string, recipientDhPublicKey: string) {
  const kem = await getKem();
  const { ciphertext, sharedSecret } = await kem.encapsulate(fromBase64(recipientKemPublicKey));
  const senderDhKeys = await generateDhKeypair();
  const dhSecret = await deriveDhSecret(senderDhKeys.privateKey, recipientDhPublicKey);
  const wrapKey = await deriveWrapKey(new Uint8Array(sharedSecret), dhSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    textEncoder.encode(roomKey)
  );

  return {
    kem_ciphertext: toBase64(ciphertext.buffer),
    dh_public_key: senderDhKeys.publicKey,
    wrapped_key: `${toBase64(iv.buffer)}:${toBase64(wrapped)}`,
  };
}

export async function openEnvelope(
  kemPrivateKey: string,
  dhPrivateKey: string,
  kemCiphertext: string,
  senderDhPublicKey: string,
  wrappedKey: string
) {
  const kem = await getKem();
  const { sharedSecret } = await kem.decapsulate(
    fromBase64(kemCiphertext),
    fromBase64(kemPrivateKey)
  );
  const dhSecret = await deriveDhSecret(dhPrivateKey, senderDhPublicKey);
  const wrapKey = await deriveWrapKey(new Uint8Array(sharedSecret), dhSecret);
  const [ivB64, ctB64] = wrappedKey.split(":");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    wrapKey,
    fromBase64(ctB64)
  );
  return new TextDecoder().decode(plaintext);
}
