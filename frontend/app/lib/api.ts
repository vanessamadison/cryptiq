export const getApiBase = () =>
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("cryptiq_token");
};

export const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("cryptiq_token", token);
};

export const clearToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("cryptiq_token");
};

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error || "request_failed";
    throw new Error(message);
  }
  return json;
}
