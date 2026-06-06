import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";
import { buildApiFootballFixtureKey } from "@/lib/fixtures/fixture-key";
import { teamsMatch } from "@/lib/squads/team-names";

const API_KEY_CACHE_TTL_MS = 60_000;
/** Do not block friends-picks queries on a slow upstream fixtures API. */
const API_KEY_LOOKUP_BUDGET_MS = 2_500;
const apiKeyCache = new Map<string, { expiresAt: number; keys: string[] }>();

function withLookupBudget<T>(promise: Promise<T>, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), API_KEY_LOOKUP_BUDGET_MS))
  ]);
}

/** Skip API-Football alias resolution when names are placeholders (e.g. api-football keys). */
export function teamsUsableForApiFootballLookup(homeTeam: string, awayTeam: string) {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (!home || !away) return false;
  const homeLower = home.toLowerCase();
  const awayLower = away.toLowerCase();
  if (homeLower === "home" && awayLower === "away") return false;
  if (homeLower === "tbd" || awayLower === "tbd") return false;
  return true;
}

function worldCupLeagueParams() {
  return {
    league: process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1",
    season: process.env.API_FOOTBALL_SEASON?.trim() || "2026"
  };
}

function fixtureMatchesTeams(fixture: ApiFootballFixture, homeTeam: string, awayTeam: string) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  return (
    (teamsMatch(home, homeTeam) && teamsMatch(away, awayTeam)) ||
    (teamsMatch(home, awayTeam) && teamsMatch(away, homeTeam))
  );
}

function apiKeyCacheKey(homeTeam: string, awayTeam: string) {
  return `${homeTeam.toLowerCase()}\0${awayTeam.toLowerCase()}`;
}

async function fetchApiFootballFixtureKeysForTeams(
  homeTeam: string,
  awayTeam: string
): Promise<string[]> {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (!home || !away) return [];

  const { keyConfigured } = getApiFootballConfig();
  if (!keyConfigured) return [];

  const wc = worldCupLeagueParams();

  const [recent, live, upcoming] = await Promise.all([
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, last: "40" }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, next: "40" })
  ]);

  const keys = new Set<string>();
  for (const fixture of [...recent.response, ...live.response, ...upcoming.response]) {
    if (fixtureMatchesTeams(fixture, home, away)) {
      keys.add(buildApiFootballFixtureKey(fixture.fixture.id));
    }
  }
  return [...keys];
}

/** Resolve API-Football fixture keys that refer to the same teams (legacy picks). */
export async function listApiFootballFixtureKeysForTeams(
  homeTeam: string,
  awayTeam: string
): Promise<string[]> {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (!home || !away) return [];

  const cacheKey = apiKeyCacheKey(home, away);
  const cached = apiKeyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  try {
    const keys = await withLookupBudget(
      fetchApiFootballFixtureKeysForTeams(home, away),
      cached?.keys ?? []
    );
    if (keys.length > 0) {
      apiKeyCache.set(cacheKey, { keys, expiresAt: Date.now() + API_KEY_CACHE_TTL_MS });
    } else if (cached) {
      return cached.keys;
    }
    return keys;
  } catch {
    return cached?.keys ?? [];
  }
}
