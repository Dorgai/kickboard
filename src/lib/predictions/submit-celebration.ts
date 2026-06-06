export const PREDICTION_SUBMIT_CELEBRATION_EVENT = "kickboard:prediction-submit-celebration";

export type PredictionSubmitCelebrationDetail = {
  originX: number;
  originY: number;
};

export function celebratePredictionSubmit(origin?: HTMLElement | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const rect = origin?.getBoundingClientRect();
  const originX = rect ? rect.left + rect.width / 2 : window.innerWidth * 0.5;
  const originY = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.75;

  window.dispatchEvent(
    new CustomEvent<PredictionSubmitCelebrationDetail>(PREDICTION_SUBMIT_CELEBRATION_EVENT, {
      detail: { originX, originY }
    })
  );
}
