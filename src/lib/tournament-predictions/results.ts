import { fetchApiFootball } from "@/lib/api-football";
import type { TournamentResults } from "@/lib/tournament-predictions/grading";

type TopScorerApiRow = {
  player: { id: number; name: string };
  statistics: Array<{
    team: { name: string };
    goals: { total: number | null };
  }>;
};

function finishedShortCodes() {
  return new Set(["FT", "AET", "PEN"]);
}

export async function fetchTournamentResults(): Promise<TournamentResults | null> {
  const league = process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1";
  const season = process.env.API_FOOTBALL_SEASON?.trim() || "2026";

  try {
    const [fixturesPayload, scorersPayload] = await Promise.all([
      fetchApiFootball<Array<{
        teams: { home: { name: string }; away: { name: string } };
        goals: { home: number | null; away: number | null };
        fixture: { status: { short: string } };
      }>>("/fixtures", { league, season, round: "Final" }),
      fetchApiFootball<TopScorerApiRow[]>("/players/topscorers", { league, season })
    ]);

    const finalFixture = fixturesPayload.response?.find((row) =>
      finishedShortCodes().has(row.fixture.status.short)
    );

    let champion: string | null = null;
    let finalists: string[] = [];

    if (finalFixture) {
      const homeGoals = finalFixture.goals.home;
      const awayGoals = finalFixture.goals.away;
      if (homeGoals != null && awayGoals != null) {
        if (homeGoals > awayGoals) {
          champion = finalFixture.teams.home.name;
          finalists = [finalFixture.teams.home.name, finalFixture.teams.away.name];
        } else if (awayGoals > homeGoals) {
          champion = finalFixture.teams.away.name;
          finalists = [finalFixture.teams.away.name, finalFixture.teams.home.name];
        } else {
          finalists = [finalFixture.teams.home.name, finalFixture.teams.away.name];
        }
      }
    }

    const scorerRows = scorersPayload.response ?? [];
    const leaderboard = scorerRows
      .map((row, index) => {
        const stats = row.statistics[0];
        const goals = stats?.goals?.total ?? 0;
        return {
          playerId: row.player.id,
          playerName: row.player.name,
          teamName: stats?.team?.name ?? "",
          predictedGoals: goals,
          rank: index + 1
        };
      })
      .filter((row) => row.playerName);

    const top = leaderboard[0];
    const topScorer = top
      ? {
          playerId: top.playerId,
          playerName: top.playerName,
          teamName: top.teamName
        }
      : null;

    if (!champion && !topScorer) return null;

    return {
      champion,
      finalists,
      topScorer,
      bestPlayer: null,
      topScorerLeaderboard: leaderboard.slice(0, 10)
    };
  } catch {
    return null;
  }
}

export function tournamentResultsReady(results: TournamentResults | null) {
  if (!results) return false;
  return Boolean(results.champion || results.topScorer);
}
