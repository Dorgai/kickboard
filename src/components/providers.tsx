"use client";

import { SessionProvider } from "next-auth/react";
import { ActivityTracker } from "@/components/activity-tracker";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <ActivityTracker />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
