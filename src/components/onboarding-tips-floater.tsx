"use client";

import { Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  endTipsCampaign,
  getTipsCampaignState,
  isTipsCampaignActive,
  markTipShown,
  pickNextTip,
  startTipsCampaign
} from "@/lib/onboarding-tips/client-storage";
import { hasSeenWelcome } from "@/lib/welcome";
import type { OnboardingTip } from "@/lib/onboarding-tips/types";
import {
  ONBOARDING_TIPS_CAMPAIGN_MS,
  ONBOARDING_TIPS_INTERVAL_MS,
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
  const intervalRef = useRef<number | null>(null);
  const campaignTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (campaignTimerRef.current !== null) {
      window.clearTimeout(campaignTimerRef.current);
      campaignTimerRef.current = null;
    }
  }, []);

  const dismissTip = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => setActiveTip(null), 280);
  }, []);

  const showTip = useCallback(
    (tip: OnboardingTip) => {
      if (!userId) return;
      markTipShown(userId, tip.id);
      setActiveTip(tip);
      setVisible(true);

      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        dismissTip();
      }, ONBOARDING_TIPS_VISIBLE_MS);
    },
    [dismissTip, userId]
  );

  const showNextTip = useCallback(() => {
    if (!userId || !isTipsCampaignActive(userId)) return;
    const next = pickNextTip(userId, tips);
    if (!next) return;
    showTip(next);
  }, [showTip, tips, userId]);

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

    function beginCampaign() {
      const existing = getTipsCampaignState(uid);
      if (existing?.ended) return;

      const state = existing ?? startTipsCampaign(uid);
      const remaining = ONBOARDING_TIPS_CAMPAIGN_MS - (Date.now() - state.startedAt);
      if (remaining <= 0) {
        endTipsCampaign(uid);
        return;
      }

      campaignTimerRef.current = window.setTimeout(() => {
        endTipsCampaign(uid);
        dismissTip();
        clearTimers();
      }, remaining);

      window.setTimeout(() => {
        showNextTip();
      }, 2400);

      intervalRef.current = window.setInterval(() => {
        if (!isTipsCampaignActive(uid)) {
          clearTimers();
          return;
        }
        showNextTip();
      }, ONBOARDING_TIPS_INTERVAL_MS);
    }

    if (!hasSeenWelcome()) {
      window.addEventListener("kickboard:welcome-dismissed", beginCampaign, { once: true });
      const fallback = window.setTimeout(beginCampaign, 8000);
      return () => {
        window.removeEventListener("kickboard:welcome-dismissed", beginCampaign);
        window.clearTimeout(fallback);
        clearTimers();
      };
    }

    beginCampaign();
    return () => clearTimers();
  }, [clearTimers, dismissTip, eligible, ready, showNextTip, tips.length, userId]);

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
          onClick={dismissTip}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
