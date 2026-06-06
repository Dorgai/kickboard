"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { isMobileOrTabletViewport } from "@/lib/pwa/mobile-tablet";
import { subscribeToKickboardPush } from "@/lib/push/subscribe-client";

const AUTO_PROMPT_KEY = "kickboard:push-auto-prompted";

export function PushNotificationBootstrap() {
  const { data: session, status } = useSession();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  const subscribe = useCallback(async () => {
    if (subscribedRef.current) return;
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    const ok = await subscribeToKickboardPush();
    if (ok) subscribedRef.current = true;
  }, [session?.user?.onboardingComplete, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) {
      subscribedRef.current = false;
      return;
    }
    if (!("Notification" in window)) return;

    const mobileOrTablet = isMobileOrTabletViewport();

    void (async () => {
      if (Notification.permission === "granted") {
        await subscribe();
        return;
      }

      if (!mobileOrTablet || Notification.permission !== "default") return;
      if (localStorage.getItem(AUTO_PROMPT_KEY) === "1") return;

      localStorage.setItem(AUTO_PROMPT_KEY, "1");
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribe();
      }
    })();
  }, [session?.user?.onboardingComplete, status, subscribe]);

  useEffect(() => {
    function onPushEnabled() {
      void subscribe();
    }
    window.addEventListener("kickboard:push-enabled", onPushEnabled);
    return () => window.removeEventListener("kickboard:push-enabled", onPushEnabled);
  }, [subscribe]);

  return null;
}
