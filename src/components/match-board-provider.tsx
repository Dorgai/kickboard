"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  enrichFixtureOption,
  MATCH_BOARD_POLL_MS,
  type MatchBoardPayload
} from "@/lib/fixtures/match-board-shared";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";

type MatchBoardContextValue = {
  payload: MatchBoardPayload | null;
  loading: boolean;
  enrichFixture: (fixture: FixtureOption) => FixtureOption;
  lookupByKey: (fixtureKey: string) => MatchBoardPayload["byKey"][string] | null;
};

const MatchBoardContext = createContext<MatchBoardContextValue | null>(null);

const EMPTY_PAYLOAD: MatchBoardPayload = {
  connected: false,
  updatedAt: new Date().toISOString(),
  live: [],
  startingSoon: [],
  byKey: {}
};

export function MatchBoardProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<MatchBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/feeds/match-board", { cache: "no-store" });
      const data = (await response.json()) as MatchBoardPayload;
      setPayload(data);
    } catch {
      setPayload((current) => current ?? { ...EMPTY_PAYLOAD, message: "Unable to reach match board." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), MATCH_BOARD_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const value = useMemo((): MatchBoardContextValue => {
    const byKey = payload?.byKey ?? {};
    return {
      payload,
      loading,
      enrichFixture: (fixture) => enrichFixtureOption(fixture, byKey),
      lookupByKey: (fixtureKey) => byKey[fixtureKey] ?? null
    };
  }, [loading, payload]);

  return <MatchBoardContext.Provider value={value}>{children}</MatchBoardContext.Provider>;
}

export function useMatchBoard() {
  const context = useContext(MatchBoardContext);
  if (!context) {
    throw new Error("useMatchBoard must be used within MatchBoardProvider");
  }
  return context;
}

export function useMatchBoardOptional() {
  return useContext(MatchBoardContext);
}
