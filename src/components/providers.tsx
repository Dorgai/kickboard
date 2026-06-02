"use client";

import { SessionProvider } from "next-auth/react";
import { ActivityTracker } from "@/components/activity-tracker";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ActivityTracker />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
