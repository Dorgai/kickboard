import fs from "node:fs";
import path from "node:path";
import type { OnboardingTip, OnboardingTipsDocument } from "@/lib/onboarding-tips/types";

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
    tips.push({
      id: id.slice(0, 40),
      message: message.slice(0, 220),
      enabled: row.enabled !== false
    });
  }

  return tips;
}
