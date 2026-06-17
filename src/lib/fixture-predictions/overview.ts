import { query } from "@/lib/db";
import { enrichPredictionPickWithFinishedMatch } from "@/lib/fixture-predictions/enrich-picks";
import { buildFinishedMatchIndex } from "@/lib/fixture-predictions/finished-match-index";
import { listAcceptedPeerIds } from "@/lib/connections/store";
import {
  listApiFootballFixtureKeysForTeams,
  teamsUsableForApiFootballLookup
} from "@/lib/fixtures/fixture-key-query";
import {
  dedupeConnectionPredictionsByUser,
  fixtureKeyMatchQueryParams,
  fixtureKeyMatchSql,
  resolveFixtureKeyMatchParams
} from "@/lib/fixtures/fixture-key-match";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import {
  normalizeResultStatus,
  parseScorerPicks,
  type FixtureOutcome,
  type PredictionCategory,
  type PredictionResultStatus,
  type ScorerPick
} from "@/lib/fixture-predictions/types";

export type CategoryStats = {
  won: number;
  lost: number;
  pending: number;
  points: number;
};

export type PredictionsWalletSummary = {
  balance: number;
  pointsWon: number;
  pointsLost: number;
  picksWon: number;
  picksLost: number;
  picksPending: number;
  byCategory: Record<PredictionCategory, CategoryStats>;
};

export type PredictionPickSummary = {
  id: string;
  fixtureKey: string;
  fixtureLabel: string;
  predictedOutcome: FixtureOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: ScorerPick[];
  outcomeStatus: PredictionResultStatus;
  scoreStatus: PredictionResultStatus;
  scorersStatus: PredictionResultStatus;
  outcomePointsAwarded: number;
  scorePointsAwarded: number;
  scorersPointsAwarded: number;
  updatedAt: string;
};

export type ConnectionPredictionSummary = PredictionPickSummary & {
  userId: string;
  username: string;
  displayName: string;
};

export type PredictionsOverview = {
  wallet: PredictionsWalletSummary;
  myPredictions: PredictionPickSummary[];
  connectionsPredictions: ConnectionPredictionSummary[];
};

type PredictionRow = {
  id: string;
  user_id: string;
  fixture_key: string;
  predicted_outcome: string | null;
  home_score: number | null;
  away_score: number | null;
  scorer_picks: unknown;
  outcome_status: string;
  score_status: string;
  scorers_status: string;
  outcome_points_awarded: number;
  score_points_awarded: number;
  scorers_points_awarded: number;
  result_status: string | null;
  points_awarded: number | null;
  updated_at: Date;
  username?: string;
  display_name?: string | null;
};

function emptyCategoryStats(): CategoryStats {
  return { won: 0, lost: 0, pending: 0, points: 0 };
}

function tallyStatus(stats: CategoryStats, status: PredictionResultStatus, points: number) {
  if (status === "won" || status === "partial") {
    stats.won += 1;
    stats.points += points;
  } else if (status === "lost") {
    stats.lost += 1;
  } else if (status !== "void") {
    stats.pending += 1;
  }
}

function mapPick(row: PredictionRow): PredictionPickSummary {
  const legacyScoreStatus = row.result_status ? normalizeResultStatus(row.result_status) : null;
  const scoreStatus = normalizeResultStatus(row.score_status ?? legacyScoreStatus ?? "pending");
  const scorePoints = row.score_points_awarded ?? row.points_awarded ?? 0;

  return {
    id: row.id,
    fixtureKey: row.fixture_key,
    fixtureLabel: fixtureKeyToShortLabel(row.fixture_key),
    predictedOutcome:
      row.predicted_outcome === "home" || row.predicted_outcome === "draw" || row.predicted_outcome === "away"
        ? row.predicted_outcome
        : null,
    homeScore: row.home_score,
    awayScore: row.away_score,
    scorerPicks: parseScorerPicks(row.scorer_picks),
    outcomeStatus: normalizeResultStatus(row.outcome_status),
    scoreStatus,
    scorersStatus: normalizeResultStatus(row.scorers_status),
    outcomePointsAwarded: row.outcome_points_awarded ?? 0,
    scorePointsAwarded: scorePoints,
    scorersPointsAwarded: row.scorers_points_awarded ?? 0,
    updatedAt: row.updated_at.toISOString()
  };
}

const SELECT_FIELDS = `id, user_id, fixture_key, predicted_outcome, home_score, away_score, scorer_picks,
  COALESCE(outcome_status, 'pending') AS outcome_status,
  COALESCE(score_status, result_status, 'pending') AS score_status,
  COALESCE(scorers_status, 'pending') AS scorers_status,
  COALESCE(outcome_points_awarded, 0) AS outcome_points_awarded,
  COALESCE(score_points_awarded, points_awarded, 0) AS score_points_awarded,
  COALESCE(scorers_points_awarded, 0) AS scorers_points_awarded,
  result_status, points_awarded, updated_at`;

export async function getPredictionsWalletSummary(userId: string): Promise<PredictionsWalletSummary> {
  const user = await query<{ points_balance: number }>(
    `SELECT points_balance FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const balance = user.rows[0]?.points_balance ?? 0;

  const picks = await query<{
    predicted_outcome: string | null;
    home_score: number | null;
    away_score: number | null;
    scorer_picks: unknown;
    outcome_status: string;
    score_status: string;
    scorers_status: string;
    outcome_points_awarded: number;
    score_points_awarded: number;
    scorers_points_awarded: number;
    result_status: string | null;
    points_awarded: number | null;
  }>(
    `SELECT predicted_outcome, home_score, away_score, scorer_picks,
            COALESCE(outcome_status, 'pending') AS outcome_status,
            COALESCE(score_status, result_status, 'pending') AS score_status,
            COALESCE(scorers_status, 'pending') AS scorers_status,
            COALESCE(outcome_points_awarded, 0) AS outcome_points_awarded,
            COALESCE(score_points_awarded, points_awarded, 0) AS score_points_awarded,
            COALESCE(scorers_points_awarded, 0) AS scorers_points_awarded,
            result_status, points_awarded
     FROM fixture_predictions WHERE user_id = $1`,
    [userId]
  );

  const byCategory: Record<PredictionCategory, CategoryStats> = {
    outcome: emptyCategoryStats(),
    score: emptyCategoryStats(),
    scorers: emptyCategoryStats()
  };

  let picksWon = 0;
  let picksLost = 0;
  let picksPending = 0;

  for (const row of picks.rows) {
    const pick = mapPick({
      id: "",
      user_id: userId,
      fixture_key: "",
      predicted_outcome: row.predicted_outcome,
      home_score: row.home_score,
      away_score: row.away_score,
      scorer_picks: row.scorer_picks,
      outcome_status: row.outcome_status,
      score_status: row.score_status,
      scorers_status: row.scorers_status,
      outcome_points_awarded: row.outcome_points_awarded,
      score_points_awarded: row.score_points_awarded,
      scorers_points_awarded: row.scorers_points_awarded,
      result_status: row.result_status,
      points_awarded: row.points_awarded,
      updated_at: new Date()
    });

    if (pick.predictedOutcome) {
      tallyStatus(byCategory.outcome, pick.outcomeStatus, pick.outcomePointsAwarded);
    }
    if (pick.homeScore !== null && pick.awayScore !== null) {
      tallyStatus(byCategory.score, pick.scoreStatus, pick.scorePointsAwarded);
    }
    if (pick.scorerPicks.length > 0) {
      tallyStatus(byCategory.scorers, pick.scorersStatus, pick.scorersPointsAwarded);
    }

    const statuses = [
      pick.predictedOutcome ? pick.outcomeStatus : null,
      pick.homeScore !== null && pick.awayScore !== null ? pick.scoreStatus : null,
      pick.scorerPicks.length > 0 ? pick.scorersStatus : null
    ].filter(Boolean) as PredictionResultStatus[];

    for (const status of statuses) {
      if (status === "won" || status === "partial") picksWon += 1;
      else if (status === "lost") picksLost += 1;
      else if (status !== "void") picksPending += 1;
    }
  }

  const pointsWon =
    byCategory.outcome.points + byCategory.score.points + byCategory.scorers.points;

  return {
    balance,
    pointsWon,
    pointsLost: 0,
    picksWon,
    picksLost,
    picksPending,
    byCategory
  };
}

export async function listUserFixturePredictions(userId: string, limit = 20) {
  const result = await query<PredictionRow>(
    `SELECT ${SELECT_FIELDS}
     FROM fixture_predictions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => mapPick(row));
}

const CONNECTION_PREDICTION_SELECT = `SELECT fp.id, fp.user_id, fp.fixture_key, fp.predicted_outcome, fp.home_score, fp.away_score, fp.scorer_picks,
                COALESCE(fp.outcome_status, 'pending') AS outcome_status,
                COALESCE(fp.score_status, fp.result_status, 'pending') AS score_status,
                COALESCE(fp.scorers_status, 'pending') AS scorers_status,
                COALESCE(fp.outcome_points_awarded, 0) AS outcome_points_awarded,
                COALESCE(fp.score_points_awarded, fp.points_awarded, 0) AS score_points_awarded,
                COALESCE(fp.scorers_points_awarded, 0) AS scorers_points_awarded,
                fp.result_status, fp.points_awarded, fp.updated_at,
                u.username, u.display_name`;

export async function listConnectionsFixturePredictions(
  userId: string,
  options?: {
    fixtureKey?: string;
    homeTeam?: string;
    awayTeam?: string;
    limit?: number;
  }
) {
  const peerIds = await listAcceptedPeerIds(userId);
  if (!peerIds.length) return [];

  const limit = options?.limit ?? 30;
  const match = resolveFixtureKeyMatchParams({
    fixtureKey: options?.fixtureKey,
    homeTeam: options?.homeTeam,
    awayTeam: options?.awayTeam
  });

  const result = match
    ? await (async () => {
        const homeTeam = options?.homeTeam?.trim() ?? "";
        const awayTeam = options?.awayTeam?.trim() ?? "";
        const apiKeys =
          match.homeSlug &&
          match.awaySlug &&
          teamsUsableForApiFootballLookup(homeTeam, awayTeam)
            ? await listApiFootballFixtureKeysForTeams(homeTeam, awayTeam)
            : [];

        const { params } = fixtureKeyMatchQueryParams(peerIds, match, apiKeys, limit);
        const limitParam = params.length;
        const matchSql =
          match.homeSlug && match.awaySlug
            ? fixtureKeyMatchSql("fp.fixture_key")
            : "fp.fixture_key = $2";
        return query<PredictionRow>(
          `${CONNECTION_PREDICTION_SELECT}
         FROM fixture_predictions fp
         INNER JOIN users u ON u.id = fp.user_id
         WHERE fp.user_id = ANY($1::uuid[])
           AND ${matchSql}
         ORDER BY fp.updated_at DESC
         LIMIT $${limitParam}`,
          [...params]
        );
      })()
    : await query<PredictionRow>(
        `${CONNECTION_PREDICTION_SELECT}
         FROM fixture_predictions fp
         INNER JOIN users u ON u.id = fp.user_id
         WHERE fp.user_id = ANY($1::uuid[])
         ORDER BY fp.updated_at DESC
         LIMIT $2`,
        [peerIds, limit]
      );

  const mapped = result.rows.map((row) => ({
    ...mapPick(row),
    userId: row.user_id,
    username: row.username ?? "fan",
    displayName: row.display_name ?? row.username ?? "Fan"
  }));

  return match ? dedupeConnectionPredictionsByUser(mapped) : mapped;
}

export async function getPredictionsOverview(
  userId: string,
  options?: { fixtureKey?: string; homeTeam?: string; awayTeam?: string }
) {
  const [wallet, myPredictions, connectionsPredictions, matchIndex] = await Promise.all([
    getPredictionsWalletSummary(userId),
    listUserFixturePredictions(userId),
    listConnectionsFixturePredictions(userId, options),
    buildFinishedMatchIndex()
  ]);

  const enrichedMine = myPredictions.map((pick) =>
    enrichPredictionPickWithFinishedMatch(pick, matchIndex)
  );
  const enrichedConnections = connectionsPredictions.map((pick) =>
    enrichPredictionPickWithFinishedMatch(pick, matchIndex)
  );

  return { wallet, myPredictions: enrichedMine, connectionsPredictions: enrichedConnections };
}
