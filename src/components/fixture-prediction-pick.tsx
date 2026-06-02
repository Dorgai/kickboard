"use client";

import { FixturePredictionsForm } from "@/components/fixture-predictions-form";

type FixturePredictionPickProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
  inline?: boolean;
  onSaved?: () => void;
};

/** Coach Board / compact surface — outcome + score (scorers on Predictions tab). */
export function FixturePredictionPick({
  fixtureKey,
  homeTeam,
  awayTeam,
  inline = false,
  onSaved
}: FixturePredictionPickProps) {
  return (
    <FixturePredictionsForm
      awayTeam={awayTeam}
      compact={inline}
      fixtureKey={fixtureKey}
      homeTeam={homeTeam}
      onSaved={onSaved}
    />
  );
}
