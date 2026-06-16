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
      playerId: event.player?.id ?? null,
      playerName: event.player?.name?.trim() || "Unknown",
      teamSide: event.team.id === homeTeamId ? "home" : event.team.id === awayTeamId ? "away" : "home",
      minute: event.time.elapsed,
      extra: event.time.extra
    }));
}

export type MatchBoardRedCard = {
  playerName: string;
  teamSide: "home" | "away";
  minute: number | null;
  extra: number | null;
};

export function parseApiFootballRedCardEvents(
  events: ApiFootballFixtureEvent[],
  homeTeamId: number,
  awayTeamId: number
): MatchBoardRedCard[] {
  return events
    .filter(
      (event) =>
        event.type === "Card" &&
        (event.detail === "Red Card" || event.detail === "Second Yellow card")
    )
    .map((event) => ({
      playerName: event.player?.name?.trim() || "Unknown",
      teamSide: event.team.id === homeTeamId ? "home" : event.team.id === awayTeamId ? "away" : "home",
      minute: event.time.elapsed,
      extra: event.time.extra
    }));
}

export async function fetchFixtureMatchEvents(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  const payload = await fetchApiFootball<ApiFootballFixtureEvent[]>("/fixtures/events", {
    fixture: String(fixtureId)
  });
  const events = payload.response ?? [];
  return {
    goalScorers: parseApiFootballGoalEvents(events, homeTeamId, awayTeamId),
    redCards: parseApiFootballRedCardEvents(events, homeTeamId, awayTeamId)
  };
}

export async function fetchFixtureGoalEvents(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  const { goalScorers } = await fetchFixtureMatchEvents(fixtureId, homeTeamId, awayTeamId);
  return goalScorers;
}
