import { buildMatchStats, getEvents, getLineups, getMatches } from "@/lib/statsbomb";
import type { CareerAppearance } from "@/lib/player-stat-metrics";

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R | null>) {
  const results: Array<R | null> = new Array(items.length).fill(null);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results.filter((entry): entry is R => entry !== null);
}

export async function getPlayerTournamentAppearances(
  playerId: number,
  competitionId: number,
  seasonId: number,
  options?: { excludeMatchId?: number }
) {
  const matches = await getMatches(competitionId, seasonId);
  const otherMatches = matches.filter((match) => match.match_id !== options?.excludeMatchId);

  const appearances = await mapPool(otherMatches, 5, async (match) => {
    const lineups = await getLineups(match.match_id);
    const inSquad = lineups.some((team) => team.lineup.some((player) => player.player_id === playerId));
    if (!inSquad) return null;

    const events = await getEvents(match.match_id);
    const stats = buildMatchStats(events);
    const row = stats.playerStats.find((player) => player.playerId === playerId);
    if (!row) return null;

    const opponent =
      row.team === match.home_team.home_team_name
        ? match.away_team.away_team_name
        : match.home_team.home_team_name;

    const appearance: CareerAppearance = {
      matchId: match.match_id,
      date: match.match_date,
      stage: match.competition_stage?.name ?? null,
      team: row.team,
      opponent,
      homeTeam: match.home_team.home_team_name,
      awayTeam: match.away_team.away_team_name,
      homeScore: match.home_score,
      awayScore: match.away_score,
      goals: row.goals,
      assists: row.assists,
      shots: row.shots,
      xg: row.xg
    };

    return appearance;
  });

  appearances.sort((left, right) => left.date.localeCompare(right.date));

  const totals = appearances.reduce(
    (accumulator, match) => ({
      appearances: accumulator.appearances + 1,
      goals: accumulator.goals + match.goals,
      assists: accumulator.assists + match.assists,
      shots: accumulator.shots + match.shots,
      xg: Number((accumulator.xg + match.xg).toFixed(2))
    }),
    { appearances: 0, goals: 0, assists: 0, shots: 0, xg: 0 }
  );

  return {
    appearances,
    totals
  };
}
