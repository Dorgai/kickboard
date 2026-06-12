import { getApiFootballConfig, mapApiFootballStatusShort, type ApiFootballFixture } from "@/lib/api-football";
import { getCurrentWorldCupFeedCached } from "@/lib/feeds/current-world-cup";
import { fetchWorldCupApiFixtures } from "@/lib/fixtures/api-football-fixtures";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";

function mapApiLiveFixture(fixture: ApiFootballFixture) {
  const short = fixture.fixture.status.short;
  const mapped = mapApiFootballStatusShort(short);
  return {
    fixtureId: fixture.fixture.id,
    date: fixture.fixture.date,
    status: { short: mapped === "finished" ? "FT" : mapped === "live" ? short : "NS" },
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeGoals: fixture.goals.home,
    awayGoals: fixture.goals.away
  };
}

/** Merged Wikipedia schedule + optional API-Football live/upcoming status. */
export async function loadWorldCupFixtureOptions(): Promise<FixtureOption[]> {
  const feed = await getCurrentWorldCupFeedCached();
  let liveInputs: Parameters<typeof buildFixtureOptionsFromWorldCup>[1] = [];

  const { keyConfigured } = getApiFootballConfig();
  if (keyConfigured) {
    try {
      liveInputs = (await fetchWorldCupApiFixtures()).map(mapApiLiveFixture);
    } catch {
      /* optional */
    }
  }

  return buildFixtureOptionsFromWorldCup(feed.groups, liveInputs);
}
