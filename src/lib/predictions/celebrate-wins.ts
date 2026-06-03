import { PREDICTION_BLOCK_SHORT } from "@/lib/fixture-predictions/labels";
import type { PredictionResultStatus } from "@/lib/fixture-predictions/types";

export type PickForCelebration = {
  id: string;
  fixtureLabel: string;
  predictedOutcome: string | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: unknown[];
  outcomeStatus: PredictionResultStatus | string;
  scoreStatus: PredictionResultStatus | string;
  scorersStatus: PredictionResultStatus | string;
  outcomePointsAwarded: number;
  scorePointsAwarded: number;
  scorersPointsAwarded: number;
};

export type PredictionWinCelebration = {
  fixtureLabel: string;
  categoryLabel: string;
  status: PredictionResultStatus;
  points: number;
};

type CategorySlice = {
  key: string;
  label: string;
  status: string;
  points: number;
};

function isWinStatus(status: string) {
  return status === "won" || status === "partial";
}

function categoriesFromPick(pick: PickForCelebration): CategorySlice[] {
  const slices: CategorySlice[] = [];
  if (pick.predictedOutcome) {
    slices.push({
      key: `${pick.id}:outcome`,
      label: PREDICTION_BLOCK_SHORT.outcome,
      status: pick.outcomeStatus,
      points: pick.outcomePointsAwarded
    });
  }
  if (pick.homeScore !== null && pick.awayScore !== null) {
    slices.push({
      key: `${pick.id}:score`,
      label: PREDICTION_BLOCK_SHORT.score,
      status: pick.scoreStatus,
      points: pick.scorePointsAwarded
    });
  }
  if (Array.isArray(pick.scorerPicks) && pick.scorerPicks.length > 0) {
    slices.push({
      key: `${pick.id}:scorers`,
      label: PREDICTION_BLOCK_SHORT.scorers,
      status: pick.scorersStatus,
      points: pick.scorersPointsAwarded
    });
  }
  return slices;
}

export function buildPredictionStatusSnapshot(picks: PickForCelebration[]) {
  const snapshot: Record<string, string> = {};
  for (const pick of picks) {
    for (const slice of categoriesFromPick(pick)) {
      snapshot[slice.key] = slice.status;
    }
  }
  return snapshot;
}

/** Compare to last stored snapshot; first visit seeds without celebrating. */
export function detectNewPredictionWins(
  previous: Record<string, string> | null,
  picks: PickForCelebration[]
): { wins: PredictionWinCelebration[]; snapshot: Record<string, string> } {
  const snapshot = buildPredictionStatusSnapshot(picks);
  if (previous === null) {
    return { wins: [], snapshot };
  }

  const wins: PredictionWinCelebration[] = [];
  for (const pick of picks) {
    for (const slice of categoriesFromPick(pick)) {
      const was = previous[slice.key] ?? "pending";
      if (was === "pending" && isWinStatus(slice.status)) {
        wins.push({
          fixtureLabel: pick.fixtureLabel,
          categoryLabel: slice.label,
          status: slice.status as PredictionResultStatus,
          points: slice.points
        });
      }
    }
  }

  return { wins, snapshot };
}

export function formatPredictionWinMessage(wins: PredictionWinCelebration[]) {
  if (wins.length === 0) return "";
  const first = wins[0];
  const points = wins.reduce((sum, win) => sum + win.points, 0);
  const headline =
    wins.length === 1
      ? `${first.fixtureLabel} — ${first.categoryLabel} pick`
      : `${wins.length} winning picks`;
  const suffix =
    points > 0 ? ` +${points} pts` : first.status === "partial" ? " (partial)" : "";
  return `${headline}${suffix}`;
}

export async function firePredictionConfetti(mode: "live" | "login" = "live") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const confetti = (await import("canvas-confetti")).default;
  const count = mode === "login" ? 180 : 110;
  const defaults = {
    origin: { y: 0.62 },
    zIndex: 10050,
    disableForReducedMotion: true
  };

  const brand = ["#16a34a", "#22c55e", "#86efac", "#fbbf24", "#f59e0b"];

  function burst(particleRatio: number, options: Parameters<typeof confetti>[0]) {
    void confetti({
      ...defaults,
      ...options,
      particleCount: Math.floor(count * particleRatio),
      colors: brand
    });
  }

  burst(0.28, { spread: 28, startVelocity: 52 });
  burst(0.22, { spread: 68, decay: 0.92 });
  burst(0.3, { spread: 102, decay: 0.9, scalar: 0.85 });
  burst(0.12, { spread: 130, startVelocity: 38, scalar: 1.15 });

  if (mode === "login") {
    window.setTimeout(() => {
      burst(0.2, { spread: 88, startVelocity: 42 });
      burst(0.15, { spread: 120, decay: 0.93, scalar: 0.9 });
    }, 280);
  }
}
