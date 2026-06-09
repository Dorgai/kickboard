"use client";

import { SessionProvider } from "next-auth/react";
import { GlobalOverlays } from "@/components/global-overlays";
import { ActivityTracker } from "@/components/activity-tracker";
import { LoginCelebrationListener } from "@/components/login-celebration-listener";
import { PredictionCelebrationListener } from "@/components/prediction-celebration-listener";
import { PredictionSubmitCelebration } from "@/components/prediction-submit-celebration";
import { PushNotificationBootstrap } from "@/components/push-notification-bootstrap";
import { PwaInstallHint } from "@/components/pwa-install-hint";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
      <ThemeProvider>
        <ToastProvider>
          <ActivityTracker />
          <LoginCelebrationListener />
          <PredictionCelebrationListener />
          <PredictionSubmitCelebration />
          <PushNotificationBootstrap />
          <PwaInstallHint />
          <GlobalOverlays />
          {children}
        </ToastProvider>
      </ThemeProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
