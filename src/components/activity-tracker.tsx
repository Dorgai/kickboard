"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const HEARTBEAT_MS = 45_000;

export function ActivityTracker() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;

    let cancelled = false;

    async function heartbeat() {
      if (cancelled) return;
      await fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath: pathname }),
        credentials: "include"
      }).catch(() => undefined);
    }

    void heartbeat();
    const interval = window.setInterval(() => void heartbeat(), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname, session?.user?.onboardingComplete, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    if (!pathname || lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    void fetch("/api/activity/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        eventType: "page_view",
        pagePath: pathname,
        summary: `Viewed ${pathname}`
      })
    }).catch(() => undefined);
  }, [pathname, session?.user?.onboardingComplete, status]);

  return null;
}
