import { firePredictionConfetti } from "@/lib/predictions/celebrate-wins";
import { celebratePredictionSubmit } from "@/lib/predictions/submit-celebration";

/** Flying footballs plus confetti burst for the welcome dialog primary CTA. */
export function celebrateWelcomeStart(origin?: HTMLElement | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  celebratePredictionSubmit(origin);
  void firePredictionConfetti("login");
}
