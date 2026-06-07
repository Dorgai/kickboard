export type OnboardingTip = {
  id: string;
  message: string;
  enabled: boolean;
};

export type OnboardingTipsDocument = {
  version: number;
  tips: OnboardingTip[];
};

export const ONBOARDING_TIPS_CAMPAIGN_MS = 5 * 60 * 1000;
export const ONBOARDING_TIPS_VISIBLE_MS = 14_000;
export const ONBOARDING_TIPS_INTERVAL_MS = 38_000;
export const ONBOARDING_TIPS_NEW_USER_DAYS = 21;
