import { loadApiFootballFixtureSquads, loadApiFootballTeamSquad } from "@/lib/api-football-lineups";
import { loadWikipediaNationalTeamSquad } from "@/lib/squads/wikipedia-squad";
import { primaryLineupPosition } from "@/lib/lineup-position-groups";
import { getLineups, getMatches, getWorldCupCompetitions } from "@/lib/statsbomb";
import type { SquadPlayerRole } from "@/lib/squads/player-roles";
import { resolveTeamName, teamsMatch } from "@/lib/squads/team-names";

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

let worldCupTeamNamesCache: { loadedAt: number; names: string[] } | null = null;
const WORLD_CUP_NAMES_CACHE_MS = 60 * 60 * 1000;

function mapRole(positionName: string | null): SquadPoolPlayer["role"] {
  if (!positionName) return "MID";
  const normalized = positionName.toLowerCase();
  if (normalized.includes("goalkeeper")) return "GK";
  if (normalized.includes("back") || normalized.includes("defence")) return "DEF";
  if (normalized.includes("forward") || normalized.includes("wing")) return "FWD";
  return "MID";
}

async function listWorldCupTeamNames() {
  const now = Date.now();
  if (worldCupTeamNamesCache && now - worldCupTeamNamesCache.loadedAt < WORLD_CUP_NAMES_CACHE_MS) {
    return worldCupTeamNamesCache.names;
  }

  const competitions = await getWorldCupCompetitions();
  const names = new Set<string>();

  for (const competition of competitions) {
    const matches = await getMatches(competition.competition_id, competition.season_id);
    for (const match of matches) {
      names.add(match.home_team.home_team_name);
      names.add(match.away_team.away_team_name);
    }
  }

  const list = Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  worldCupTeamNamesCache = { loadedAt: now, names: list };
  return list;
}

function addPlayersFromLineups(
  byId: Map<number, SquadPoolPlayer>,
  lineups: Awaited<ReturnType<typeof getLineups>>,
  allowedTeams: string[],
  displayTeamName?: string
) {
  for (const team of lineups) {
    const allowed = allowedTeams.some((name) => teamsMatch(team.team_name, name));
    if (!allowed) continue;

    for (const player of team.lineup) {
      if (!player.player_id || byId.has(player.player_id)) continue;
      byId.set(player.player_id, {
        playerId: player.player_id,
        name: player.player_nickname?.trim() || player.player_name,
        teamName: displayTeamName ?? team.team_name,
        role: mapRole(primaryLineupPosition(player.positions)),
        jerseyNumber: player.jersey_number ?? null
      });
    }
  }
}

const TARGET_SQUAD_SIZE = 26;

function mergeTeamPlayers(
  existing: SquadPoolPlayer[],
  incoming: SquadPoolPlayer[],
  displayTeamName: string
) {
  const byId = new Map<number, SquadPoolPlayer>();
  for (const player of existing) {
    byId.set(player.playerId, { ...player, teamName: displayTeamName });
  }
  for (const player of incoming) {
    if (!byId.has(player.playerId)) {
      byId.set(player.playerId, { ...player, teamName: displayTeamName });
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

type SupplementSources = {
  homePlayers: SquadPoolPlayer[];
  awayPlayers: SquadPoolPlayer[];
  sources: string[];
  apiMatchLabel?: string;
};

async function supplementTeamFromAlternatives(
  teamName: string,
  existing: SquadPoolPlayer[],
  sourceParts: string[]
) {
  if (existing.length >= TARGET_SQUAD_SIZE) return existing;

  let players = existing;

  if (players.length < TARGET_SQUAD_SIZE) {
    const apiTeam = await loadApiFootballTeamSquad(teamName);
    if (apiTeam?.players.length) {
      players = players.length
        ? mergeTeamPlayers(players, apiTeam.players, teamName)
        : apiTeam.players;
      if (!sourceParts.includes("api-football")) sourceParts.push("api-football");
      if (apiTeam.usedSquads && !sourceParts.includes("api-football/team-squads")) {
        sourceParts.push("api-football/team-squads");
      }
      if (apiTeam.usedLeaguePlayers && !sourceParts.includes("api-football/league-players")) {
        sourceParts.push("api-football/league-players");
      }
      if (apiTeam.usedRecentLineups && !sourceParts.includes("api-football/recent-lineups")) {
        sourceParts.push("api-football/recent-lineups");
      }
    }
  }

  if (players.length < 11) {
    const wiki = await loadWikipediaNationalTeamSquad(teamName);
    if (wiki.length) {
      players = players.length ? mergeTeamPlayers(players, wiki, teamName) : wiki;
      if (!sourceParts.includes("wikipedia/current-squad")) {
        sourceParts.push("wikipedia/current-squad");
      }
    }
  }

  return players;
}

async function supplementFromProviders(
  homePlayers: SquadPoolPlayer[],
  awayPlayers: SquadPoolPlayer[],
  home: string,
  away: string,
  fixtureKey?: string | null
): Promise<SupplementSources> {
  const needsHome = homePlayers.length < TARGET_SQUAD_SIZE;
  const needsAway = awayPlayers.length < TARGET_SQUAD_SIZE;
  const sourceParts: string[] = [];
  let apiMatchLabel: string | undefined;

  if (!needsHome && !needsAway) {
    return { homePlayers, awayPlayers, sources: sourceParts };
  }

  const api = await loadApiFootballFixtureSquads(home, away, fixtureKey);
  let nextHome = homePlayers;
  let nextAway = awayPlayers;

  if (api) {
    if (needsHome && api.home.length) {
      nextHome = homePlayers.length ? mergeTeamPlayers(homePlayers, api.home, home) : api.home;
    }
    if (needsAway && api.away.length) {
      nextAway = awayPlayers.length ? mergeTeamPlayers(awayPlayers, api.away, away) : api.away;
    }
    sourceParts.push("api-football");
    if (api.usedLineups) sourceParts.push("api-football/lineups");
    if (api.usedSquads) sourceParts.push("api-football/squads");
    apiMatchLabel = api.matchLabel;
  }

  if (nextHome.length < TARGET_SQUAD_SIZE) {
    nextHome = await supplementTeamFromAlternatives(home, nextHome, sourceParts);
  }
  if (nextAway.length < TARGET_SQUAD_SIZE) {
    nextAway = await supplementTeamFromAlternatives(away, nextAway, sourceParts);
  }

  return { homePlayers: nextHome, awayPlayers: nextAway, sources: sourceParts, apiMatchLabel };
}

/**
 * Load a national-team squad from any FIFA World Cup edition in StatsBomb open data.
 */
async function loadWorldCupTeamPlayers(feedTeamName: string) {
  const trimmed = feedTeamName.trim();
  if (!trimmed) {
    return { players: [] as SquadPoolPlayer[], statsBombTeamName: null as string | null };
  }

  const knownNames = await listWorldCupTeamNames();
  const statsBombTeamName = resolveTeamName(trimmed, knownNames);
  if (!statsBombTeamName) {
    return { players: [] as SquadPoolPlayer[], statsBombTeamName: null };
  }

  const competitions = await getWorldCupCompetitions();
  const byId = new Map<number, SquadPoolPlayer>();

  for (const competition of competitions) {
    if (byId.size >= TARGET_SQUAD_SIZE) break;

    const matches = await getMatches(competition.competition_id, competition.season_id);
    for (const match of matches) {
      const inMatch =
        teamsMatch(match.home_team.home_team_name, statsBombTeamName) ||
        teamsMatch(match.away_team.away_team_name, statsBombTeamName);
      if (!inMatch) continue;

      const lineups = await getLineups(match.match_id);
      addPlayersFromLineups(byId, lineups, [statsBombTeamName], trimmed);
      if (byId.size >= TARGET_SQUAD_SIZE) break;
    }
  }

  const players = Array.from(byId.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .slice(0, TARGET_SQUAD_SIZE);

  return { players, statsBombTeamName };
}

function addPlayersFromLineupTeams(byId: Map<number, SquadPoolPlayer>, lineups: Awaited<ReturnType<typeof getLineups>>) {
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
}

/**
 * Aggregates unique players from every national team in a World Cup edition via StatsBomb open data.
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

  const teamNames = Array.from(
    new Set(
      matches.flatMap((match) => [
        match.home_team.home_team_name,
        match.away_team.away_team_name
      ])
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const byId = new Map<number, SquadPoolPlayer>();

  await Promise.all(
    teamNames.map(async (teamName) => {
      const { players } = await loadWorldCupTeamPlayers(teamName);
      for (const player of players) {
        if (!byId.has(player.playerId)) {
          byId.set(player.playerId, player);
        }
      }
    })
  );

  if (byId.size === 0) {
    for (const match of matches) {
      const lineups = await getLineups(match.match_id);
      addPlayersFromLineupTeams(byId, lineups);
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
    matchId: null,
    matchLabel: `${competition.season_name} — all teams`,
    players,
    pools: Array.from(poolsByTeam.entries()).map(([teamName, teamPlayers]) => ({
      teamName,
      players: teamPlayers
    }))
  };
}

/**
 * Players for the two fixture teams (StatsBomb WC open data). Loads each side from any
 * World Cup edition where that nation appears (2026 schedule labels may not match 2022 alone).
 */
export async function getFixtureSquadPlayerPool(
  homeTeam: string,
  awayTeam: string,
  options?: { fixtureKey?: string | null }
) {
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

  const fixtureMatch =
    matches.find((match) => {
      const matchHome = match.home_team.home_team_name;
      const matchAway = match.away_team.away_team_name;
      return (
        (teamsMatch(matchHome, home) && teamsMatch(matchAway, away)) ||
        (teamsMatch(matchHome, away) && teamsMatch(matchAway, home))
      );
    }) ?? null;

  const [homeLoaded, awayLoaded] = await Promise.all([
    loadWorldCupTeamPlayers(home),
    loadWorldCupTeamPlayers(away)
  ]);

  let homePlayers = homeLoaded.players;
  let awayPlayers = awayLoaded.players;

  if (fixtureMatch && (homePlayers.length === 0 || awayPlayers.length === 0)) {
    const byId = new Map<number, SquadPoolPlayer>();
    const lineups = await getLineups(fixtureMatch.match_id);
    addPlayersFromLineups(byId, lineups, [home, away]);
    const fromMatch = Array.from(byId.values());
    if (!homePlayers.length) {
      homePlayers = fromMatch
        .filter((player) => teamsMatch(player.teamName, home))
        .map((player) => ({ ...player, teamName: home }));
    }
    if (!awayPlayers.length) {
      awayPlayers = fromMatch
        .filter((player) => teamsMatch(player.teamName, away))
        .map((player) => ({ ...player, teamName: away }));
    }
  }

  const supplement = await supplementFromProviders(
    homePlayers,
    awayPlayers,
    home,
    away,
    options?.fixtureKey
  );
  homePlayers = supplement.homePlayers;
  awayPlayers = supplement.awayPlayers;

  const players = [...homePlayers, ...awayPlayers]
    .filter(
      (player, index, list) => list.findIndex((entry) => entry.playerId === player.playerId) === index
    )
    .sort((a, b) => {
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

  const sources = ["statsbomb/open-data", ...supplement.sources];

  return {
    source: [...new Set(sources)].join("+"),
    competitionId: competition.competition_id,
    seasonId: competition.season_id,
    seasonName: competition.season_name,
    matchId: fixtureMatch?.match_id ?? null,
    matchLabel: supplement.apiMatchLabel ?? matchLabel,
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

  const { players: statsBombPlayers, statsBombTeamName } = await loadWorldCupTeamPlayers(team);
  const sourceParts = ["statsbomb/open-data"];
  let players = statsBombPlayers;

  players = await supplementTeamFromAlternatives(team, players, sourceParts);

  if (!players.length) {
    throw new Error("NO_TEAM_PLAYERS");
  }

  const competitions = await getWorldCupCompetitions();
  const competition =
    competitions.find((entry) => entry.match_available) ?? competitions[0];

  if (!competition) {
    throw new Error("NO_WORLD_CUP_DATA");
  }

  return {
    source: [...new Set(sourceParts)].join("+"),
    competitionId: competition.competition_id,
    seasonId: competition.season_id,
    seasonName: competition.season_name,
    teamName: team,
    statsBombTeamName,
    players,
    pools: [{ teamName: team, players }]
  };
}
