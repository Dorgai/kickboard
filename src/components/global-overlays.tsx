"use client";

import { FriendsPredictionsHighlightsDialog } from "@/components/friends-predictions-highlights-dialog";
import { HelpCenterDialog } from "@/components/help-center-dialog";
import { OnboardingTipsFloater } from "@/components/onboarding-tips-floater";
import { SessionCheckpointDialog } from "@/components/session-checkpoint-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";

/** Site-wide modals (welcome tour, help center). */
export function GlobalOverlays() {
  return (
    <>
      <WelcomeDialog />
      <OnboardingTipsFloater />
      <SessionCheckpointDialog />
      <FriendsPredictionsHighlightsDialog />
      <HelpCenterDialog />
    </>
  );
}
