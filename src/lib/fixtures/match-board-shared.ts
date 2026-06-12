import type { FixtureOption, MatchBoardGoal } from "@/lib/fixtures/fixture-key";

export type { MatchBoardGoal };

export type MatchBoardFixtureState = {
  fixtureId: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "upcoming" | "live" | "finished";
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  goalScorers: MatchBoardGoal[];
};

export type MatchBoardCard = {
  fixtureKey: string;
  fixtureId: number | null;
  homeTeam: string;
  awayTeam: string;
  group: string | null;
  date: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "upcoming" | "live" | "finished";
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  startsInMinutes: number | null;
  goalScorers: MatchBoardGoal[];
  segment?: "live" | "starting_soon" | "recent_result";
};

export type MatchBoardPayload = {
  connected: boolean;
  message?: string;
  provider?: string;
  updatedAt: string;
  live: MatchBoardCard[];
  startingSoon: MatchBoardCard[];
  recentResults: MatchBoardCard[];
  byKey: Record<string, MatchBoardFixtureState>;
};

export const MATCH_BOARD_POLL_MS = 30_000;
export const MATCH_BOARD_POLL_LIVE_MS = 20_000;

export function enrichFixtureOption(
  fixture: FixtureOption,
  byKey: Record<string, MatchBoardFixtureState>
): FixtureOption {
  const state = byKey[fixture.key];
  if (!state) return fixture;
  return {
    ...fixture,
    status: state.status,
    homeGoals: state.homeGoals,
    awayGoals: state.awayGoals,
    elapsed: state.elapsed,
    statusShort: state.statusShort,
    goalScorers: state.goalScorers
  };
}

export function formatGoalMinute(goal: MatchBoardGoal) {
  if (goal.minute == null) return "";
  return goal.extra != null && goal.extra > 0 ? `${goal.minute}+${goal.extra}'` : `${goal.minute}'`;
}
