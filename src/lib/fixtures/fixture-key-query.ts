import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";
import { buildApiFootballFixtureKey } from "@/lib/fixtures/fixture-key";
import { teamsMatch } from "@/lib/squads/team-names";

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

/** Resolve API-Football fixture keys that refer to the same teams (legacy picks). */
export async function listApiFootballFixtureKeysForTeams(
  homeTeam: string,
  awayTeam: string
): Promise<string[]> {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (!home || !away) return [];

  const { keyConfigured } = getApiFootballConfig();
  if (!keyConfigured) return [];

  const wc = worldCupLeagueParams();

  try {
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
  } catch {
    return [];
  }
}
