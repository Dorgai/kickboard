import { query, isDatabaseConfigured } from "@/lib/db";
import type { OnboardingTip, OnboardingTipFeature } from "@/lib/onboarding-tips/types";

export type { OnboardingTipFeature };

/** Default tip → feature map (stable when admins edit message text only). */
export const TIP_FEATURE_BY_ID: Record<string, OnboardingTipFeature> = {
  "tip-01": "tournament_champion",
  "tip-02": "tournament_best_player",
  "tip-03": "tournament_top_scorer",
  "tip-04": "invitations",
  "tip-05": "match_picks",
  "tip-06": "share_picks",
  "tip-07": "coach_board",
  "tip-08": "publish_lineup",
  "tip-09": "fan_chat",
  "tip-10": "friends_picks",
  "tip-11": "outcome_pick",
  "tip-12": "score_pick",
  "tip-13": "scorer_pick",
  "tip-14": "tournament_picks",
  "tip-15": "tournament_final_opponent",
  "tip-16": "tournament_top_scorer",
  "tip-17": "coach_board",
  "tip-18": "coach_board",
  "tip-19": "coach_board",
  "tip-20": "alerts",
  "tip-21": "friends_picks",
  "tip-22": "match_picks",
  "tip-23": "points_board",
  "tip-25": "help_ai",
  "tip-26": "tournament_picks",
  "tip-27": "tournament_picks",
  "tip-28": "draw_pick",
  "tip-29": "share_picks",
  "tip-30": "coach_board",
  "tip-31": "coach_board",
  "tip-32": "invitation_note",
  "tip-33": "publish_lineup",
  "tip-34": "edit_picks",
  "tip-35": "alerts",
  "tip-36": "theme",
  "tip-37": "tournament_final_opponent",
  "tip-38": "match_picks",
  "tip-39": "coach_board",
  "tip-40": "match_picks",
  "tip-41": "predictions_tabs",
  "tip-42": "share_picks",
  "tip-43": "fan_chat",
  "tip-44": "share_picks",
  "tip-45": "friends_picks",
  "tip-46": "tournament_picks",
  "tip-47": "share_picks",
  "tip-48": "update_board",
  "tip-49": "onboarding",
  "tip-50": "help_admin"
};

export function resolveTipFeature(tip: OnboardingTip): OnboardingTipFeature | null {
  if (tip.feature) return tip.feature;
  return TIP_FEATURE_BY_ID[tip.id] ?? null;
}

type FeatureFlags = {
  tournament_champion: boolean;
  tournament_best_player: boolean;
  tournament_top_scorer: boolean;
  tournament_final_opponent: boolean;
  tournament_picks: boolean;
  invitations: boolean;
  invitation_note: boolean;
  match_picks: boolean;
  outcome_pick: boolean;
  draw_pick: boolean;
  score_pick: boolean;
  scorer_pick: boolean;
  edit_picks: boolean;
  share_picks: boolean;
  coach_board: boolean;
  publish_lineup: boolean;
  update_board: boolean;
  fan_chat: boolean;
  connections: boolean;
  help_ai: boolean;
  help_admin: boolean;
  theme: boolean;
  alerts: boolean;
  points_board: boolean;
  predictions_tabs: boolean;
  onboarding: boolean;
};

export async function getUserUsedOnboardingFeatures(userId: string): Promise<Set<OnboardingTipFeature>> {
  const used = new Set<OnboardingTipFeature>();
  if (!isDatabaseConfigured()) return used;

  try {
    const result = await query<FeatureFlags>(
      `SELECT
         EXISTS (
           SELECT 1 FROM tournament_predictions
           WHERE user_id = $1 AND NULLIF(TRIM(predicted_champion), '') IS NOT NULL
         ) AS tournament_champion,
         EXISTS (
           SELECT 1 FROM tournament_predictions
           WHERE user_id = $1
             AND predicted_best_player IS NOT NULL
             AND predicted_best_player::text NOT IN ('null', '{}')
         ) AS tournament_best_player,
         EXISTS (
           SELECT 1 FROM tournament_predictions
           WHERE user_id = $1
             AND (
               (predicted_top_scorer IS NOT NULL AND predicted_top_scorer::text NOT IN ('null', '{}'))
               OR (predicted_top_scorer_board IS NOT NULL AND predicted_top_scorer_board::text NOT IN ('null', '[]', '{}'))
             )
         ) AS tournament_top_scorer,
         EXISTS (
           SELECT 1 FROM tournament_predictions
           WHERE user_id = $1
             AND jsonb_array_length(COALESCE(predicted_finalists, '[]'::jsonb)) > 0
         ) AS tournament_final_opponent,
         EXISTS (
           SELECT 1 FROM tournament_predictions
           WHERE user_id = $1
             AND (
               NULLIF(TRIM(predicted_champion), '') IS NOT NULL
               OR predicted_best_player IS NOT NULL
               OR predicted_top_scorer IS NOT NULL
               OR jsonb_array_length(COALESCE(predicted_finalists, '[]'::jsonb)) > 0
             )
         ) AS tournament_picks,
         EXISTS (
           SELECT 1 FROM registration_invitations WHERE inviter_id = $1
         ) AS invitations,
         EXISTS (
           SELECT 1 FROM registration_invitations
           WHERE inviter_id = $1 AND NULLIF(TRIM(personal_message), '') IS NOT NULL
         ) AS invitation_note,
         EXISTS (
           SELECT 1 FROM fixture_predictions WHERE user_id = $1
         ) AS match_picks,
         EXISTS (
           SELECT 1 FROM fixture_predictions
           WHERE user_id = $1 AND predicted_outcome IS NOT NULL
         ) AS outcome_pick,
         EXISTS (
           SELECT 1 FROM fixture_predictions
           WHERE user_id = $1 AND predicted_outcome = 'draw'
         ) AS draw_pick,
         EXISTS (
           SELECT 1 FROM fixture_predictions
           WHERE user_id = $1 AND home_score IS NOT NULL AND away_score IS NOT NULL
         ) AS score_pick,
         EXISTS (
           SELECT 1 FROM fixture_predictions
           WHERE user_id = $1 AND jsonb_array_length(COALESCE(scorer_picks, '[]'::jsonb)) > 0
         ) AS scorer_pick,
         EXISTS (
           SELECT 1 FROM fixture_predictions
           WHERE user_id = $1 AND updated_at > created_at + interval '2 seconds'
         ) AS edit_picks,
         EXISTS (
           SELECT 1 FROM user_activity_events
           WHERE user_id = $1 AND event_type = 'prediction_shared'
         ) AS share_picks,
         EXISTS (
           SELECT 1 FROM squads WHERE user_id = $1
         ) AS coach_board,
         EXISTS (
           SELECT 1 FROM squads
           WHERE user_id = $1 AND published_to_board_at IS NOT NULL
         ) AS publish_lineup,
         EXISTS (
           SELECT 1 FROM squads
           WHERE user_id = $1 AND updated_at > created_at + interval '2 seconds'
         ) AS update_board,
         EXISTS (
           SELECT 1 FROM fan_chat_messages WHERE sender_id = $1
         ) AS fan_chat,
         EXISTS (
           SELECT 1 FROM connections
           WHERE status = 'accepted'
             AND (requester_id = $1 OR addressee_id = $1)
         ) AS connections,
         EXISTS (
           SELECT 1 FROM help_conversations WHERE user_id = $1 AND channel = 'ai'
         ) AS help_ai,
         EXISTS (
           SELECT 1 FROM help_conversations WHERE user_id = $1 AND channel = 'admin'
         ) AS help_admin,
         EXISTS (
           SELECT 1 FROM user_preferences
           WHERE user_id = $1 AND display_mode IN ('light', 'dark')
         ) AS theme,
         EXISTS (
           SELECT 1 FROM user_alerts WHERE user_id = $1
         ) AS alerts,
         EXISTS (
           SELECT 1 FROM fixture_predictions
           WHERE user_id = $1
             AND (
               outcome_points_awarded > 0
               OR score_points_awarded > 0
               OR scorers_points_awarded > 0
             )
         ) AS points_board,
         EXISTS (
           SELECT 1 FROM fixture_predictions WHERE user_id = $1
         )
         AND EXISTS (
           SELECT 1 FROM tournament_predictions WHERE user_id = $1
         ) AS predictions_tabs,
         EXISTS (
           SELECT 1 FROM users
           WHERE id = $1 AND onboarding_completed_at IS NOT NULL
         ) AS onboarding`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) return used;

    const flagKeys = Object.keys(row) as (keyof FeatureFlags)[];
    for (const key of flagKeys) {
      if (row[key]) used.add(key);
    }

    if (row.connections && row.match_picks) {
      used.add("friends_picks");
    }
  } catch (error) {
    console.error("[onboarding-tips] feature usage lookup failed", error);
  }

  return used;
}

export async function filterOnboardingTipsForUser(
  userId: string,
  tips: OnboardingTip[]
): Promise<OnboardingTip[]> {
  const used = await getUserUsedOnboardingFeatures(userId);
  if (!used.size) return tips;

  return tips.filter((tip) => {
    const feature = resolveTipFeature(tip);
    if (!feature) return true;
    return !used.has(feature);
  });
}
