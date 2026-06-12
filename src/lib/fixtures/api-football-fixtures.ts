import {
  fetchApiFootball,
  worldCupLeagueParams,
  type ApiFootballFixture
} from "@/lib/api-football";

const DATE_WINDOW_PAST_DAYS = 14;
const DATE_WINDOW_FUTURE_DAYS = 21;

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

/** Live, recently finished, upcoming, and date-window World Cup fixtures (deduped by id). */
export async function fetchWorldCupApiFixtures(): Promise<ApiFootballFixture[]> {
  const wc = worldCupLeagueParams();
  const window = worldCupFixtureDateWindow();

  const [livePayload, lastPayload, nextPayload, windowPayload, finishedPayload] = await Promise.all([
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, last: "40" }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, next: "40" }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, from: window.from, to: window.to }),
    fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, status: "FT" })
  ]);

  let merged = mergeApiFootballFixturesById([
    ...livePayload.response,
    ...lastPayload.response,
    ...nextPayload.response,
    ...windowPayload.response,
    ...finishedPayload.response
  ]);

  if (!merged.length) {
    const seasonPayload = await fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc });
    merged = mergeApiFootballFixturesById(seasonPayload.response);
  }

  return merged;
}
