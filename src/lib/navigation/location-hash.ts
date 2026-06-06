/** Home tab — default when leaving Community. */
export const HOME_HASH = "predictions";

export const COMMUNITY_HASH = "community";

function normalizeHash(value: string): string {
  return value.replace(/^#/, "").trim().toLowerCase();
}

export function readLocationHash(): string {
  if (typeof window === "undefined") return "";
  return normalizeHash(window.location.hash);
}

function buildHref(nextHash: string): string {
  const url = new URL(window.location.href);
  url.hash = nextHash ? `#${nextHash}` : "";
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Notify listeners after the URL hash changes outside a native hashchange event. */
export function notifyLocationHashChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/**
 * Set the URL hash without a full navigation. Dispatches `hashchange` because
 * Next.js `Link` and `history.pushState` do not reliably fire it on same-route clicks.
 */
export function writeLocationHash(nextRaw: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") return;
  const next = normalizeHash(nextRaw);
  const current = readLocationHash();

  if (current === next) {
    notifyLocationHashChange();
    return;
  }

  const href = buildHref(next);
  const state = window.history.state;

  if (options?.replace) {
    window.history.replaceState(state, "", href);
  } else {
    window.history.pushState(state, "", href);
  }

  notifyLocationHashChange();
}

export function navigateToHome(options?: { replace?: boolean }) {
  writeLocationHash(HOME_HASH, options);
}

export function navigateToCommunity(options?: { replace?: boolean }) {
  writeLocationHash(COMMUNITY_HASH, options);
}

export function subscribeLocationHash(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}
