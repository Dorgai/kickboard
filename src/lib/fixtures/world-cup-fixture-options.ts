import {
  fetchApiFootball,
  getApiFootballConfig,
  mapApiFootballStatusShort,
  worldCupLeagueParams,
  type ApiFootballFixture
} from "@/lib/api-football";
import { getCurrentWorldCupFeedCached } from "@/lib/feeds/current-world-cup";
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
      const wc = worldCupLeagueParams();
      const [upcoming, live] = await Promise.all([
        fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, next: "25" }),
        fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" })
      ]);
      liveInputs = [...upcoming.response, ...live.response].map(mapApiLiveFixture);
    } catch {
      /* optional */
    }
  }

  return buildFixtureOptionsFromWorldCup(feed.groups, liveInputs);
}
