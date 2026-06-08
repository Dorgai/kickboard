/** OAuth return URL without hash fragments (Auth.js rejects some hash callback URLs). */
export function resolveSignInCallbackUrl(fallback = "/") {
  if (typeof window === "undefined") return fallback;

  const { origin, pathname, search } = window.location;
  const path = `${pathname}${search}`;
  return path && path !== "/" ? `${origin}${path}` : origin;
}
