"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { PREDICTION_ACTIVITY_EVENT } from "@/lib/fixture-predictions/activity-events";
import { findUserPredictionForFixture } from "@/lib/fixture-predictions/find-for-fixture";
import type { FixturePredictionRecord } from "@/lib/fixture-predictions/types";

export function useTournamentFixturePredictions() {
  const { data: session, status } = useSession();
  const [predictions, setPredictions] = useState<FixturePredictionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/fixture-predictions/schedule-map", { cache: "no-store" });
      if (!response.ok) {
        setPredictions([]);
        return;
      }
      const payload = (await response.json()) as { predictions?: FixturePredictionRecord[] };
      setPredictions(payload.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.onboardingComplete, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onActivity() {
      void load();
    }
    window.addEventListener(PREDICTION_ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(PREDICTION_ACTIVITY_EVENT, onActivity);
  }, [load]);

  const lookup = useCallback(
    (input: { fixtureKey: string; homeTeam: string; awayTeam: string }) =>
      findUserPredictionForFixture(predictions, input),
    [predictions]
  );

  return { lookup, loading, predictions };
}
