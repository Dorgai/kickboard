import {
  fetchApiFootball,
  getApiFootballConfig,
  mapApiFootballStatusShort,
  type ApiFootballFixture,
  worldCupLeagueParams
} from "@/lib/api-football";
import {
  fetchFixtureGoalEvents,
  parseApiFootballGoalEvents
} from "@/lib/api-football-events";
import { getCurrentWorldCupFeedCached } from "@/lib/feeds/current-world-cup";
import {
  buildApiFootballFixtureKey,
  parseApiFootballFixtureId,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";
import type {
  MatchBoardCard,
  MatchBoardFixtureState,
  MatchBoardGoal,
  MatchBoardPayload
} from "@/lib/fixtures/match-board-shared";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";
import { teamsMatch } from "@/lib/squads/team-names";
import { readCachedFixtureGoalEvents, readCachedLiveFixtures } from "@/lib/redis/live-fixtures-cache";
import { parseWorldCupFixtureDate } from "@/lib/fixtures/fixture-date";

const STARTING_SOON_MS = 60 * 60 * 1000;

function kickoffMs(date: string | null) {
  if (!date?.trim()) return null;
  const fromFeed = parseWorldCupFixtureDate(date);
  if (fromFeed) return fromFeed.getTime();
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapApiFixtureRow(fixture: ApiFootballFixture) {
  const short = fixture.fixture.status.short;
  return {
    fixtureId: fixture.fixture.id,
    date: fixture.fixture.date,
    status: { short },
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeTeamId: fixture.teams.home.id,
    awayTeamId: fixture.teams.away.id,
    homeGoals: fixture.goals.home,
    awayGoals: fixture.goals.away,
    statusLong: fixture.fixture.status.long,
    elapsed: fixture.fixture.status.elapsed
  };
}

function fixtureIdForOption(option: FixtureOption, apiRows: ReturnType<typeof mapApiFixtureRow>[]) {
  const direct = parseApiFootballFixtureId(option.key);
  if (direct) return direct;
  const row = apiRows.find(
    (entry) =>
      teamsMatch(entry.homeTeam, option.homeTeam) && teamsMatch(entry.awayTeam, option.awayTeam)
  );
  return row?.fixtureId ?? null;
}

function toCard(
  option: FixtureOption,
  state: MatchBoardFixtureState,
  segment: "live" | "starting_soon",
  startsInMinutes: number | null
): MatchBoardCard {
  return {
    fixtureKey: option.key,
    fixtureId: state.fixtureId,
    homeTeam: option.homeTeam,
    awayTeam: option.awayTeam,
    group: option.group,
    date: option.date,
    homeGoals: state.homeGoals,
    awayGoals: state.awayGoals,
    status: state.status,
    statusShort: state.statusShort,
    statusLong: state.statusLong,
    elapsed: state.elapsed,
    startsInMinutes,
    goalScorers: state.goalScorers
  };
}

async function loadGoalScorers(
  liveRows: ReturnType<typeof mapApiFixtureRow>[]
): Promise<Map<number, MatchBoardGoal[]>> {
  const map = new Map<number, MatchBoardGoal[]>();
  if (!liveRows.length) return map;

  const ids = liveRows.map((row) => row.fixtureId);
  const cached = await readCachedFixtureGoalEvents(ids);
  const missing: ReturnType<typeof mapApiFixtureRow>[] = [];

  for (const row of liveRows) {
    const events = cached.get(row.fixtureId);
    if (events) {
      map.set(row.fixtureId, parseApiFootballGoalEvents(events, row.homeTeamId, row.awayTeamId));
    } else {
      missing.push(row);
    }
  }

  await Promise.all(
    missing.slice(0, 6).map(async (row) => {
      try {
        const goals = await fetchFixtureGoalEvents(row.fixtureId, row.homeTeamId, row.awayTeamId);
        map.set(row.fixtureId, goals);
      } catch {
        map.set(row.fixtureId, []);
      }
    })
  );

  return map;
}

export async function loadMatchBoard(): Promise<MatchBoardPayload> {
  const updatedAt = new Date().toISOString();
  const { keyConfigured, workerEnabled } = getApiFootballConfig();

  if (!keyConfigured || !workerEnabled) {
    return {
      connected: false,
      message:
        "Live match board requires API_FOOTBALL_KEY and KICKBOARD_WORKER_ENABLED=true on the web service.",
      updatedAt,
      live: [],
      startingSoon: [],
      byKey: {}
    };
  }

  const feed = await getCurrentWorldCupFeedCached();
  let apiFixtures: ApiFootballFixture[] = [];

  try {
    const cachedLive = await readCachedLiveFixtures();
    if (cachedLive?.length) {
      apiFixtures = cachedLive;
    } else {
      const wc = worldCupLeagueParams();
      const [livePayload, upcomingPayload] = await Promise.all([
        fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" }),
        fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, next: "40" })
      ]);
      const byId = new Map<number, ApiFootballFixture>();
      for (const fixture of [...livePayload.response, ...upcomingPayload.response]) {
        byId.set(fixture.fixture.id, fixture);
      }
      apiFixtures = Array.from(byId.values());
    }
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Unable to load live fixtures.",
      updatedAt,
      live: [],
      startingSoon: [],
      byKey: {}
    };
  }

  const apiRows = apiFixtures.map(mapApiFixtureRow);
  const liveRows = apiRows.filter((row) => mapApiFootballStatusShort(row.status.short) === "live");
  const goalScorersById = await loadGoalScorers(liveRows);

  const liveInputs = apiRows.map((row) => ({
    fixtureId: row.fixtureId,
    date: row.date,
    status: { short: row.status.short },
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeGoals: row.homeGoals,
    awayGoals: row.awayGoals
  }));

  const options = buildFixtureOptionsFromWorldCup(feed.groups, liveInputs);
  const byKey: Record<string, MatchBoardFixtureState> = {};
  const now = Date.now();

  for (const option of options) {
    const fixtureId = fixtureIdForOption(option, apiRows);
    const apiRow = fixtureId ? apiRows.find((row) => row.fixtureId === fixtureId) : null;
    const status = apiRow
      ? mapApiFootballStatusShort(apiRow.status.short)
      : option.status;
    const goalScorers =
      fixtureId && goalScorersById.has(fixtureId) ? goalScorersById.get(fixtureId)! : [];

    byKey[option.key] = {
      fixtureId,
      homeGoals: apiRow?.homeGoals ?? option.homeGoals ?? null,
      awayGoals: apiRow?.awayGoals ?? option.awayGoals ?? null,
      status,
      statusShort: apiRow?.status.short ?? (status === "live" ? "LIVE" : status === "finished" ? "FT" : "NS"),
      statusLong: apiRow?.statusLong ?? status,
      elapsed: apiRow?.elapsed ?? null,
      goalScorers
    };
  }

  for (const row of apiRows) {
    const key = buildApiFootballFixtureKey(row.fixtureId);
    if (byKey[key]) continue;
    const status = mapApiFootballStatusShort(row.status.short);
    byKey[key] = {
      fixtureId: row.fixtureId,
      homeGoals: row.homeGoals,
      awayGoals: row.awayGoals,
      status,
      statusShort: row.status.short,
      statusLong: row.statusLong,
      elapsed: row.elapsed,
      goalScorers: goalScorersById.get(row.fixtureId) ?? []
    };
  }

  const live: MatchBoardCard[] = [];
  const startingSoon: MatchBoardCard[] = [];

  for (const option of options) {
    const state = byKey[option.key];
    if (!state) continue;

    if (state.status === "live") {
      live.push(toCard(option, state, "live", null));
      continue;
    }

    if (state.status !== "upcoming") continue;
    const kickoff = kickoffMs(option.date);
    if (kickoff == null) continue;
    const delta = kickoff - now;
    if (delta <= 0 || delta > STARTING_SOON_MS) continue;
    startingSoon.push(
      toCard(option, state, "starting_soon", Math.max(1, Math.ceil(delta / 60_000)))
    );
  }

  live.sort((a, b) => (a.elapsed ?? 0) - (b.elapsed ?? 0));
  startingSoon.sort((a, b) => (a.startsInMinutes ?? 0) - (b.startsInMinutes ?? 0));

  return {
    connected: true,
    provider: "API-Football",
    updatedAt,
    live,
    startingSoon,
    byKey
  };
}
