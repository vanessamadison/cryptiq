import os
from typing import Optional, Tuple

try:
    import oqs  # type: ignore
except Exception:  # pragma: no cover
    oqs = None


DEFAULT_KEM_CANDIDATES = [
    "ML-KEM-768",
    "Kyber768",
]

DEFAULT_SIG_CANDIDATES = [
    "ML-DSA-65",
    "Dilithium3",
]


def _pick_algorithm(enabled, candidates) -> Optional[str]:
    for candidate in candidates:
        if candidate in enabled:
            return candidate
    return enabled[0] if enabled else None


def get_pqc_status() -> Tuple[bool, Optional[str], Optional[str]]:
    if oqs is None:
        return False, None, None

    enabled_kem = oqs.get_enabled_KEM_mechanisms()
    enabled_sig = oqs.get_enabled_sig_mechanisms()

    kem_override = os.getenv("CRYPTIQ_PQC_KEM")
    sig_override = os.getenv("CRYPTIQ_PQC_SIG")

    kem = kem_override if kem_override in enabled_kem else _pick_algorithm(enabled_kem, DEFAULT_KEM_CANDIDATES)
    sig = sig_override if sig_override in enabled_sig else _pick_algorithm(enabled_sig, DEFAULT_SIG_CANDIDATES)

    return True, kem, sig
