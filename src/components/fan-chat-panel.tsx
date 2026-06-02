"use client";

import { CommunityPanel } from "@/components/community-panel";
import { AuthGate } from "@/components/auth-gate";

export function FanChatPanel() {
  return (
    <AuthGate featureLabel="Fan Chat">
      <CommunityPanel embedded />
    </AuthGate>
  );
}
