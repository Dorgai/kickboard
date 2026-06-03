"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { useToastOptional } from "@/components/toast-provider";
import {
  loadPredictionStatusSnapshot,
  savePredictionStatusSnapshot
} from "@/lib/predictions/celebration-storage";
import { PREDICTION_ACTIVITY_EVENT } from "@/lib/fixture-predictions/activity-events";
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

  return null;
}
