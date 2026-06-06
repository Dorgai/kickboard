export const PREDICTION_OUTCOME_SECTION_ID = "prediction-who-wins";

const MOBILE_PREDICTIONS_MEDIA = "(max-width: 900px)";

/** Scroll the outcome block into view on narrow layouts (Predictions tab). */
export function scrollToPredictionOutcomeOnMobile() {
  if (typeof window === "undefined") return;
  if (!window.matchMedia(MOBILE_PREDICTIONS_MEDIA).matches) return;
  scrollToPredictionsEditor();
}

/** Scroll to the top of the Predictions tab (sub-tabs + match picker). */
export function scrollToPredictionsTop() {
  if (typeof window === "undefined") return;

  const target =
    document.getElementById("predictions") ??
    document.querySelector<HTMLElement>(".predictions-panel");
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Scroll the prediction form into view (match picker + pick fields). */
export function scrollToPredictionsEditor() {
  if (typeof window === "undefined") return;

  const target =
    document.querySelector<HTMLElement>(".predictions-match-form-points-row") ??
    document.querySelector<HTMLElement>(".predictions-match-content") ??
    document.getElementById(PREDICTION_OUTCOME_SECTION_ID);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Scroll the unified picks list (yours + friends on shared matches). */
export function scrollToPredictionsPicks() {
  if (typeof window === "undefined") return;

  const target = document.getElementById("predictions-match-picks");
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
