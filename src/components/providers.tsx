"use client";

import { SessionProvider } from "next-auth/react";
import { ActivityTracker } from "@/components/activity-tracker";
import { PredictionCelebrationListener } from "@/components/prediction-celebration-listener";
import { PredictionSubmitCelebration } from "@/components/prediction-submit-celebration";
import { PushNotificationBootstrap } from "@/components/push-notification-bootstrap";
import { PwaInstallHint } from "@/components/pwa-install-hint";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <ActivityTracker />
          <PredictionCelebrationListener />
          <PredictionSubmitCelebration />
          <PushNotificationBootstrap />
          <PwaInstallHint />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
