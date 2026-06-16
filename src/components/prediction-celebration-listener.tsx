"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { useToastOptional } from "@/components/toast-provider";
import {
  loadPredictionStatusSnapshot,
  savePredictionStatusSnapshot
} from "@/lib/predictions/celebration-storage";
import { PREDICTION_ACTIVITY_EVENT } from "@/lib/fixture-predictions/activity-events";
import { PREDICTION_BLOCK_SHORT } from "@/lib/fixture-predictions/labels";
import {
  LIVE_MATCH_GOAL_EVENT,
  type LiveMatchGoalChange,
  type LiveMatchGoalEventDetail
} from "@/lib/fixtures/live-match-events";
import { scoreFixturePrediction } from "@/lib/fixture-predictions/scoring";
import { parseScorerPicks, type FixtureOutcome } from "@/lib/fixture-predictions/types";
import {
  detectNewPredictionWins,
  firePredictionConfetti,
  formatPredictionWinMessage,
  type PickForCelebration
} from "@/lib/predictions/celebrate-wins";

function isOnPredictionsTab() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  return hash === "predictions";
}

export function PredictionCelebrationListener() {
  const { data: session, status } = useSession();
  const toast = useToastOptional();
  const prevStatusRef = useRef(status);
  const loginCelebrateRef = useRef(false);
  const checkingRef = useRef(false);
  const liveCelebratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (prevStatusRef.current === "unauthenticated" && status === "authenticated") {
      loginCelebrateRef.current = true;
    }
    prevStatusRef.current = status;
  }, [status]);

  const runCelebration = useCallback(
    async (picks: PickForCelebration[]) => {
      const previous = loadPredictionStatusSnapshot();
      const { wins, snapshot } = detectNewPredictionWins(previous, picks);
      savePredictionStatusSnapshot(snapshot);

      if (wins.length === 0) return;

      const mode = loginCelebrateRef.current ? "login" : "live";
      loginCelebrateRef.current = false;

      await firePredictionConfetti(mode);
      const lead = mode === "login" ? "Welcome back — you scored! " : "You got it! ";
      toast?.showToast({
        message: `${lead}${formatPredictionWinMessage(wins)}`,
        variant: "success",
        durationMs: 6500
      });
    },
    [toast]
  );

  const checkForWins = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const response = await fetch("/api/predictions/overview", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { myPredictions?: PickForCelebration[] };
      const picks = payload.myPredictions ?? [];
      await runCelebration(picks);
    } finally {
      checkingRef.current = false;
    }
  }, [runCelebration, session?.user?.onboardingComplete, status]);

  const checkLiveGoalWins = useCallback(
    async (changes: LiveMatchGoalChange[]) => {
      if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
      if (changes.length === 0) return;

      const response = await fetch("/api/predictions/overview", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { myPredictions?: PickForCelebration[] };
      const picks = payload.myPredictions ?? [];
      if (picks.length === 0) return;

      const changesByKey = new Map<string, LiveMatchGoalChange>();
      for (const change of changes) {
        for (const key of change.fixtureKeys) {
          changesByKey.set(key, change);
        }
      }

      const liveWins: string[] = [];
      for (const pick of picks) {
        const change = changesByKey.get(pick.fixtureKey);
        if (!change) continue;

        const score = scoreFixturePrediction(
          {
            predictedOutcome:
              pick.predictedOutcome === "home" ||
              pick.predictedOutcome === "draw" ||
              pick.predictedOutcome === "away"
                ? (pick.predictedOutcome as FixtureOutcome)
                : null,
            homeScore: pick.homeScore,
            awayScore: pick.awayScore,
            scorerPicks: parseScorerPicks(pick.scorerPicks)
          },
          {
            homeGoals: change.homeGoals,
            awayGoals: change.awayGoals,
            goalScorers: change.goalScorers
          }
        );

        const categories = [
          pick.predictedOutcome && score.outcomeStatus === "won"
            ? { key: "outcome", label: PREDICTION_BLOCK_SHORT.outcome }
            : null,
          pick.homeScore !== null && pick.awayScore !== null && score.scoreStatus === "won"
            ? { key: "score", label: PREDICTION_BLOCK_SHORT.score }
            : null,
          Array.isArray(pick.scorerPicks) &&
          pick.scorerPicks.length > 0 &&
          (score.scorersStatus === "won" || score.scorersStatus === "partial")
            ? { key: "scorers", label: PREDICTION_BLOCK_SHORT.scorers }
            : null
        ].filter(Boolean) as { key: string; label: string }[];

        for (const category of categories) {
          const celebrationKey = `${pick.id}:${category.key}`;
          if (liveCelebratedRef.current.has(celebrationKey)) continue;
          liveCelebratedRef.current.add(celebrationKey);
          liveWins.push(`${change.label} — ${category.label}`);
        }
      }

      if (liveWins.length === 0) return;

      await firePredictionConfetti("live");
      toast?.showToast({
        message:
          liveWins.length === 1
            ? `You are right right now! ${liveWins[0]}`
            : `You are right right now! ${liveWins.length} live picks`,
        variant: "success",
        durationMs: 6500
      });
    },
    [session?.user?.onboardingComplete, status, toast]
  );

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;

    void checkForWins();

    const pollMs = () => (isOnPredictionsTab() ? 25_000 : 50_000);
    let interval = window.setInterval(() => void checkForWins(), pollMs());

    function onHashChange() {
      window.clearInterval(interval);
      interval = window.setInterval(() => void checkForWins(), pollMs());
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        void checkForWins();
      }
    }

    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForWins, session?.user?.onboardingComplete, status]);

  useEffect(() => {
    function onSaved() {
      window.setTimeout(() => void checkForWins(), 1200);
    }

    window.addEventListener(PREDICTION_ACTIVITY_EVENT, onSaved);
    return () => window.removeEventListener(PREDICTION_ACTIVITY_EVENT, onSaved);
  }, [checkForWins]);

  useEffect(() => {
    function onLiveGoal(event: Event) {
      const detail = (event as CustomEvent<LiveMatchGoalEventDetail>).detail;
      if (!detail?.changes?.length) return;
      void checkLiveGoalWins(detail.changes);
      window.setTimeout(() => void checkForWins(), 1200);
    }

    window.addEventListener(LIVE_MATCH_GOAL_EVENT, onLiveGoal);
    return () => window.removeEventListener(LIVE_MATCH_GOAL_EVENT, onLiveGoal);
  }, [checkForWins, checkLiveGoalWins]);

  return null;
}
