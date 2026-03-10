import { apiFetch } from "./api";
import { generateHybridKeypair, isHybridSupported } from "./hybrid";
import { unwrapSecret, wrapSecret } from "./vault";

const KEM_PUBLIC = "cryptiq_kem_public";
const KEM_PRIVATE = "cryptiq_kem_private";
const DH_PUBLIC = "cryptiq_dh_public";
const DH_PRIVATE = "cryptiq_dh_private";
const HYBRID_DISABLED = "cryptiq_hybrid_disabled";

export async function ensureDeviceKeys() {
  if (typeof window === "undefined") return;

  const supported = await isHybridSupported();
  if (!supported) {
    window.localStorage.setItem(HYBRID_DISABLED, "1");
    return;
  }

  window.localStorage.removeItem(HYBRID_DISABLED);

  let kemPublic = window.localStorage.getItem(KEM_PUBLIC);
  let dhPublic = window.localStorage.getItem(DH_PUBLIC);
  let kemPrivate = window.localStorage.getItem(KEM_PRIVATE);
  let dhPrivate = window.localStorage.getItem(DH_PRIVATE);

  if (!kemPublic || !dhPublic || !kemPrivate || !dhPrivate) {
    const keys = await generateHybridKeypair();
    window.localStorage.setItem(KEM_PUBLIC, keys.kemPublicKey);
    window.localStorage.setItem(DH_PUBLIC, keys.dhPublicKey);
    window.localStorage.setItem(KEM_PRIVATE, await wrapSecret(keys.kemPrivateKey));
    window.localStorage.setItem(DH_PRIVATE, await wrapSecret(keys.dhPrivateKey));
  }

  kemPublic = window.localStorage.getItem(KEM_PUBLIC);
  dhPublic = window.localStorage.getItem(DH_PUBLIC);

  if (!kemPublic || !dhPublic) return;

  await apiFetch("/api/keys/register", {
    method: "POST",
    body: JSON.stringify({
      kem_public_key: kemPublic,
      dh_public_key: dhPublic,
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
    hybridDisabled: window.localStorage.getItem(HYBRID_DISABLED) === "1",
  };
}
