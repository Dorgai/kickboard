import { fetchApiFootball } from "@/lib/api-football";
import type { MatchBoardGoal } from "@/lib/fixtures/match-board-shared";

export type ApiFootballFixtureEvent = {
  time: {
    elapsed: number | null;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
  };
  player: {
    id: number | null;
    name: string | null;
  };
  type: string;
  detail: string;
};

export function parseApiFootballGoalEvents(
  events: ApiFootballFixtureEvent[],
  homeTeamId: number,
  awayTeamId: number
): MatchBoardGoal[] {
  return events
    .filter((event) => event.type === "Goal" && event.detail !== "Missed Penalty")
    .map((event) => ({
      playerName: event.player?.name?.trim() || "Unknown",
      teamSide: event.team.id === homeTeamId ? "home" : event.team.id === awayTeamId ? "away" : "home",
      minute: event.time.elapsed,
      extra: event.time.extra
    }));
}

export async function fetchFixtureGoalEvents(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  const payload = await fetchApiFootball<ApiFootballFixtureEvent[]>("/fixtures/events", {
    fixture: String(fixtureId)
  });
  return parseApiFootballGoalEvents(payload.response ?? [], homeTeamId, awayTeamId);
}
