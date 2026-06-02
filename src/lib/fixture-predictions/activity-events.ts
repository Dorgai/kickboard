export const PREDICTION_ACTIVITY_EVENT = "kickboard:prediction-activity";

export function notifyPredictionActivity() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PREDICTION_ACTIVITY_EVENT));
}
