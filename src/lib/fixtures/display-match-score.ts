import type { FixtureOption } from "@/lib/fixtures/fixture-key";

type MatchStatus = FixtureOption["status"] | "live" | "finished" | "upcoming";

export function normalizeMatchGoals(
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
  status: MatchStatus | undefined
): { homeGoals: number | null; awayGoals: number | null } {
  if (status === "live" || status === "finished") {
    return {
      homeGoals: homeGoals ?? 0,
      awayGoals: awayGoals ?? 0
    };
  }
  return {
    homeGoals: homeGoals ?? null,
    awayGoals: awayGoals ?? null
  };
}

export function matchScoresForDisplay(
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
  status: MatchStatus | undefined
): { homeScore?: number; awayScore?: number } {
  const normalized = normalizeMatchGoals(homeGoals, awayGoals, status);
  if (status === "live" || status === "finished") {
    return { homeScore: normalized.homeGoals ?? 0, awayScore: normalized.awayGoals ?? 0 };
  }
  if (normalized.homeGoals != null && normalized.awayGoals != null) {
    return { homeScore: normalized.homeGoals, awayScore: normalized.awayGoals };
  }
  return {};
}

export function shouldShowMatchScore(
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
  status: MatchStatus | undefined
) {
  if (status === "live" || status === "finished") return true;
  return homeGoals != null && awayGoals != null;
}
