import { query } from "@/lib/db";

export type FixturePrediction = {
  id: string;
  fixtureKey: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
};

export async function getUserFixturePrediction(userId: string, fixtureKey: string) {
  const key = fixtureKey.trim().slice(0, 120);
  if (!key) return null;

  const result = await query<{
    id: string;
    fixture_key: string;
    home_score: number;
    away_score: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, fixture_key, home_score, away_score, created_at, updated_at
     FROM fixture_predictions
     WHERE user_id = $1 AND fixture_key = $2`,
    [userId, key]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    fixtureKey: row.fixture_key,
    homeScore: row.home_score,
    awayScore: row.away_score,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  } satisfies FixturePrediction;
}

export async function upsertUserFixturePrediction(input: {
  userId: string;
  fixtureKey: string;
  homeScore: number;
  awayScore: number;
}) {
  const key = input.fixtureKey.trim().slice(0, 120);
  if (!key) throw new Error("FIXTURE_KEY_REQUIRED");

  const homeScore = Math.round(input.homeScore);
  const awayScore = Math.round(input.awayScore);
  if (homeScore < 0 || homeScore > 20 || awayScore < 0 || awayScore > 20) {
    throw new Error("INVALID_SCORE");
  }

  const result = await query<{ id: string }>(
    `INSERT INTO fixture_predictions (user_id, fixture_key, home_score, away_score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, fixture_key)
     DO UPDATE SET
       home_score = EXCLUDED.home_score,
       away_score = EXCLUDED.away_score,
       updated_at = now()
     RETURNING id`,
    [input.userId, key, homeScore, awayScore]
  );

  return result.rows[0]?.id ?? null;
}
