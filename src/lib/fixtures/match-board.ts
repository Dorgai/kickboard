import {
  getApiFootballConfig,
  mapApiFootballStatusShort,
  type ApiFootballFixture
} from "@/lib/api-football";
import {
  fetchFixtureGoalEvents,
  parseApiFootballGoalEvents
} from "@/lib/api-football-events";
import { getCurrentWorldCupFeedCached } from "@/lib/feeds/current-world-cup";
import {
  fetchWorldCupApiFixtures,
  fetchWorldCupFixturesForDates,
  mergeApiFootballFixturesById
} from "@/lib/fixtures/api-football-fixtures";
import {
  buildApiFootballFixtureKey,
  buildWorldCupFixtureKey,
  parseApiFootballFixtureId,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";
import type { WorldCupGroupFixture } from "@/lib/feeds/current-world-cup";
import {
  fixtureUtcDay,
  inferFixtureStatusFromKickoff,
  kickoffInstant
} from "@/lib/fixtures/infer-fixture-status";
import type {
  MatchBoardCard,
  MatchBoardFixtureState,
  MatchBoardGoal,
  MatchBoardPayload
} from "@/lib/fixtures/match-board-shared";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";
import { teamsMatch } from "@/lib/squads/team-names";
import {
  readCachedFixtureGoalEvents,
  readCachedLiveFixtures
} from "@/lib/redis/live-fixtures-cache";

const STARTING_SOON_MS = 60 * 60 * 1000;
const RECENT_RESULT_MS = 7 * 24 * 60 * 60 * 1000;
const GOAL_SCORER_FETCH_LIMIT = 12;
const KICKOFF_MATCH_TOLERANCE_MS = 18 * 60 * 60 * 1000;

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

  const byTeams = apiRows.find(
    (entry) =>
      teamsMatch(entry.homeTeam, option.homeTeam) && teamsMatch(entry.awayTeam, option.awayTeam)
  );
  if (byTeams) return byTeams.fixtureId;

  const kickoff = kickoffInstant(option.date);
  if (kickoff == null) return null;

  const byKickoff = apiRows.find((entry) => {
    const apiKick = kickoffInstant(entry.date);
    if (apiKick == null) return false;
    if (Math.abs(apiKick - kickoff) > KICKOFF_MATCH_TOLERANCE_MS) return false;
    return (
      teamsMatch(entry.homeTeam, option.homeTeam) && teamsMatch(entry.awayTeam, option.awayTeam)
    );
  });
  return byKickoff?.fixtureId ?? null;
}

function toCard(
  option: FixtureOption,
  state: MatchBoardFixtureState,
  segment: "live" | "starting_soon" | "recent_result",
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
    goalScorers: state.goalScorers,
    segment
  };
}

async function loadGoalScorers(
  rows: ReturnType<typeof mapApiFixtureRow>[]
): Promise<Map<number, MatchBoardGoal[]>> {
  const map = new Map<number, MatchBoardGoal[]>();
  if (!rows.length) return map;

  const ids = rows.map((row) => row.fixtureId);
  const cached = await readCachedFixtureGoalEvents(ids);
  const missing: ReturnType<typeof mapApiFixtureRow>[] = [];

  for (const row of rows) {
    const events = cached.get(row.fixtureId);
    if (events) {
      map.set(row.fixtureId, parseApiFootballGoalEvents(events, row.homeTeamId, row.awayTeamId));
    } else {
      missing.push(row);
    }
  }

  await Promise.all(
    missing.slice(0, GOAL_SCORER_FETCH_LIMIT).map(async (row) => {
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

function isRecentResultRow(row: ReturnType<typeof mapApiFixtureRow>, now: number) {
  const status = mapApiFootballStatusShort(row.status.short);
  if (status !== "finished") return false;
  const kickoff = kickoffInstant(row.date);
  if (kickoff == null) return false;
  return now - kickoff <= RECENT_RESULT_MS;
}

export async function loadMatchBoard(): Promise<MatchBoardPayload> {
  const updatedAt = new Date().toISOString();
  const { keyConfigured } = getApiFootballConfig();

  if (!keyConfigured) {
    return {
      connected: false,
      message: "Live match board requires API_FOOTBALL_KEY on the web service.",
      updatedAt,
      live: [],
      startingSoon: [],
      recentResults: [],
      byKey: {}
    };
  }

  const feed = await getCurrentWorldCupFeedCached();
  let apiFixtures: ApiFootballFixture[] = [];

  try {
    const cachedLive = (await readCachedLiveFixtures()) ?? [];
    const fetched = await fetchWorldCupApiFixtures();
    apiFixtures = mergeApiFootballFixturesById([...cachedLive, ...fetched]);
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Unable to load live fixtures.",
      updatedAt,
      live: [],
      startingSoon: [],
      recentResults: [],
      byKey: {}
    };
  }

  let apiRows = apiFixtures.map(mapApiFixtureRow);
  const now = Date.now();

  const lookupDates = new Set<string>();
  for (const group of feed.groups) {
    for (const fixture of group.fixtures) {
      const kickoff = kickoffInstant(fixture.date);
      if (kickoff == null) continue;
      if (now - kickoff > RECENT_RESULT_MS) continue;
      const day = fixtureUtcDay(fixture.date);
      if (day) lookupDates.add(day);
    }
  }

  if (lookupDates.size) {
    const dated = await fetchWorldCupFixturesForDates([...lookupDates]);
    if (dated.length) {
      apiFixtures = mergeApiFootballFixturesById([...apiFixtures, ...dated]);
      apiRows = apiFixtures.map(mapApiFixtureRow);
    }
  }

  const scorerRows = apiRows.filter((row) => {
    const status = mapApiFootballStatusShort(row.status.short);
    return status === "live" || isRecentResultRow(row, now);
  });
  const goalScorersById = await loadGoalScorers(scorerRows);

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
  const feedFixtureByKey = new Map<string, WorldCupGroupFixture>();
  for (const group of feed.groups) {
    group.fixtures.forEach((fixture) => {
      const key = buildWorldCupFixtureKey({
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        date: fixture.date,
        group: group.group
      });
      if (!feedFixtureByKey.has(key)) {
        feedFixtureByKey.set(key, fixture);
      }
    });
  }

  const byKey: Record<string, MatchBoardFixtureState> = {};

  for (const option of options) {
    const fixtureId = fixtureIdForOption(option, apiRows);
    const apiRow = fixtureId ? apiRows.find((row) => row.fixtureId === fixtureId) : null;
    const feedFixture = feedFixtureByKey.get(option.key);
    const feedHasScore = feedFixture?.homeGoals != null && feedFixture?.awayGoals != null;
    const inferred = apiRow ? null : inferFixtureStatusFromKickoff(option.date, now);
    const status = apiRow
      ? mapApiFootballStatusShort(apiRow.status.short)
      : feedHasScore
        ? "finished"
        : inferred ?? option.status;
    const goalScorers =
      fixtureId && goalScorersById.has(fixtureId) ? goalScorersById.get(fixtureId)! : [];

    byKey[option.key] = {
      fixtureId,
      homeGoals: apiRow?.homeGoals ?? feedFixture?.homeGoals ?? option.homeGoals ?? null,
      awayGoals: apiRow?.awayGoals ?? feedFixture?.awayGoals ?? option.awayGoals ?? null,
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
  const recentResults: MatchBoardCard[] = [];

  for (const option of options) {
    const state = byKey[option.key];
    if (!state) continue;

    if (state.status === "live") {
      live.push(toCard(option, state, "live", null));
      continue;
    }

    if (state.status === "finished") {
      const kickoff = kickoffInstant(option.date);
      if (kickoff != null && now - kickoff <= RECENT_RESULT_MS) {
        recentResults.push(toCard(option, state, "recent_result", null));
      }
      continue;
    }

    if (state.status !== "upcoming") continue;
    const kickoff = kickoffInstant(option.date);
    if (kickoff == null) continue;
    const delta = kickoff - now;
    if (delta <= 0 || delta > STARTING_SOON_MS) continue;
    startingSoon.push(
      toCard(option, state, "starting_soon", Math.max(1, Math.ceil(delta / 60_000)))
    );
  }

  live.sort((a, b) => (a.elapsed ?? 0) - (b.elapsed ?? 0));
  startingSoon.sort((a, b) => (a.startsInMinutes ?? 0) - (b.startsInMinutes ?? 0));
  recentResults.sort((a, b) => {
    const aKick = kickoffInstant(a.date) ?? 0;
    const bKick = kickoffInstant(b.date) ?? 0;
    return bKick - aKick;
  });

  return {
    connected: true,
    provider: "API-Football",
    updatedAt,
    live,
    startingSoon,
    recentResults,
    byKey,
    apiFixtureCount: apiRows.length
  };
}
