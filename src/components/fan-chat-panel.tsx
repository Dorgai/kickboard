"use client";

import { AuthGate } from "@/components/auth-gate";
import { FanChatMessenger } from "@/components/fan-chat-messenger";

export function FanChatPanel() {
  return (
    <AuthGate featureLabel="Fan Chat">
      <FanChatMessenger />
    </AuthGate>
  );
}
