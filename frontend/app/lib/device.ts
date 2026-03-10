import { apiFetch } from "./api";
import { generateHybridKeypair } from "./hybrid";
import { unwrapSecret, wrapSecret } from "./vault";

const KEM_PUBLIC = "cryptiq_kem_public";
const KEM_PRIVATE = "cryptiq_kem_private";
const DH_PUBLIC = "cryptiq_dh_public";
const DH_PRIVATE = "cryptiq_dh_private";

export async function ensureDeviceKeys() {
  if (typeof window === "undefined") return;
  const kemPublic = window.localStorage.getItem(KEM_PUBLIC);
  const dhPublic = window.localStorage.getItem(DH_PUBLIC);
  const kemPrivate = window.localStorage.getItem(KEM_PRIVATE);
  const dhPrivate = window.localStorage.getItem(DH_PRIVATE);

  if (!kemPublic || !dhPublic || !kemPrivate || !dhPrivate) {
    const keys = await generateHybridKeypair();
    window.localStorage.setItem(KEM_PUBLIC, keys.kemPublicKey);
    window.localStorage.setItem(DH_PUBLIC, keys.dhPublicKey);
    window.localStorage.setItem(KEM_PRIVATE, await wrapSecret(keys.kemPrivateKey));
    window.localStorage.setItem(DH_PRIVATE, await wrapSecret(keys.dhPrivateKey));
  }

  await apiFetch("/api/keys/register", {
    method: "POST",
    body: JSON.stringify({
      kem_public_key: window.localStorage.getItem(KEM_PUBLIC),
      dh_public_key: window.localStorage.getItem(DH_PUBLIC),
    }),
  });
}

export async function getPrivateKeys() {
  const kemPrivateWrapped = window.localStorage.getItem(KEM_PRIVATE);
  const dhPrivateWrapped = window.localStorage.getItem(DH_PRIVATE);
  if (!kemPrivateWrapped || !dhPrivateWrapped) {
    throw new Error("device_keys_missing");
  }
  return {
    kemPrivateKey: await unwrapSecret(kemPrivateWrapped),
    dhPrivateKey: await unwrapSecret(dhPrivateWrapped),
  };
}

export function getPublicKeys() {
  return {
    kemPublicKey: window.localStorage.getItem(KEM_PUBLIC),
    dhPublicKey: window.localStorage.getItem(DH_PUBLIC),
  };
}
