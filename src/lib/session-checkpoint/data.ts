import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";
import {
  getCurrentWorldCupFeedCached,
  parseWorldCupFixtureDate
} from "@/lib/feeds/current-world-cup";
import { fixtureKeyToShortLabel, formatFixtureTeamsLabel } from "@/lib/fixtures/fixture-key";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";
import {
  getPredictionsWalletSummary,
  listUserFixturePredictions,
  type PredictionPickSummary,
  type PredictionsWalletSummary
} from "@/lib/fixture-predictions/overview";
import { query } from "@/lib/db";
import { outcomeShort } from "@/lib/fixture-predictions/types";

const MAX_UPCOMING = 8;
/** Show fixtures through the next month (WC group stage spans ~5 weeks). */
const UPCOMING_WINDOW_MS = 1000 * 60 * 60 * 24 * 45;
const PAST_GRACE_MS = 1000 * 60 * 60 * 3;

export type SessionCheckpointFixture = {
  fixtureKey: string;
  label: string;
  shortLabel: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string | null;
  group: string | null;
  hasPrediction: boolean;
};

export type SessionCheckpointRecentPick = {
  fixtureKey: string;
  fixtureLabel: string;
  summary: string;
  pointsEarned: number;
  updatedAt: string;
};

export type SessionCheckpointPayload = {
  upcoming: SessionCheckpointFixture[];
  wallet: PredictionsWalletSummary;
  recentPicks: SessionCheckpointRecentPick[];
};

async function userPredictionFixtureKeys(userId: string) {
  const result = await query<{ fixture_key: string }>(
    `SELECT fixture_key FROM fixture_predictions WHERE user_id = $1`,
    [userId]
  );
  return new Set(result.rows.map((row) => row.fixture_key));
}

function mapApiLiveFixture(fixture: ApiFootballFixture) {
  const short = fixture.fixture.status.short;
  const isFinished = short === "FT" || short === "AET" || short === "PEN";
  const isLive = short === "1H" || short === "2H" || short === "HT" || short === "ET" || short === "LIVE";
  return {
    fixtureId: fixture.fixture.id,
    date: fixture.fixture.date,
    status: { short: isFinished ? "FT" : isLive ? short : "NS" },
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeGoals: fixture.goals.home,
    awayGoals: fixture.goals.away
  };
}

function worldCupLeagueParams() {
  return {
    league: process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1",
    season: process.env.API_FOOTBALL_SEASON?.trim() || "2026"
  };
}

async function loadLiveAndApiOptions(): Promise<FixtureOption[]> {
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

function isCheckpointRelevant(option: FixtureOption, now: number) {
  if (option.status === "finished") return false;
  if (option.status === "live") return true;

  const kickoff = parseWorldCupFixtureDate(option.date);
  if (!kickoff) return true;
  const kickoffMs = kickoff.getTime();
  if (kickoffMs < now - PAST_GRACE_MS) return false;
  if (kickoffMs > now + UPCOMING_WINDOW_MS) return false;
  return true;
}

function toCheckpointFixture(option: FixtureOption): SessionCheckpointFixture {
  const kickoff = parseWorldCupFixtureDate(option.date);
  const teamsLabel =
    formatFixtureTeamsLabel(option.homeTeam, option.awayTeam) || fixtureKeyToShortLabel(option.key);
  return {
    fixtureKey: option.key,
    label: option.label,
    shortLabel: teamsLabel,
    homeTeam: option.homeTeam,
    awayTeam: option.awayTeam,
    kickoff: kickoff?.toISOString() ?? null,
    group: option.group,
    hasPrediction: false
  };
}

function teamLabelForFixtureKey(options: FixtureOption[], fixtureKey: string) {
  const match = options.find((option) => option.key === fixtureKey);
  if (!match) return fixtureKeyToShortLabel(fixtureKey);
  return formatFixtureTeamsLabel(match.homeTeam, match.awayTeam) || fixtureKeyToShortLabel(fixtureKey);
}

export async function listUpcomingCheckpointFixtures(): Promise<SessionCheckpointFixture[]> {
  const now = Date.now();
  const options = await loadLiveAndApiOptions();

  const items = options
    .filter((option) => isCheckpointRelevant(option, now))
    .map((option) => {
      const kickoff = parseWorldCupFixtureDate(option.date);
      const kickoffMs =
        option.status === "live"
          ? now - 1
          : kickoff?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return { kickoffMs, fixture: toCheckpointFixture(option) };
    });

  items.sort((a, b) => a.kickoffMs - b.kickoffMs);
  return items.slice(0, MAX_UPCOMING).map((entry) => entry.fixture);
}

function summarizePick(pick: PredictionPickSummary): SessionCheckpointRecentPick {
  const parts: string[] = [];
  if (pick.predictedOutcome) {
    parts.push(outcomeShort(pick.predictedOutcome));
  }
  if (pick.homeScore !== null && pick.awayScore !== null) {
    parts.push(`${pick.homeScore}–${pick.awayScore}`);
  }

  const pointsEarned =
    pick.outcomePointsAwarded + pick.scorePointsAwarded + pick.scorersPointsAwarded;

  return {
    fixtureKey: pick.fixtureKey,
    fixtureLabel: pick.fixtureLabel,
    summary: parts.length ? parts.join(" · ") : "Picks saved",
    pointsEarned,
    updatedAt: pick.updatedAt
  };
}

export async function getSessionCheckpointPayload(userId: string): Promise<SessionCheckpointPayload> {
  const [fixtureOptions, wallet, recentRows, predictedKeys] = await Promise.all([
    loadLiveAndApiOptions(),
    getPredictionsWalletSummary(userId),
    listUserFixturePredictions(userId, 5),
    userPredictionFixtureKeys(userId)
  ]);

  const now = Date.now();
  const upcoming = fixtureOptions
    .filter((option) => isCheckpointRelevant(option, now))
    .map((option) => {
      const kickoff = parseWorldCupFixtureDate(option.date);
      const kickoffMs =
        option.status === "live" ? now - 1 : kickoff?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return { kickoffMs, fixture: toCheckpointFixture(option) };
    })
    .sort((a, b) => a.kickoffMs - b.kickoffMs)
    .slice(0, MAX_UPCOMING)
    .map((entry) => entry.fixture);

  const upcomingWithFlags = upcoming.map((fixture) => ({
    ...fixture,
    hasPrediction: predictedKeys.has(fixture.fixtureKey)
  }));

  return {
    upcoming: upcomingWithFlags,
    wallet,
    recentPicks: recentRows.map((pick) => ({
      ...summarizePick(pick),
      fixtureLabel: teamLabelForFixtureKey(fixtureOptions, pick.fixtureKey)
    }))
  };
}
