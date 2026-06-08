import {
  ONBOARDING_TIPS_DAILY_MAX,
  type OnboardingTip
} from "@/lib/onboarding-tips/types";

const STORAGE_KEY = "kickboard-onboarding-tips:v2";

type TipsUserDailyState = {
  userId: string;
  /** Local calendar date YYYY-MM-DD */
  day: string;
  shownCount: number;
  shownIds: string[];
};

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readRawState(): TipsUserDailyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TipsUserDailyState>;
    if (!parsed.userId || typeof parsed.day !== "string") return null;
    return {
      userId: parsed.userId,
      day: parsed.day,
      shownCount: Number(parsed.shownCount ?? 0),
      shownIds: Array.isArray(parsed.shownIds) ? parsed.shownIds.map(String) : []
    };
  } catch {
    return null;
  }
}

function writeState(state: TipsUserDailyState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function freshState(userId: string): TipsUserDailyState {
  return {
    userId,
    day: localDayKey(),
    shownCount: 0,
    shownIds: []
  };
}

/** Per-user daily tip budget (resets each local calendar day). */
export function getTipsDailyState(userId: string): TipsUserDailyState {
  const today = localDayKey();
  const state = readRawState();
  if (!state || state.userId !== userId || state.day !== today) {
    return freshState(userId);
  }
  return state;
}

export function getRemainingTipsToday(userId: string) {
  const state = getTipsDailyState(userId);
  return Math.max(0, ONBOARDING_TIPS_DAILY_MAX - state.shownCount);
}

export function canShowTipToday(userId: string) {
  return getRemainingTipsToday(userId) > 0;
}

export function markTipShown(userId: string, tipId: string) {
  const state = getTipsDailyState(userId);
  if (state.shownCount >= ONBOARDING_TIPS_DAILY_MAX) return;

  writeState({
    ...state,
    shownCount: state.shownCount + 1,
    shownIds: state.shownIds.includes(tipId) ? state.shownIds : [...state.shownIds, tipId]
  });
}

export function pickNextTip(userId: string, tips: OnboardingTip[]): OnboardingTip | null {
  if (!tips.length || !canShowTipToday(userId)) return null;

  const state = getTipsDailyState(userId);
  const shown = new Set(state.shownIds);
  const remaining = tips.filter((tip) => !shown.has(tip.id));
  const pool = remaining.length > 0 ? remaining : tips;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}
