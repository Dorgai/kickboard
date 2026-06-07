import {
  ONBOARDING_TIPS_CAMPAIGN_MS,
  type OnboardingTip
} from "@/lib/onboarding-tips/types";

const STORAGE_KEY = "kickboard-onboarding-tips:v1";

type TipsCampaignState = {
  userId: string;
  startedAt: number;
  shownIds: string[];
  ended: boolean;
};

function readState(): TipsCampaignState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TipsCampaignState>;
    if (!parsed.userId || typeof parsed.startedAt !== "number") return null;
    return {
      userId: parsed.userId,
      startedAt: parsed.startedAt,
      shownIds: Array.isArray(parsed.shownIds) ? parsed.shownIds.map(String) : [],
      ended: Boolean(parsed.ended)
    };
  } catch {
    return null;
  }
}

function writeState(state: TipsCampaignState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getTipsCampaignState(userId: string): TipsCampaignState | null {
  const state = readState();
  if (!state || state.userId !== userId) return null;
  return state;
}

export function startTipsCampaign(userId: string): TipsCampaignState {
  const existing = getTipsCampaignState(userId);
  if (existing && !existing.ended) return existing;

  const next: TipsCampaignState = {
    userId,
    startedAt: Date.now(),
    shownIds: [],
    ended: false
  };
  writeState(next);
  return next;
}

export function markTipShown(userId: string, tipId: string) {
  const state = getTipsCampaignState(userId) ?? startTipsCampaign(userId);
  if (state.shownIds.includes(tipId)) return;
  writeState({
    ...state,
    shownIds: [...state.shownIds, tipId]
  });
}

export function endTipsCampaign(userId: string) {
  const state = getTipsCampaignState(userId) ?? startTipsCampaign(userId);
  writeState({ ...state, ended: true });
}

export function isTipsCampaignActive(userId: string) {
  const state = getTipsCampaignState(userId);
  if (!state || state.ended) return false;
  return Date.now() - state.startedAt < ONBOARDING_TIPS_CAMPAIGN_MS;
}

export function pickNextTip(userId: string, tips: OnboardingTip[]): OnboardingTip | null {
  if (!tips.length) return null;
  const state = getTipsCampaignState(userId);
  const shown = new Set(state?.shownIds ?? []);
  const remaining = tips.filter((tip) => !shown.has(tip.id));
  const pool = remaining.length > 0 ? remaining : tips;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}
