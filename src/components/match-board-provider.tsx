"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useToastOptional } from "@/components/toast-provider";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import {
  enrichFixtureOption,
  MATCH_BOARD_POLL_LIVE_MS,
  MATCH_BOARD_POLL_MS,
  type MatchBoardCard,
  type MatchBoardPayload
} from "@/lib/fixtures/match-board-shared";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";
import {
  notifyLiveMatchGoal,
  type LiveMatchGoalChange
} from "@/lib/fixtures/live-match-events";
import { firePredictionConfetti } from "@/lib/predictions/celebrate-wins";

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

export function MatchBoardProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<MatchBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToastOptional();
  const previousGoalTotalsRef = useRef<Map<string, number> | null>(null);

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
  }, [load]);

  const hasLiveMatches = useMemo(() => {
    if ((payload?.live?.length ?? 0) > 0) return true;
    return Object.values(payload?.byKey ?? {}).some((state) => state.status === "live");
  }, [payload]);

  useEffect(() => {
    const pollMs = hasLiveMatches ? MATCH_BOARD_POLL_LIVE_MS : MATCH_BOARD_POLL_MS;
    const interval = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(interval);
  }, [hasLiveMatches, load]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [load]);

  useEffect(() => {
    if (!payload?.connected) return;

    const cardsByIdentity = new Map<string, MatchBoardCard>();
    for (const card of [...(payload.live ?? []), ...(payload.recentResults ?? [])]) {
      const identity = card.fixtureId ? `fixture:${card.fixtureId}` : `key:${card.fixtureKey}`;
      if (!cardsByIdentity.has(identity)) cardsByIdentity.set(identity, card);
    }

    const grouped = new Map<
      string,
      {
        fixtureKeys: string[];
        fixtureId: number | null;
        homeGoals: number;
        awayGoals: number;
        goalScorers: MatchBoardPayload["byKey"][string]["goalScorers"];
      }
    >();

    for (const [fixtureKey, state] of Object.entries(payload.byKey)) {
      if (state.homeGoals === null || state.awayGoals === null) continue;
      if (state.status !== "live" && state.status !== "finished") continue;

      const identity = state.fixtureId ? `fixture:${state.fixtureId}` : `key:${fixtureKey}`;
      const existing = grouped.get(identity);
      if (existing) {
        existing.fixtureKeys.push(fixtureKey);
        if (state.goalScorers.length > existing.goalScorers.length) {
          existing.goalScorers = state.goalScorers;
        }
      } else {
        grouped.set(identity, {
          fixtureKeys: [fixtureKey],
          fixtureId: state.fixtureId,
          homeGoals: state.homeGoals,
          awayGoals: state.awayGoals,
          goalScorers: state.goalScorers
        });
      }
    }

    const nextTotals = new Map<string, number>();
    const previousTotals = previousGoalTotalsRef.current;
    const changes: LiveMatchGoalChange[] = [];

    for (const [identity, entry] of grouped) {
      const total = entry.homeGoals + entry.awayGoals;
      nextTotals.set(identity, total);

      const previous = previousTotals?.get(identity);
      if (previous === undefined || total <= previous) continue;

      const card = cardsByIdentity.get(identity);
      const fixtureKey =
        entry.fixtureKeys.find((key) => !key.startsWith("api-football:")) ?? entry.fixtureKeys[0]!;
      const fallbackLabel = fixtureKeyToShortLabel(fixtureKey);
      changes.push({
        fixtureKey,
        fixtureKeys: entry.fixtureKeys,
        fixtureId: entry.fixtureId,
        label: card ? `${card.homeTeam} vs ${card.awayTeam}` : fallbackLabel,
        homeGoals: entry.homeGoals,
        awayGoals: entry.awayGoals,
        goalDelta: total - previous,
        goalScorers: entry.goalScorers
      });
    }

    previousGoalTotalsRef.current = nextTotals;
    if (!previousTotals || changes.length === 0) return;

    notifyLiveMatchGoal({ changes });

    for (const change of changes) {
      const bursts = Math.min(change.goalDelta, 3);
      for (let index = 0; index < bursts; index += 1) {
        window.setTimeout(() => void firePredictionConfetti("live"), index * 650);
      }
    }

    const first = changes[0]!;
    const extraGoals = changes.reduce((sum, change) => sum + change.goalDelta, 0) - first.goalDelta;
    const suffix = extraGoals > 0 ? ` (+${extraGoals} more)` : "";
    toast?.showToast({
      message: `Goal! ${first.label} ${first.homeGoals}-${first.awayGoals}${suffix}`,
      variant: "success",
      durationMs: 5200
    });
  }, [payload, toast]);

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
