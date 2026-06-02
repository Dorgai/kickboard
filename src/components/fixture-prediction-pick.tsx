"use client";

import { FixturePredictionsForm } from "@/components/fixture-predictions-form";

type FixturePredictionPickProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
  /** @deprecated Use coachBoard */
  inline?: boolean;
  coachBoard?: boolean;
  onSaved?: () => void;
};

/** Coach Board — outcome + score below the pitch (scorers on Predictions tab). */
export function FixturePredictionPick({
  fixtureKey,
  homeTeam,
  awayTeam,
  inline = false,
  coachBoard = false,
  onSaved
}: FixturePredictionPickProps) {
  const onCoachBoard = coachBoard || inline;
  return (
    <FixturePredictionsForm
      awayTeam={awayTeam}
      coachBoard={onCoachBoard}
      compact={onCoachBoard}
      fixtureKey={fixtureKey}
      homeTeam={homeTeam}
      onSaved={onSaved}
    />
  );
}
