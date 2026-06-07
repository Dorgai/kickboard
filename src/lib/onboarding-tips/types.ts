export type OnboardingTipFeature =
  | "tournament_champion"
  | "tournament_best_player"
  | "tournament_top_scorer"
  | "tournament_final_opponent"
  | "tournament_picks"
  | "invitations"
  | "invitation_note"
  | "match_picks"
  | "outcome_pick"
  | "draw_pick"
  | "score_pick"
  | "scorer_pick"
  | "edit_picks"
  | "share_picks"
  | "coach_board"
  | "publish_lineup"
  | "update_board"
  | "fan_chat"
  | "connections"
  | "friends_picks"
  | "help_ai"
  | "help_admin"
  | "theme"
  | "alerts"
  | "points_board"
  | "predictions_tabs"
  | "onboarding";

export type OnboardingTip = {
  id: string;
  message: string;
  enabled: boolean;
  /** Optional override; defaults to TIP_FEATURE_BY_ID[id]. */
  feature?: OnboardingTipFeature | null;
};

export type OnboardingTipsDocument = {
  version: number;
  tips: OnboardingTip[];
};

export const ONBOARDING_TIPS_CAMPAIGN_MS = 5 * 60 * 1000;
export const ONBOARDING_TIPS_VISIBLE_MS = 14_000;
export const ONBOARDING_TIPS_INTERVAL_MS = 38_000;
export const ONBOARDING_TIPS_NEW_USER_DAYS = 21;
