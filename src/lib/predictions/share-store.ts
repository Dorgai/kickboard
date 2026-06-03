import { randomBytes } from "node:crypto";
import { query, isDatabaseConfigured } from "@/lib/db";
import type { PredictionSharePayload } from "@/lib/predictions/share";
import { parseScorerPicks, type FixtureOutcome } from "@/lib/fixture-predictions/types";
import { parseFixtureKeyTeams } from "@/lib/fixtures/fixture-key";

function createShareId() {
  return randomBytes(9).toString("base64url");
}

let shareLinksTableReady: Promise<boolean> | null = null;

/** Idempotent — creates prediction_share_links if migrations were not applied yet. */
export async function ensurePredictionShareLinksTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  if (!shareLinksTableReady) {
    shareLinksTableReady = (async () => {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS prediction_share_links (
            id text PRIMARY KEY,
            payload jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_prediction_share_links_created
            ON prediction_share_links (created_at DESC)
        `);
        return true;
      } catch (error) {
        console.error("[prediction-share-links] ensure table failed", error);
        shareLinksTableReady = null;
        return false;
      }
    })();
  }

  return shareLinksTableReady;
}

export function isShortShareId(value: string) {
  const id = value.trim();
  return id.length >= 8 && id.length <= 24 && /^[A-Za-z0-9_-]+$/.test(id);
}

export function payloadFromStored(raw: unknown): PredictionSharePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<PredictionSharePayload>;
  const fixtureKey = typeof parsed.fixtureKey === "string" ? parsed.fixtureKey.trim() : "";
  if (!fixtureKey) return null;
  if (parsed.v !== undefined && parsed.v !== 1) return null;

  const teamsFromKey = parseFixtureKeyTeams(fixtureKey);
  const homeTeam =
    typeof parsed.homeTeam === "string" && parsed.homeTeam.trim()
      ? parsed.homeTeam.trim()
      : teamsFromKey.homeTeam;
  const awayTeam =
    typeof parsed.awayTeam === "string" && parsed.awayTeam.trim()
      ? parsed.awayTeam.trim()
      : teamsFromKey.awayTeam;
  if (!homeTeam || !awayTeam) return null;

  return {
    v: 1,
    fixtureKey: fixtureKey.slice(0, 120),
    fixtureLabel: String(parsed.fixtureLabel ?? `${homeTeam} vs ${awayTeam}`).slice(0, 120),
    homeTeam: homeTeam.slice(0, 80),
    awayTeam: awayTeam.slice(0, 80),
    predictedOutcome:
      parsed.predictedOutcome === "home" ||
      parsed.predictedOutcome === "away" ||
      parsed.predictedOutcome === "draw"
        ? (parsed.predictedOutcome as FixtureOutcome)
        : null,
    homeScore: typeof parsed.homeScore === "number" ? parsed.homeScore : null,
    awayScore: typeof parsed.awayScore === "number" ? parsed.awayScore : null,
    scorerPicks: parseScorerPicks(parsed.scorerPicks),
    displayName: parsed.displayName ? String(parsed.displayName).slice(0, 80) : null
  };
}

export async function savePredictionShareLink(
  payload: PredictionSharePayload
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  if (!(await ensurePredictionShareLinksTable())) return null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const id = createShareId();
    try {
      await query(
        `INSERT INTO prediction_share_links (id, payload)
         VALUES ($1, $2::jsonb)`,
        [id, JSON.stringify(payload)]
      );
      return id;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") continue;
      if (isMissingRelationError(error)) return null;
      throw error;
    }
  }

  return null;
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return "code" in error && String(error.code) === "42P01";
}

export async function loadPredictionShareLink(id: string): Promise<PredictionSharePayload | null> {
  if (!isDatabaseConfigured() || !isShortShareId(id)) return null;
  if (!(await ensurePredictionShareLinksTable())) return null;

  try {
    const result = await query<{ payload: unknown }>(
      `SELECT payload FROM prediction_share_links WHERE id = $1 LIMIT 1`,
      [id.trim()]
    );

    if (!result.rows[0]) return null;
    return payloadFromStored(result.rows[0].payload);
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
}
