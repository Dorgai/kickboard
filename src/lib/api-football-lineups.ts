import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";
import type { SquadPlayerRole } from "@/lib/squads/player-roles";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { parseApiFootballFixtureId } from "@/lib/fixtures/fixture-key";
import { teamsMatch } from "@/lib/squads/team-names";

/** Avoid colliding with StatsBomb player ids in saved lineups. */
export const API_FOOTBALL_PLAYER_ID_BASE = 2_100_000_000;

type ApiFootballLineupPlayer = {
  id: number;
  name: string;
  number: number | null;
  pos: string | null;
};

type ApiFootballLineupTeam = {
  team: { id: number; name: string };
  startXI: { player: ApiFootballLineupPlayer }[];
  substitutes: { player: ApiFootballLineupPlayer }[];
};

type ApiFootballSquadPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
};

type ApiFootballSquadTeam = {
  team: { id: number; name: string };
  players: ApiFootballSquadPlayer[];
};

function worldCupLeagueParams() {
  return {
    league: process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1",
    season: process.env.API_FOOTBALL_SEASON?.trim() || "2026"
  };
}

function mapApiRole(position: string | null | undefined): SquadPlayerRole {
  if (!position) return "MID";
  const normalized = position.toUpperCase();
  if (normalized === "G" || normalized.includes("GOAL")) return "GK";
  if (normalized === "D" || normalized.includes("DEF")) return "DEF";
  if (normalized === "F" || normalized.includes("FOR") || normalized === "A") return "FWD";
  return "MID";
}

function apiPlayerId(rawId: number) {
  return API_FOOTBALL_PLAYER_ID_BASE + rawId;
}

function addApiPlayer(
  byId: Map<number, SquadPoolPlayer>,
  player: ApiFootballLineupPlayer | ApiFootballSquadPlayer,
  displayTeamName: string,
  roleSource: string | null | undefined
) {
  if (!player.id || !player.name?.trim()) return;
  const id = apiPlayerId(player.id);
  if (byId.has(id)) return;
  byId.set(id, {
    playerId: id,
    name: player.name.trim(),
    teamName: displayTeamName,
    role: mapApiRole(roleSource ?? ("pos" in player ? player.pos : player.position)),
    jerseyNumber: player.number ?? null
  });
}

function playersFromLineupTeams(
  lineups: ApiFootballLineupTeam[],
  homeTeam: string,
  awayTeam: string
): { home: SquadPoolPlayer[]; away: SquadPoolPlayer[] } {
  const homeById = new Map<number, SquadPoolPlayer>();
  const awayById = new Map<number, SquadPoolPlayer>();

  for (const entry of lineups) {
    const apiName = entry.team.name;
    const isHome = teamsMatch(apiName, homeTeam);
    const isAway = teamsMatch(apiName, awayTeam);
    if (!isHome && !isAway) continue;

    const displayTeam = isHome ? homeTeam : awayTeam;
    const target = isHome ? homeById : awayById;

    for (const row of [...entry.startXI, ...entry.substitutes]) {
      addApiPlayer(target, row.player, displayTeam, row.player.pos);
    }
  }

  const sortPlayers = (list: SquadPoolPlayer[]) =>
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return {
    home: sortPlayers(Array.from(homeById.values())),
    away: sortPlayers(Array.from(awayById.values()))
  };
}

async function findFixtureByTeams(homeTeam: string, awayTeam: string) {
  const wc = worldCupLeagueParams();
  const [next, last] = await Promise.all([
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, next: "40" }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, last: "40" })
  ]);

  const combined = [...next.response, ...last.response];
  const seen = new Set<number>();

  for (const fixture of combined) {
    if (seen.has(fixture.fixture.id)) continue;
    seen.add(fixture.fixture.id);
    const matchHome = fixture.teams.home.name;
    const matchAway = fixture.teams.away.name;
    if (teamsMatch(matchHome, homeTeam) && teamsMatch(matchAway, awayTeam)) return fixture;
    if (teamsMatch(matchHome, awayTeam) && teamsMatch(matchAway, homeTeam)) return fixture;
  }

  return null;
}

async function loadLineupsForFixtureId(fixtureId: number) {
  const payload = await fetchApiFootball<ApiFootballLineupTeam[]>("/fixtures/lineups", {
    fixture: String(fixtureId)
  });
  return payload.response ?? [];
}

async function loadSquadListsForFixture(fixture: ApiFootballFixture, homeTeam: string, awayTeam: string) {
  const wc = worldCupLeagueParams();
  const homeById = new Map<number, SquadPoolPlayer>();
  const awayById = new Map<number, SquadPoolPlayer>();

  const apiSides = [fixture.teams.home, fixture.teams.away];

  for (const apiTeam of apiSides) {
    const displayTeam = teamsMatch(apiTeam.name, homeTeam)
      ? homeTeam
      : teamsMatch(apiTeam.name, awayTeam)
        ? awayTeam
        : null;
    if (!displayTeam) continue;

    const target = teamsMatch(displayTeam, homeTeam) ? homeById : awayById;

    try {
      const squads = await fetchApiFootball<ApiFootballSquadTeam[]>("/players/squads", {
        team: String(apiTeam.id),
        season: wc.season
      });
      for (const entry of squads.response ?? []) {
        if (!teamsMatch(entry.team.name, displayTeam) && !teamsMatch(entry.team.name, apiTeam.name)) continue;
        for (const player of entry.players ?? []) {
          addApiPlayer(target, player, displayTeam, player.position);
        }
      }
    } catch {
      /* squad list may not be published yet */
    }
  }

  const sortPlayers = (list: SquadPoolPlayer[]) =>
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return {
    home: sortPlayers(Array.from(homeById.values())),
    away: sortPlayers(Array.from(awayById.values()))
  };
}

export type ApiFootballSquadLoadResult = {
  home: SquadPoolPlayer[];
  away: SquadPoolPlayer[];
  fixtureId: number;
  matchLabel: string;
  usedLineups: boolean;
  usedSquads: boolean;
};

/**
 * Load squad players from API-Football lineups (and squad lists when lineups are empty).
 * Returns null when API-Football is not configured or no fixture can be resolved.
 */
export async function loadApiFootballFixtureSquads(
  homeTeam: string,
  awayTeam: string,
  fixtureKey?: string | null
): Promise<ApiFootballSquadLoadResult | null> {
  if (!getApiFootballConfig().keyConfigured) return null;

  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (!home || !away) return null;

  let fixture: ApiFootballFixture | null = null;
  const fromKey = parseApiFootballFixtureId(fixtureKey);
  if (fromKey) {
    try {
      const payload = await fetchApiFootball<ApiFootballFixture[]>("/fixtures", { id: String(fromKey) });
      fixture = payload.response[0] ?? null;
    } catch {
      fixture = null;
    }
  }

  if (!fixture) {
    try {
      fixture = await findFixtureByTeams(home, away);
    } catch {
      return null;
    }
  }

  if (!fixture) return null;

  let usedLineups = false;
  let usedSquads = false;
  let homePlayers: SquadPoolPlayer[] = [];
  let awayPlayers: SquadPoolPlayer[] = [];

  try {
    const lineups = await loadLineupsForFixtureId(fixture.fixture.id);
    if (lineups.length) {
      const fromLineups = playersFromLineupTeams(lineups, home, away);
      homePlayers = fromLineups.home;
      awayPlayers = fromLineups.away;
      usedLineups = homePlayers.length > 0 || awayPlayers.length > 0;
    }
  } catch {
    /* lineups not published */
  }

  if (!homePlayers.length || !awayPlayers.length) {
    try {
      const fromSquads = await loadSquadListsForFixture(fixture, home, away);
      if (!homePlayers.length && fromSquads.home.length) {
        homePlayers = fromSquads.home;
        usedSquads = true;
      }
      if (!awayPlayers.length && fromSquads.away.length) {
        awayPlayers = fromSquads.away;
        usedSquads = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (!homePlayers.length && !awayPlayers.length) return null;

  return {
    home: homePlayers,
    away: awayPlayers,
    fixtureId: fixture.fixture.id,
    matchLabel: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
    usedLineups,
    usedSquads
  };
}

type ApiFootballTeamEntry = {
  team: { id: number; name: string; national?: boolean };
};

type ApiFootballLeaguePlayer = {
  player: { id: number; name: string };
  statistics: { games: { number: number | null; position: string | null } }[];
};

let worldCupTeamsCache: { loadedAt: number; teams: ApiFootballTeamEntry[] } | null = null;
const WORLD_CUP_TEAMS_CACHE_MS = 60 * 60 * 1000;

async function listWorldCupTeamsFromApi() {
  const now = Date.now();
  if (worldCupTeamsCache && now - worldCupTeamsCache.loadedAt < WORLD_CUP_TEAMS_CACHE_MS) {
    return worldCupTeamsCache.teams;
  }

  const wc = worldCupLeagueParams();
  const payload = await fetchApiFootball<ApiFootballTeamEntry[]>("/teams", wc);
  const teams = payload.response ?? [];
  worldCupTeamsCache = { loadedAt: now, teams };
  return teams;
}

async function resolveApiFootballTeamId(teamName: string) {
  const trimmed = teamName.trim();
  if (!trimmed) return null;

  const wcTeams = await listWorldCupTeamsFromApi();
  const fromLeague = wcTeams.find((entry) => teamsMatch(entry.team.name, trimmed));
  if (fromLeague) return fromLeague.team.id;

  const searchTerm = trimmed.length > 12 ? trimmed.slice(0, 12) : trimmed;
  try {
    const payload = await fetchApiFootball<ApiFootballTeamEntry[]>("/teams", { search: searchTerm });
    const candidates = (payload.response ?? []).filter(
      (entry) => entry.team.national !== false && teamsMatch(entry.team.name, trimmed)
    );
    return candidates[0]?.team.id ?? null;
  } catch {
    return null;
  }
}

async function loadSquadListForTeamId(teamId: number, displayTeamName: string) {
  const wc = worldCupLeagueParams();
  const byId = new Map<number, SquadPoolPlayer>();

  try {
    const squads = await fetchApiFootball<ApiFootballSquadTeam[]>("/players/squads", {
      team: String(teamId),
      season: wc.season
    });
    for (const entry of squads.response ?? []) {
      for (const player of entry.players ?? []) {
        addApiPlayer(byId, player, displayTeamName, player.position);
      }
    }
  } catch {
    /* squad list may not be published */
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

async function loadLeaguePlayersForTeamId(teamId: number, displayTeamName: string) {
  const wc = worldCupLeagueParams();
  const byId = new Map<number, SquadPoolPlayer>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 6) {
    const payload = await fetchApiFootball<ApiFootballLeaguePlayer[]>("/players", {
      league: wc.league,
      season: wc.season,
      team: String(teamId),
      page: String(page)
    });

    const paging = (payload as { paging?: { total?: number } }).paging;
    totalPages = paging?.total ?? 1;

    for (const row of payload.response ?? []) {
      const stats = row.statistics?.[0];
      const number = stats?.games?.number ?? null;
      const position = stats?.games?.position ?? null;
      addApiPlayer(
        byId,
        { id: row.player.id, name: row.player.name, number, pos: position },
        displayTeamName,
        position
      );
    }

    if (!payload.response?.length) break;
    page += 1;
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

async function loadRecentLineupPlayersForTeamId(teamId: number, displayTeamName: string) {
  const wc = worldCupLeagueParams();
  const byId = new Map<number, SquadPoolPlayer>();

  try {
    const fixtures = await fetchApiFootball<ApiFootballFixture[]>("/fixtures", {
      team: String(teamId),
      last: "12"
    });

    for (const fixture of fixtures.response ?? []) {
      if (byId.size >= 26) break;
      try {
        const lineups = await loadLineupsForFixtureId(fixture.fixture.id);
        for (const entry of lineups) {
          if (!teamsMatch(entry.team.name, displayTeamName)) continue;
          for (const row of [...entry.startXI, ...entry.substitutes]) {
            addApiPlayer(byId, row.player, displayTeamName, row.player.pos);
          }
        }
      } catch {
        /* skip fixture */
      }
    }
  } catch {
    return [];
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export type ApiFootballTeamSquadResult = {
  players: SquadPoolPlayer[];
  teamId: number;
  usedSquads: boolean;
  usedLeaguePlayers: boolean;
  usedRecentLineups: boolean;
};

/**
 * Load a national-team squad by team name (World Cup league roster, league player list, or recent lineups).
 */
export async function loadApiFootballTeamSquad(teamName: string): Promise<ApiFootballTeamSquadResult | null> {
  if (!getApiFootballConfig().keyConfigured) return null;

  const displayTeam = teamName.trim();
  if (!displayTeam) return null;

  let teamId: number | null = null;
  try {
    teamId = await resolveApiFootballTeamId(displayTeam);
  } catch {
    return null;
  }
  if (!teamId) return null;

  let players = await loadSquadListForTeamId(teamId, displayTeam);
  let usedSquads = players.length > 0;
  let usedLeaguePlayers = false;
  let usedRecentLineups = false;

  if (players.length < 11) {
    try {
      const fromLeague = await loadLeaguePlayersForTeamId(teamId, displayTeam);
      if (fromLeague.length > players.length) {
        players = fromLeague;
        usedLeaguePlayers = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (players.length < 11) {
    try {
      const fromLineups = await loadRecentLineupPlayersForTeamId(teamId, displayTeam);
      if (fromLineups.length > players.length) {
        players = fromLineups;
        usedRecentLineups = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (!players.length) return null;

  return { players, teamId, usedSquads, usedLeaguePlayers, usedRecentLineups };
}
