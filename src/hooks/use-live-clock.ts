"use client";

import { useEffect, useState } from "react";

/** Ticks during live matches so elapsed minutes update without waiting for the next poll. */
export function useLiveClock(active: boolean, intervalMs = 10_000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [active, intervalMs]);

  return nowMs;
}
