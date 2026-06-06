export const NAVIGATE_PREDICTIONS_EVENT = "kickboard:navigate-predictions";

export type NavigatePredictionsDetail = {
  fixtureKey?: string;
  group?: string;
  /** When true, scroll to the top of the Predictions section (Coach Board link). */
  scrollToTop?: boolean;
};

/** Open Predictions tab with a fixture pre-selected (no full page reload). */
export function navigateToPredictFixture(
  fixtureKey: string,
  options?: { scrollToTop?: boolean }
) {
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
      detail: { fixtureKey, scrollToTop: options?.scrollToTop }
    })
  );
}

/** Open Predictions → Match picks with a group pre-selected (first fixture in group). */
export function navigateToPredictGroup(group: string, options?: { scrollToTop?: boolean }) {
  if (typeof window === "undefined") return;
  const letter = group.trim().toUpperCase();
  if (!letter) return;

  const url = new URL(window.location.href);
  url.pathname = url.pathname || "/";
  url.searchParams.set("predictionsGroup", letter);
  url.searchParams.delete("predictionsFixture");
  url.searchParams.set("predictionsTab", "match");
  url.hash = "predictions-match";
  const href = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", href);
  window.dispatchEvent(
    new CustomEvent<NavigatePredictionsDetail>(NAVIGATE_PREDICTIONS_EVENT, {
      detail: { group: letter, scrollToTop: options?.scrollToTop }
    })
  );
}
