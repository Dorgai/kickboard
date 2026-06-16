import type { MatchBoardGoal } from "@/lib/fixtures/match-board-shared";

export const LIVE_MATCH_GOAL_EVENT = "kickboard:live-match-goal";

export type LiveMatchGoalChange = {
  fixtureKey: string;
  fixtureKeys: string[];
  fixtureId: number | null;
  label: string;
  homeGoals: number;
  awayGoals: number;
  goalDelta: number;
  goalScorers: MatchBoardGoal[];
};

export type LiveMatchGoalEventDetail = {
  changes: LiveMatchGoalChange[];
};

export function notifyLiveMatchGoal(detail: LiveMatchGoalEventDetail) {
  if (typeof window === "undefined" || detail.changes.length === 0) return;
  window.dispatchEvent(new CustomEvent<LiveMatchGoalEventDetail>(LIVE_MATCH_GOAL_EVENT, { detail }));
}
