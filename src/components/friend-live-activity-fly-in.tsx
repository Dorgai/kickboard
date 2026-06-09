"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import {
  FRIEND_LIVE_ACTIVITY_EXIT_MS,
  FRIEND_LIVE_ACTIVITY_POLL_MS,
  FRIEND_LIVE_ACTIVITY_VISIBLE_MS,
  type LiveConnectionActivityItem
} from "@/lib/friends-activity/live-fly-in";
import { writeLocationHash } from "@/lib/navigation/location-hash";
import { PREDICTION_ACTIVITY_EVENT } from "@/lib/fixture-predictions/activity-events";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";
import { hasSeenWelcome } from "@/lib/welcome";

type FlyInPhase = "enter" | "exit";

export function FriendLiveActivityFlyIn() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const userId = session?.user?.id ?? null;
  const onboardingComplete = Boolean(session?.user?.onboardingComplete);

  const [active, setActive] = useState<LiveConnectionActivityItem | null>(null);
  const [phase, setPhase] = useState<FlyInPhase>("enter");

  const queueRef = useRef<LiveConnectionActivityItem[]>([]);
  const showingRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastPollAtRef = useRef<string | null>(null);
  const visibleTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const pollInFlightRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (visibleTimerRef.current !== null) {
      window.clearTimeout(visibleTimerRef.current);
      visibleTimerRef.current = null;
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      showingRef.current = false;
      setActive(null);
      return;
    }

    showingRef.current = true;
    setPhase("enter");
    setActive(next);
    clearTimers();

    visibleTimerRef.current = window.setTimeout(() => {
      setPhase("exit");
      exitTimerRef.current = window.setTimeout(() => {
        setActive(null);
        showingRef.current = false;
        showNext();
      }, FRIEND_LIVE_ACTIVITY_EXIT_MS);
    }, FRIEND_LIVE_ACTIVITY_VISIBLE_MS);
  }, [clearTimers]);

  const enqueue = useCallback(
    (items: LiveConnectionActivityItem[]) => {
      for (const item of items) {
        if (seenIdsRef.current.has(item.id)) continue;
        seenIdsRef.current.add(item.id);
        queueRef.current.push(item);
      }
      if (!showingRef.current) {
        showNext();
      }
    },
    [showNext]
  );

  const poll = useCallback(async () => {
    if (pollInFlightRef.current) return;
    if (status !== "authenticated" || !userId || !onboardingComplete) return;
    if (!hasSeenWelcome()) return;
    if (document.visibilityState !== "visible") return;
    if (!lastPollAtRef.current) return;

    pollInFlightRef.current = true;
    try {
      const since = lastPollAtRef.current;
      const response = await fetch(
        `/api/connections/live-activity?since=${encodeURIComponent(since)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;

      const payload = (await response.json()) as {
        activities?: LiveConnectionActivityItem[];
        polledAt?: string;
      };

      lastPollAtRef.current = payload.polledAt ?? new Date().toISOString();
      enqueue(payload.activities ?? []);
    } finally {
      pollInFlightRef.current = false;
    }
  }, [enqueue, onboardingComplete, status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || !userId || !onboardingComplete) return;

    lastPollAtRef.current = new Date().toISOString();
    seenIdsRef.current = new Set();
    queueRef.current = [];
    showingRef.current = false;
    setActive(null);
    clearTimers();

    const boot = window.setTimeout(() => {
      void poll();
    }, 800);

    const interval = window.setInterval(() => {
      void poll();
    }, FRIEND_LIVE_ACTIVITY_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };

    const onPredictionActivity = () => {
      window.setTimeout(() => void poll(), 450);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(PREDICTION_ACTIVITY_EVENT, onPredictionActivity);

    return () => {
      window.clearTimeout(boot);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(PREDICTION_ACTIVITY_EVENT, onPredictionActivity);
      clearTimers();
    };
  }, [clearTimers, onboardingComplete, poll, status, userId]);

  if (status !== "authenticated" || !userId || !onboardingComplete || !active) {
    return null;
  }

  function dismissEarly() {
    clearTimers();
    setPhase("exit");
    exitTimerRef.current = window.setTimeout(() => {
      setActive(null);
      showingRef.current = false;
      showNext();
    }, FRIEND_LIVE_ACTIVITY_EXIT_MS);
  }

  function openActivity(item: LiveConnectionActivityItem) {
    dismissEarly();
    if (item.fixtureKey) {
      navigateToPredictFixture(item.fixtureKey);
      return;
    }
    if (item.href.includes("#")) {
      const hash = item.href.split("#")[1] ?? "";
      if (hash) writeLocationHash(hash);
      return;
    }
    writeLocationHash("predictions");
  }

  return (
    <div className="friend-live-activity-layer" role="status" aria-live="assertive">
      <article
        className={`friend-live-activity-card${phase === "exit" ? " friend-live-activity-card--exit" : ""}`}
      >
        <p className="friend-live-activity-eyebrow">{t("friendLiveActivity.eyebrow")}</p>
        <button
          className="friend-live-activity-open"
          type="button"
          onClick={() => openActivity(active)}
        >
          <strong>{active.title}</strong>
          <span>{active.body}</span>
        </button>
        <button
          className="friend-live-activity-dismiss"
          type="button"
          onClick={dismissEarly}
        >
          {t("friendLiveActivity.dismiss")}
        </button>
      </article>
    </div>
  );
}
