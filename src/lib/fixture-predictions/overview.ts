import { query } from "@/lib/db";
import { listAcceptedPeerIds } from "@/lib/connections/store";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";

export type PredictionPickSummary = {
  id: string;
  fixtureKey: string;
  fixtureLabel: string;
  homeScore: number;
  awayScore: number;
  resultStatus: string;
  pointsAwarded: number;
  updatedAt: string;
};

export type ConnectionPredictionSummary = {
  userId: string;
  username: string;
  displayName: string;
  fixtureKey: string;
  fixtureLabel: string;
  homeScore: number;
  awayScore: number;
  resultStatus: string;
  pointsAwarded: number;
  updatedAt: string;
};

export type PredictionsWalletSummary = {
  balance: number;
  pointsWon: number;
  pointsLost: number;
  picksWon: number;
  picksLost: number;
  picksPending: number;
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
  home_score: number;
  away_score: number;
  result_status: string;
  points_awarded: number;
  updated_at: Date;
  username?: string;
  display_name: string | null;
};

function mapPick(row: PredictionRow): PredictionPickSummary {
  return {
    id: row.id,
    fixtureKey: row.fixture_key,
    fixtureLabel: fixtureKeyToShortLabel(row.fixture_key),
    homeScore: row.home_score,
    awayScore: row.away_score,
    resultStatus: row.result_status ?? "pending",
    pointsAwarded: row.points_awarded ?? 0,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function getPredictionsWalletSummary(userId: string): Promise<PredictionsWalletSummary> {
  const user = await query<{ points_balance: number }>(
    `SELECT points_balance FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const balance = user.rows[0]?.points_balance ?? 0;

  const ledger = await query<{ amount: number; transaction_type: string }>(
    `SELECT amount, transaction_type
     FROM wallet_ledger
     WHERE user_id = $1
       AND transaction_type IN ('prediction_correct', 'prediction_partial')`,
    [userId]
  );

  let pointsWon = 0;
  let pointsLost = 0;
  for (const row of ledger.rows) {
    if (row.amount > 0) pointsWon += row.amount;
    else pointsLost += Math.abs(row.amount);
  }

  const picks = await query<{ result_status: string; points_awarded: number }>(
    `SELECT result_status, points_awarded FROM fixture_predictions WHERE user_id = $1`,
    [userId]
  );

  let picksWon = 0;
  let picksLost = 0;
  let picksPending = 0;
  for (const row of picks.rows) {
    if (row.result_status === "won" || row.result_status === "partial") {
      picksWon += 1;
      if (row.points_awarded > 0 && pointsWon === 0) {
        pointsWon += row.points_awarded;
      }
    } else if (row.result_status === "lost") {
      picksLost += 1;
    } else {
      picksPending += 1;
    }
  }

  if (pointsWon === 0 && picks.rows.some((r) => r.points_awarded > 0)) {
    pointsWon = picks.rows.reduce((sum, r) => sum + Math.max(0, r.points_awarded), 0);
  }

  return { balance, pointsWon, pointsLost, picksWon, picksLost, picksPending };
}

export async function listUserFixturePredictions(userId: string, limit = 20) {
  const result = await query<PredictionRow>(
    `SELECT id, user_id, fixture_key, home_score, away_score,
            COALESCE(result_status, 'pending') AS result_status,
            COALESCE(points_awarded, 0) AS points_awarded,
            updated_at
     FROM fixture_predictions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(mapPick);
}

export async function listConnectionsFixturePredictions(
  userId: string,
  fixtureKey?: string,
  limit = 30
) {
  const peerIds = await listAcceptedPeerIds(userId);
  if (!peerIds.length) return [];

  const key = fixtureKey?.trim().slice(0, 120);
  const result = key
    ? await query<PredictionRow>(
        `SELECT fp.id, fp.user_id, fp.fixture_key, fp.home_score, fp.away_score,
                COALESCE(fp.result_status, 'pending') AS result_status,
                COALESCE(fp.points_awarded, 0) AS points_awarded,
                fp.updated_at, u.username, u.display_name
         FROM fixture_predictions fp
         INNER JOIN users u ON u.id = fp.user_id
         WHERE fp.user_id = ANY($1::uuid[])
           AND fp.fixture_key = $2
         ORDER BY fp.updated_at DESC
         LIMIT $3`,
        [peerIds, key, limit]
      )
    : await query<PredictionRow>(
        `SELECT fp.id, fp.user_id, fp.fixture_key, fp.home_score, fp.away_score,
                COALESCE(fp.result_status, 'pending') AS result_status,
                COALESCE(fp.points_awarded, 0) AS points_awarded,
                fp.updated_at, u.username, u.display_name
         FROM fixture_predictions fp
         INNER JOIN users u ON u.id = fp.user_id
         WHERE fp.user_id = ANY($1::uuid[])
         ORDER BY fp.updated_at DESC
         LIMIT $2`,
        [peerIds, limit]
      );

  return result.rows.map((row) => ({
    userId: row.user_id,
    username: row.username ?? "fan",
    displayName: row.display_name ?? row.username ?? "Fan",
    fixtureKey: row.fixture_key,
    fixtureLabel: fixtureKeyToShortLabel(row.fixture_key),
    homeScore: row.home_score,
    awayScore: row.away_score,
    resultStatus: row.result_status ?? "pending",
    pointsAwarded: row.points_awarded ?? 0,
    updatedAt: row.updated_at.toISOString()
  }));
}

export async function getPredictionsOverview(userId: string, fixtureKey?: string) {
  const [wallet, myPredictions, connectionsPredictions] = await Promise.all([
    getPredictionsWalletSummary(userId),
    listUserFixturePredictions(userId),
    listConnectionsFixturePredictions(userId, fixtureKey)
  ]);

  return { wallet, myPredictions, connectionsPredictions };
}
