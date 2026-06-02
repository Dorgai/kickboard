import { primaryLineupPosition } from "@/lib/lineup-position-groups";
import { getLineups, getMatches, getWorldCupCompetitions } from "@/lib/statsbomb";
import type { SquadPlayerRole } from "@/lib/squads/player-roles";
import { teamsMatch } from "@/lib/squads/team-names";

export type SquadPoolPlayer = {
  playerId: number;
  name: string;
  teamName: string;
  role: SquadPlayerRole;
  jerseyNumber: number | null;
};

export type TeamPlayerPool = {
  teamName: string;
  players: SquadPoolPlayer[];
};

function splitPlayersByTeam(players: SquadPoolPlayer[], homeTeam: string, awayTeam: string) {
  const homePlayers = players.filter((player) => teamsMatch(player.teamName, homeTeam));
  const awayPlayers = players.filter((player) => teamsMatch(player.teamName, awayTeam));
  return { homePlayers, awayPlayers };
}

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

  const poolsByTeam = new Map<string, SquadPoolPlayer[]>();
  for (const player of players) {
    const list = poolsByTeam.get(player.teamName) ?? [];
    list.push(player);
    poolsByTeam.set(player.teamName, list);
  }

  return {
    source: "statsbomb/open-data",
    competitionId: competition.competition_id,
    seasonId: competition.season_id,
    seasonName: competition.season_name,
    matchId: finalMatch.match_id,
    matchLabel: `${finalMatch.home_team.home_team_name} vs ${finalMatch.away_team.away_team_name}`,
    players,
    pools: Array.from(poolsByTeam.entries()).map(([teamName, teamPlayers]) => ({
      teamName,
      players: teamPlayers
    }))
  };
}

function addPlayersFromLineups(
  byId: Map<number, SquadPoolPlayer>,
  lineups: Awaited<ReturnType<typeof getLineups>>,
  allowedTeams: string[]
) {
  for (const team of lineups) {
    const allowed = allowedTeams.some((name) => teamsMatch(team.team_name, name));
    if (!allowed) continue;

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
}

/**
 * Players for the two fixture teams (StatsBomb WC open data). Falls back to scanning
 * the tournament when an exact match pairing is not found.
 */
export async function getFixtureSquadPlayerPool(homeTeam: string, awayTeam: string) {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (!home || !away) {
    throw new Error("TEAMS_REQUIRED");
  }

  const competitions = await getWorldCupCompetitions();
  const competition =
    competitions.find((entry) => entry.match_available) ?? competitions[0];

  if (!competition) {
    throw new Error("NO_WORLD_CUP_DATA");
  }

  const matches = await getMatches(competition.competition_id, competition.season_id);
  if (!matches.length) {
    throw new Error("NO_MATCHES");
  }

  const allowedTeams = [home, away];
  const fixtureMatch =
    matches.find((match) => {
      const matchHome = match.home_team.home_team_name;
      const matchAway = match.away_team.away_team_name;
      return (
        (teamsMatch(matchHome, home) && teamsMatch(matchAway, away)) ||
        (teamsMatch(matchHome, away) && teamsMatch(matchAway, home))
      );
    }) ?? null;

  const byId = new Map<number, SquadPoolPlayer>();

  if (fixtureMatch) {
    const lineups = await getLineups(fixtureMatch.match_id);
    addPlayersFromLineups(byId, lineups, allowedTeams);
  } else {
    for (const match of matches) {
      const lineups = await getLineups(match.match_id);
      addPlayersFromLineups(byId, lineups, allowedTeams);
      if (byId.size >= 46) break;
    }
  }

  const players = Array.from(byId.values()).sort((a, b) => {
    const aHome = teamsMatch(a.teamName, home);
    const bHome = teamsMatch(b.teamName, home);
    if (aHome !== bHome) return aHome ? -1 : 1;
    const byTeam = a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" });
    if (byTeam !== 0) return byTeam;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  const matchLabel = fixtureMatch
    ? `${fixtureMatch.home_team.home_team_name} vs ${fixtureMatch.away_team.away_team_name}`
    : `${home} vs ${away}`;

  const { homePlayers, awayPlayers } = splitPlayersByTeam(players, home, away);

  return {
    source: "statsbomb/open-data",
    competitionId: competition.competition_id,
    seasonId: competition.season_id,
    seasonName: competition.season_name,
    matchId: fixtureMatch?.match_id ?? null,
    matchLabel,
    homeTeam: home,
    awayTeam: away,
    players,
    homePlayers,
    awayPlayers,
    pools: [
      { teamName: home, players: homePlayers },
      { teamName: away, players: awayPlayers }
    ]
  };
}

/**
 * Squad list for a single national team (StatsBomb open data).
 */
export async function getTeamSquadPlayerPool(teamName: string) {
  const team = teamName.trim();
  if (!team) {
    throw new Error("TEAM_REQUIRED");
  }

  const competitions = await getWorldCupCompetitions();
  const competition =
    competitions.find((entry) => entry.match_available) ?? competitions[0];

  if (!competition) {
    throw new Error("NO_WORLD_CUP_DATA");
  }

  const matches = await getMatches(competition.competition_id, competition.season_id);
  if (!matches.length) {
    throw new Error("NO_MATCHES");
  }

  const byId = new Map<number, SquadPoolPlayer>();

  for (const match of matches) {
    const lineups = await getLineups(match.match_id);
    addPlayersFromLineups(byId, lineups, [team]);
    if (byId.size >= 26) break;
  }

  const players = Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return {
    source: "statsbomb/open-data",
    competitionId: competition.competition_id,
    seasonId: competition.season_id,
    seasonName: competition.season_name,
    teamName: team,
    players,
    pools: [{ teamName: team, players }]
  };
}
