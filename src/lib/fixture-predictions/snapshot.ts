import {
  formatScorerPicksSummary,
  outcomeShort,
  type FixtureOutcome,
  type FixturePredictionRecord,
  type ScorerPick
} from "@/lib/fixture-predictions/types";

export type PredictionSnapshot = {
  predictedOutcome: FixtureOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: ScorerPick[];
};

export function snapshotFromRecord(record: FixturePredictionRecord | null): PredictionSnapshot | null {
  if (!record) return null;
  return {
    predictedOutcome: record.predictedOutcome,
    homeScore: record.homeScore,
    awayScore: record.awayScore,
    scorerPicks: record.scorerPicks
  };
}

export function snapshotFromInput(input: {
  predictedOutcome?: FixtureOutcome | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scorerPicks?: ScorerPick[];
}): PredictionSnapshot {
  return {
    predictedOutcome: input.predictedOutcome ?? null,
    homeScore: input.homeScore ?? null,
    awayScore: input.awayScore ?? null,
    scorerPicks: input.scorerPicks ?? []
  };
}

function snapshotsEqual(a: PredictionSnapshot | null, b: PredictionSnapshot | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function describePredictionSnapshot(snapshot: PredictionSnapshot | null) {
  if (!snapshot) return "No picks";
  const parts: string[] = [];
  if (snapshot.predictedOutcome) {
    parts.push(outcomeShort(snapshot.predictedOutcome));
  }
  if (snapshot.homeScore !== null && snapshot.awayScore !== null) {
    parts.push(`${snapshot.homeScore}–${snapshot.awayScore}`);
  }
  if (snapshot.scorerPicks.length > 0) {
    parts.push(formatScorerPicksSummary(snapshot.scorerPicks));
  }
  return parts.length ? parts.join(" · ") : "No picks";
}

export function summarizePredictionChange(input: {
  action: "created" | "updated" | "deleted";
  previous: PredictionSnapshot | null;
  next: PredictionSnapshot | null;
  fixtureLabel: string;
}) {
  if (input.action === "created") {
    return `Added picks for ${input.fixtureLabel}: ${describePredictionSnapshot(input.next)}`;
  }
  if (input.action === "deleted") {
    return `Removed all picks for ${input.fixtureLabel} (was ${describePredictionSnapshot(input.previous)})`;
  }
  return `Changed picks for ${input.fixtureLabel}: ${describePredictionSnapshot(input.previous)} → ${describePredictionSnapshot(input.next)}`;
}

export function detectPredictionAction(
  previous: PredictionSnapshot | null,
  next: PredictionSnapshot | null
): "created" | "updated" | "deleted" | "unchanged" {
  const hadPicks = previous && describePredictionSnapshot(previous) !== "No picks";
  const hasPicks = next && describePredictionSnapshot(next) !== "No picks";

  if (!hadPicks && hasPicks) return "created";
  if (hadPicks && !hasPicks) return "deleted";
  if (!hadPicks && !hasPicks) return "unchanged";
  if (snapshotsEqual(previous, next)) return "unchanged";
  return "updated";
}
