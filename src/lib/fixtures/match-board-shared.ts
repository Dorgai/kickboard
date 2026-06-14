import type { FixtureOption, MatchBoardGoal } from "@/lib/fixtures/fixture-key";

export type { MatchBoardGoal };

export type MatchBoardRedCard = {
  playerName: string;
  teamSide: "home" | "away";
  minute: number | null;
  extra: number | null;
};

export type MatchBoardFixtureState = {
  fixtureId: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "upcoming" | "live" | "finished";
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  goalScorers: MatchBoardGoal[];
  redCards: MatchBoardRedCard[];
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
  redCards: MatchBoardRedCard[];
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
  /** API rows merged this refresh (diagnostic). */
  apiFixtureCount?: number;
};

export const MATCH_BOARD_POLL_MS = 25_000;
export const MATCH_BOARD_POLL_LIVE_MS = 8_000;

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
