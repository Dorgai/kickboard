"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  enrichFixtureOption,
  MATCH_BOARD_POLL_LIVE_MS,
  MATCH_BOARD_POLL_MS,
  MATCH_BOARD_STREAM_URL,
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
  recentResults: [],
  byKey: {}
};

const STREAM_RETRY_MS = 30_000;

export function MatchBoardProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<MatchBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);

  const applyPayload = useCallback((data: MatchBoardPayload) => {
    setPayload(data);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/feeds/match-board", { cache: "no-store" });
      const data = (await response.json()) as MatchBoardPayload;
      applyPayload(data);
    } catch {
      setPayload((current) => current ?? { ...EMPTY_PAYLOAD, message: "Unable to reach match board." });
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  const hasLiveMatches = useMemo(() => {
    if ((payload?.live?.length ?? 0) > 0) return true;
    return Object.values(payload?.byKey ?? {}).some((state) => state.status === "live");
  }, [payload]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    let disposed = false;
    let eventSource: EventSource | null = null;
    let retryTimeout: number | null = null;

    const connectStream = () => {
      if (disposed) return;
      eventSource?.close();
      eventSource = new EventSource(MATCH_BOARD_STREAM_URL);

      eventSource.onopen = () => {
        if (!disposed) setStreaming(true);
      };

      eventSource.onmessage = (event) => {
        try {
          applyPayload(JSON.parse(event.data) as MatchBoardPayload);
        } catch {
          /* ignore malformed chunk */
        }
      };

      eventSource.onerror = () => {
        setStreaming(false);
        eventSource?.close();
        eventSource = null;
        void load();
        if (!disposed) {
          retryTimeout = window.setTimeout(() => {
            retryTimeout = null;
            connectStream();
          }, STREAM_RETRY_MS);
        }
      };
    };

    connectStream();

    return () => {
      disposed = true;
      setStreaming(false);
      eventSource?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [applyPayload, load]);

  useEffect(() => {
    if (streaming) return;
    const pollMs = hasLiveMatches ? MATCH_BOARD_POLL_LIVE_MS : MATCH_BOARD_POLL_MS;
    const interval = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(interval);
  }, [hasLiveMatches, load, streaming]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
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
