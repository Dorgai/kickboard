import {
  fetchApiFootball,
  worldCupLeagueParams,
  type ApiFootballFixture
} from "@/lib/api-football";

const DATE_WINDOW_PAST_DAYS = 14;
const DATE_WINDOW_FUTURE_DAYS = 21;
const MAX_DATE_LOOKUPS = 10;

function worldCupFixtureDateWindow() {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - DATE_WINDOW_PAST_DAYS);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + DATE_WINDOW_FUTURE_DAYS);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  };
}

export function mergeApiFootballFixturesById(fixtures: ApiFootballFixture[]) {
  const byId = new Map<number, ApiFootballFixture>();
  for (const fixture of fixtures) {
    byId.set(fixture.fixture.id, fixture);
  }
  return Array.from(byId.values());
}

function worldCupLeagueId() {
  return Number(worldCupLeagueParams().league) || 1;
}

function filterWorldCupFixtures(fixtures: ApiFootballFixture[]) {
  const leagueId = worldCupLeagueId();
  return fixtures.filter((fixture) => fixture.league.id === leagueId);
}

async function fetchFixturePayload(searchParams: Record<string, string>) {
  try {
    const payload = await fetchApiFootball<ApiFootballFixture[]>("/fixtures", searchParams);
    if (Array.isArray(payload.errors) && payload.errors.length > 0) return [];
    return payload.response ?? [];
  } catch {
    return [];
  }
}

/** Targeted per-day lookups (used when league/season bulk calls return nothing). */
export async function fetchWorldCupFixturesForDates(dates: string[]) {
  const wc = worldCupLeagueParams();
  const unique = [...new Set(dates.filter(Boolean))].slice(0, MAX_DATE_LOOKUPS);
  if (!unique.length) return [];

  const batches = await Promise.all(
    unique.map(async (date) => {
      const withLeague = await fetchFixturePayload({ ...wc, date });
      if (withLeague.length) return withLeague;

      const globalDay = await fetchFixturePayload({ date });
      return filterWorldCupFixtures(globalDay);
    })
  );

  return mergeApiFootballFixturesById(batches.flat());
}

/** Live fixtures worldwide, filtered to the configured World Cup league. */
export async function fetchLiveApiFootballFixtures() {
  const global = await fetchFixturePayload({ live: "all" });
  return filterWorldCupFixtures(global);
}

/** Live, recently finished, upcoming, and date-window World Cup fixtures (deduped by id). */
export async function fetchWorldCupApiFixtures(): Promise<ApiFootballFixture[]> {
  const wc = worldCupLeagueParams();
  const window = worldCupFixtureDateWindow();

  const settled = await Promise.allSettled([
    fetchFixturePayload({ live: "all" }),
    fetchFixturePayload({ ...wc, last: "40" }),
    fetchFixturePayload({ ...wc, next: "40" }),
    fetchFixturePayload({ ...wc, from: window.from, to: window.to }),
    fetchFixturePayload({ ...wc, status: "FT" }),
    fetchFixturePayload({ ...wc })
  ]);

  let merged = mergeApiFootballFixturesById(
    settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  );

  if (!merged.length) {
    const rollingDates: string[] = [];
    const now = new Date();
    for (let offset = -DATE_WINDOW_PAST_DAYS; offset <= 3; offset++) {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() + offset);
      rollingDates.push(day.toISOString().slice(0, 10));
    }
    merged = await fetchWorldCupFixturesForDates(rollingDates);
  }

  return merged;
}
