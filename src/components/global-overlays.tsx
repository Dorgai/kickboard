"use client";

import { HelpCenterDialog } from "@/components/help-center-dialog";
import { SessionCheckpointDialog } from "@/components/session-checkpoint-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";

/** Site-wide modals (welcome tour, help center). */
export function GlobalOverlays() {
  return (
    <>
      <WelcomeDialog />
      <SessionCheckpointDialog />
      <HelpCenterDialog />
    </>
  );
}
