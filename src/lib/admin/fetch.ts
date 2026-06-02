export type AdminAuthMode = "oauth" | "token";

export function adminFetch(
  url: string,
  init: RequestInit | undefined,
  auth: { mode: AdminAuthMode; token?: string }
) {
  const headers = new Headers(init?.headers);
  if (auth.mode === "token" && auth.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store"
  });
}
