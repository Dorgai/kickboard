import fs from "node:fs";
import path from "node:path";
import { TIP_FEATURE_BY_ID } from "@/lib/onboarding-tips/features";
import type { OnboardingTip, OnboardingTipFeature, OnboardingTipsDocument } from "@/lib/onboarding-tips/types";

const TIP_FEATURES = new Set<string>(Object.values(TIP_FEATURE_BY_ID));

function parseTipFeature(value: unknown): OnboardingTipFeature | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return TIP_FEATURES.has(trimmed) ? (trimmed as OnboardingTipFeature) : undefined;
}

function tipsFilePath() {
  return path.join(process.cwd(), "content/onboarding-tips.json");
}

export function loadDefaultOnboardingTips(): OnboardingTipsDocument {
  try {
    const raw = fs.readFileSync(tipsFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<OnboardingTipsDocument>;
    const tips = normalizeTips(parsed.tips ?? []);
    return { version: parsed.version === 1 ? 1 : 1, tips };
  } catch {
    return { version: 1, tips: [] };
  }
}

export function normalizeTips(raw: unknown): OnboardingTip[] {
  if (!Array.isArray(raw)) return [];

  const tips: OnboardingTip[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<OnboardingTip>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const message = typeof row.message === "string" ? row.message.trim() : "";
    if (!id || !message || seen.has(id)) continue;
    seen.add(id);
    const feature = parseTipFeature((row as { feature?: unknown }).feature);
    tips.push({
      id: id.slice(0, 40),
      message: message.slice(0, 220),
      enabled: row.enabled !== false,
      ...(feature !== undefined ? { feature } : {})
    });
  }

  return tips;
}
