"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect } from "react";
import { isMobileOrTabletViewport } from "@/lib/pwa/mobile-tablet";
import { canSubscribeToWebPush } from "@/lib/pwa/push-support";
import {
  ensureKickboardServiceWorker,
  fetchPushSubscriptionStatus,
  requestPushPermissionAndSubscribe,
  subscribeToKickboardPush
} from "@/lib/push/subscribe-client";

const AUTO_PROMPT_KEY = "kickboard:push-auto-prompt-v2";

export function PushNotificationBootstrap() {
  const { data: session, status } = useSession();

  useEffect(() => {
    void ensureKickboardServiceWorker().catch(() => undefined);
  }, []);

  const syncSubscription = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    if (!canSubscribeToWebPush()) return;
    if (Notification.permission !== "granted") return;

    const pushStatus = await fetchPushSubscriptionStatus();
    if (!pushStatus?.configured) return;
    if ((pushStatus.subscriptionCount ?? 0) > 0) return;

    await subscribeToKickboardPush();
  }, [session?.user?.onboardingComplete, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    if (!("Notification" in window)) return;

    void (async () => {
      if (Notification.permission === "granted") {
        await syncSubscription();
        return;
      }

      if (!canSubscribeToWebPush()) return;

      const mobileOrTablet = isMobileOrTabletViewport();
      if (!mobileOrTablet || Notification.permission !== "default") return;
      if (localStorage.getItem(AUTO_PROMPT_KEY) === "1") return;

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        localStorage.setItem(AUTO_PROMPT_KEY, "1");
        return;
      }
      if (permission === "granted") {
        localStorage.setItem(AUTO_PROMPT_KEY, "1");
        await subscribeToKickboardPush();
      }
    })();
  }, [session?.user?.onboardingComplete, status, syncSubscription]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void syncSubscription();
    }

    function onPushEnabled() {
      void requestPushPermissionAndSubscribe();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("kickboard:push-enabled", onPushEnabled);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("kickboard:push-enabled", onPushEnabled);
    };
  }, [syncSubscription]);

  return null;
}
