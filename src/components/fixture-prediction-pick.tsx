"use client";

import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";

type FixturePredictionPickProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
};

/** Coach Board — link to the Predictions tab with this fixture pre-selected. */
export function FixturePredictionPick({ fixtureKey, homeTeam, awayTeam }: FixturePredictionPickProps) {
  return (
    <button
      aria-label={`Make your predictions for ${homeTeam} vs ${awayTeam}`}
      className="button secondary squad-builder-predictions-link"
      type="button"
      onClick={() => navigateToPredictFixture(fixtureKey, { scrollToTop: true })}
    >
      Make your predictions
    </button>
  );
}
