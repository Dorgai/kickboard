"use client";

import { Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  canShowTipToday,
  markTipShown,
  pickNextTip
} from "@/lib/onboarding-tips/client-storage";
import { hasSeenWelcome } from "@/lib/welcome";
import type { OnboardingTip } from "@/lib/onboarding-tips/types";
import {
  ONBOARDING_TIPS_FLOW_MS,
  ONBOARDING_TIPS_GAP_MS,
  ONBOARDING_TIPS_VISIBLE_MS
} from "@/lib/onboarding-tips/types";

export function OnboardingTipsFloater() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const onboardingComplete = Boolean(session?.user?.onboardingComplete);

  const [tips, setTips] = useState<OnboardingTip[]>([]);
  const [eligible, setEligible] = useState(false);
  const [activeTip, setActiveTip] = useState<OnboardingTip | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  const hideTimerRef = useRef<number | null>(null);
  const gapTimerRef = useRef<number | null>(null);
  const flowTimerRef = useRef<number | null>(null);
  const showingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (gapTimerRef.current !== null) {
      window.clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    if (flowTimerRef.current !== null) {
      window.clearTimeout(flowTimerRef.current);
      flowTimerRef.current = null;
    }
  }, []);

  const flowOut = useCallback(
    (scheduleNext: boolean) => {
      if (!showingRef.current) return;
      showingRef.current = false;
      setVisible(false);

      if (flowTimerRef.current !== null) {
        window.clearTimeout(flowTimerRef.current);
      }
      flowTimerRef.current = window.setTimeout(() => {
        setActiveTip(null);
        flowTimerRef.current = null;
        if (!scheduleNext || !userId || !canShowTipToday(userId)) return;

        gapTimerRef.current = window.setTimeout(() => {
          gapTimerRef.current = null;
          void showNextTipRef.current();
        }, ONBOARDING_TIPS_GAP_MS);
      }, ONBOARDING_TIPS_FLOW_MS);
    },
    [userId]
  );

  const showNextTipRef = useRef<() => Promise<void>>(async () => undefined);

  const dismissTip = useCallback(
    (scheduleNext = true) => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      flowOut(scheduleNext);
    },
    [flowOut]
  );

  const showTip = useCallback(
    (tip: OnboardingTip) => {
      if (!userId || !canShowTipToday(userId)) return;

      markTipShown(userId, tip.id);
      showingRef.current = true;
      setActiveTip(tip);
      setVisible(false);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });

      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        dismissTip(true);
      }, ONBOARDING_TIPS_VISIBLE_MS);
    },
    [dismissTip, userId]
  );

  const showNextTip = useCallback(async () => {
    if (!userId || !canShowTipToday(userId) || showingRef.current) return;

    let pool = tips;
    try {
      const response = await fetch("/api/onboarding-tips", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as {
          eligible?: boolean;
          tips?: OnboardingTip[];
        };
        if (!payload.eligible) return;
        if (payload.tips?.length) {
          pool = payload.tips;
          setTips(payload.tips);
        }
      }
    } catch {
      /* use cached tips */
    }

    const next = pickNextTip(userId, pool);
    if (!next) return;
    showTip(next);
  }, [showTip, tips, userId]);

  showNextTipRef.current = showNextTip;

  useEffect(() => {
    if (status !== "authenticated" || !userId || !onboardingComplete) {
      setEligible(false);
      setTips([]);
      return;
    }

    let cancelled = false;

    async function loadTips() {
      try {
        const response = await fetch("/api/onboarding-tips", { cache: "no-store" });
        const payload = (await response.json()) as {
          eligible?: boolean;
          tips?: OnboardingTip[];
        };
        if (cancelled) return;
        setEligible(Boolean(payload.eligible));
        setTips(payload.tips ?? []);
      } catch {
        if (!cancelled) {
          setEligible(false);
          setTips([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void loadTips();
    return () => {
      cancelled = true;
    };
  }, [onboardingComplete, status, userId]);

  useEffect(() => {
    if (!ready || !eligible || !userId || tips.length === 0) return;
    const uid = userId;
    if (!canShowTipToday(uid)) return;

    function beginTips() {
      if (!canShowTipToday(uid)) return;
      gapTimerRef.current = window.setTimeout(() => {
        gapTimerRef.current = null;
        void showNextTipRef.current();
      }, 2400);
    }

    if (!hasSeenWelcome()) {
      window.addEventListener("kickboard:welcome-dismissed", beginTips, { once: true });
      const fallback = window.setTimeout(beginTips, 8000);
      return () => {
        window.removeEventListener("kickboard:welcome-dismissed", beginTips);
        window.clearTimeout(fallback);
        clearTimers();
        showingRef.current = false;
        setVisible(false);
        setActiveTip(null);
      };
    }

    beginTips();
    return () => {
      clearTimers();
      showingRef.current = false;
      setVisible(false);
      setActiveTip(null);
    };
  }, [clearTimers, eligible, ready, tips.length, userId]);

  if (!activeTip) return null;

  return (
    <div
      aria-live="polite"
      className={`onboarding-tip-floater${visible ? " onboarding-tip-floater--visible" : ""}`}
      role="status"
    >
      <div className="onboarding-tip-floater-card data-card">
        <span aria-hidden className="onboarding-tip-floater-icon">
          <Lightbulb size={16} />
        </span>
        <p className="onboarding-tip-floater-message">{activeTip.message}</p>
        <button
          aria-label="Dismiss tip"
          className="onboarding-tip-floater-close"
          type="button"
          onClick={() => dismissTip(true)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
