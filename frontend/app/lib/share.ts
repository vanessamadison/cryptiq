export function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }
  const el = document.createElement("textarea");
  el.value = value;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  return Promise.resolve();
}

export function buildRoomLink(roomId: string, roomKey?: string) {
  const base = window.location.origin;
  const params = new URLSearchParams();
  if (roomKey) params.set("key", roomKey);
  return `${base}/room/${roomId}${params.toString() ? `?${params.toString()}` : ""}`;
}
