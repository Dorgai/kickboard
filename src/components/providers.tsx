"use client";

import { SessionProvider } from "next-auth/react";
import { ActivityTracker } from "@/components/activity-tracker";
import { PwaBootstrap } from "@/components/pwa-bootstrap";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <PwaBootstrap />
          <PwaInstallBanner />
          <ActivityTracker />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
