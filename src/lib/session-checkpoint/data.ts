import {
  getCurrentWorldCupFeedCached,
  parseWorldCupFixtureDate
} from "@/lib/feeds/current-world-cup";
import {
  buildWorldCupFixtureKey,
  fixtureKeyToShortLabel,
  formatFixtureLabel
} from "@/lib/fixtures/fixture-key";
import {
  getPredictionsWalletSummary,
  listUserFixturePredictions,
  type PredictionPickSummary,
  type PredictionsWalletSummary
} from "@/lib/fixture-predictions/overview";
import { query } from "@/lib/db";
import { outcomeShort } from "@/lib/fixture-predictions/types";

const MAX_UPCOMING = 8;
const UPCOMING_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;
const PAST_GRACE_MS = 1000 * 60 * 90;

export type SessionCheckpointFixture = {
  fixtureKey: string;
  label: string;
  shortLabel: string;
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

export async function listUpcomingCheckpointFixtures(): Promise<SessionCheckpointFixture[]> {
  const feed = await getCurrentWorldCupFeedCached();
  const now = Date.now();
  const cutoff = now + UPCOMING_WINDOW_MS;
  const items: { kickoffMs: number; fixture: SessionCheckpointFixture }[] = [];

  for (const group of feed.groups) {
    for (const fixture of group.fixtures) {
      const kickoff = parseWorldCupFixtureDate(fixture.date);
      if (!kickoff) continue;
      const kickoffMs = kickoff.getTime();
      if (kickoffMs < now - PAST_GRACE_MS) continue;
      if (kickoffMs > cutoff) continue;

      const fixtureKey = buildWorldCupFixtureKey({
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        date: fixture.date,
        group: group.group
      });

      items.push({
        kickoffMs,
        fixture: {
          fixtureKey,
          label: formatFixtureLabel({
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            date: fixture.date,
            group: group.group
          }),
          shortLabel: fixtureKeyToShortLabel(fixtureKey),
          kickoff: kickoff.toISOString(),
          group: group.group,
          hasPrediction: false
        }
      });
    }
  }

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
  const [upcoming, wallet, recentRows, predictedKeys] = await Promise.all([
    listUpcomingCheckpointFixtures(),
    getPredictionsWalletSummary(userId),
    listUserFixturePredictions(userId, 5),
    userPredictionFixtureKeys(userId)
  ]);

  const upcomingWithFlags = upcoming.map((fixture) => ({
    ...fixture,
    hasPrediction: predictedKeys.has(fixture.fixtureKey)
  }));

  return {
    upcoming: upcomingWithFlags,
    wallet,
    recentPicks: recentRows.map(summarizePick)
  };
}
