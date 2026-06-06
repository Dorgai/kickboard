/** Mobile / tablet viewport — matches bottom dock and push auto-enable breakpoint. */
export function isMobileOrTabletViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1024px)").matches;
}
