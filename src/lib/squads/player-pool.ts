import { primaryLineupPosition } from "@/lib/lineup-position-groups";
import { getLineups, getMatches, getWorldCupCompetitions } from "@/lib/statsbomb";

export type SquadPoolPlayer = {
  playerId: number;
  name: string;
  teamName: string;
  role: "GK" | "DEF" | "MID" | "FWD";
  jerseyNumber: number | null;
};

function mapRole(positionName: string | null): SquadPoolPlayer["role"] {
  if (!positionName) return "MID";
  const normalized = positionName.toLowerCase();
  if (normalized.includes("goalkeeper")) return "GK";
  if (normalized.includes("back") || normalized.includes("defence")) return "DEF";
  if (normalized.includes("forward") || normalized.includes("wing")) return "FWD";
  return "MID";
}

/**
 * Aggregates unique players from a World Cup final (or latest available match) via StatsBomb open data.
 */
export async function getWorldCupSquadPlayerPool(options?: {
  competitionId?: number;
  seasonId?: number;
}) {
  const competitions = await getWorldCupCompetitions();
  const competition =
    competitions.find(
      (entry) =>
        entry.competition_id === options?.competitionId && entry.season_id === options?.seasonId
    ) ??
    competitions.find((entry) => entry.match_available) ??
    competitions[0];

  if (!competition) {
    throw new Error("NO_WORLD_CUP_DATA");
  }

  const matches = await getMatches(competition.competition_id, competition.season_id);
  if (!matches.length) {
    throw new Error("NO_MATCHES");
  }

  const finalMatch =
    matches.find((match) => /final/i.test(match.competition_stage?.name ?? "")) ??
    matches[matches.length - 1];

  const lineups = await getLineups(finalMatch.match_id);
  const byId = new Map<number, SquadPoolPlayer>();

  for (const team of lineups) {
    for (const player of team.lineup) {
      if (!player.player_id || byId.has(player.player_id)) continue;
      byId.set(player.player_id, {
        playerId: player.player_id,
        name: player.player_nickname?.trim() || player.player_name,
        teamName: team.team_name,
        role: mapRole(primaryLineupPosition(player.positions)),
        jerseyNumber: player.jersey_number ?? null
      });
    }
  }

  const players = Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return {
    source: "statsbomb/open-data",
    competitionId: competition.competition_id,
    seasonId: competition.season_id,
    seasonName: competition.season_name,
    matchId: finalMatch.match_id,
    matchLabel: `${finalMatch.home_team.home_team_name} vs ${finalMatch.away_team.away_team_name}`,
    players
  };
}
