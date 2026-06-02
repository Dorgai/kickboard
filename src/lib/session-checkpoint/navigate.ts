/** Open Predictions tab with a fixture pre-selected. */
export function navigateToPredictFixture(fixtureKey: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.pathname = url.pathname || "/";
  url.searchParams.set("predictionsFixture", fixtureKey);
  url.hash = "predictions";
  window.location.assign(`${url.pathname}${url.search}${url.hash}`);
}
