export const NAVIGATE_PREDICTIONS_EVENT = "kickboard:navigate-predictions";

export type NavigatePredictionsDetail = {
  fixtureKey: string;
};

/** Open Predictions tab with a fixture pre-selected (no full page reload). */
export function navigateToPredictFixture(fixtureKey: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.pathname = url.pathname || "/";
  url.searchParams.set("predictionsFixture", fixtureKey);
  url.searchParams.set("predictionsTab", "match");
  url.hash = "predictions-match";
  const href = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", href);
  window.dispatchEvent(
    new CustomEvent<NavigatePredictionsDetail>(NAVIGATE_PREDICTIONS_EVENT, {
      detail: { fixtureKey }
    })
  );
}
