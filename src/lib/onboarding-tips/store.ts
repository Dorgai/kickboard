import { query, isDatabaseConfigured } from "@/lib/db";
import { loadDefaultOnboardingTips, normalizeTips } from "@/lib/onboarding-tips/defaults";
import type { OnboardingTip, OnboardingTipsDocument } from "@/lib/onboarding-tips/types";

const CONFIG_ID = "default";

let tableReady: Promise<boolean> | null = null;

export async function ensureOnboardingTipsTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  if (!tableReady) {
    tableReady = (async () => {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS onboarding_tips_config (
            id text PRIMARY KEY,
            payload jsonb NOT NULL,
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        return true;
      } catch (error) {
        console.error("[onboarding-tips] ensure table failed", error);
        tableReady = null;
        return false;
      }
    })();
  }

  return tableReady;
}

function enabledTips(document: OnboardingTipsDocument) {
  return document.tips.filter((tip) => tip.enabled && tip.message.trim());
}

export async function loadPublishedOnboardingTips(): Promise<OnboardingTipsDocument> {
  const defaults = loadDefaultOnboardingTips();

  if (!isDatabaseConfigured() || !(await ensureOnboardingTipsTable())) {
    return defaults;
  }

  try {
    const result = await query<{ payload: unknown }>(
      `SELECT payload FROM onboarding_tips_config WHERE id = $1 LIMIT 1`,
      [CONFIG_ID]
    );
    const row = result.rows[0];
    if (!row?.payload || typeof row.payload !== "object") {
      return defaults;
    }

    const parsed = row.payload as Partial<OnboardingTipsDocument>;
    const tips = normalizeTips(parsed.tips);
    if (!tips.length) return defaults;

    return {
      version: 1,
      tips
    };
  } catch (error) {
    console.error("[onboarding-tips] load published failed", error);
    return defaults;
  }
}

export async function savePublishedOnboardingTips(
  tips: OnboardingTip[]
): Promise<OnboardingTipsDocument> {
  const document: OnboardingTipsDocument = {
    version: 1,
    tips: normalizeTips(tips)
  };

  if (!isDatabaseConfigured() || !(await ensureOnboardingTipsTable())) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  await query(
    `INSERT INTO onboarding_tips_config (id, payload, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE
     SET payload = EXCLUDED.payload,
         updated_at = now()`,
    [CONFIG_ID, JSON.stringify(document)]
  );

  return document;
}

export async function loadEnabledOnboardingTips(): Promise<OnboardingTip[]> {
  const document = await loadPublishedOnboardingTips();
  return enabledTips(document);
}

export async function isUserEligibleForOnboardingTips(userId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const result = await query<{
    onboarding_completed_at: Date | null;
    created_at: Date;
  }>(
    `SELECT onboarding_completed_at, created_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const row = result.rows[0];
  if (!row?.onboarding_completed_at) return false;

  const anchor = row.onboarding_completed_at ?? row.created_at;
  const ageMs = Date.now() - anchor.getTime();
  const maxAgeMs = 21 * 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}
