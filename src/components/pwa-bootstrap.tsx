"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export function PwaBootstrap() {
  const { status } = useSession();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => undefined);
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (subscribedRef.current) return;
    if (status !== "authenticated") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const keyResponse = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
    const keyPayload = (await keyResponse.json()) as {
      configured?: boolean;
      publicKey?: string | null;
    };
    if (!keyPayload.configured || !keyPayload.publicKey) return;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey)
      });
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return;

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, keys: { p256dh, auth } })
    });
    if (response.ok) subscribedRef.current = true;
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      subscribedRef.current = false;
      return;
    }
    if (Notification.permission === "granted") {
      void subscribeToPush();
    }
  }, [status, subscribeToPush]);

  useEffect(() => {
    function onEnabled() {
      void subscribeToPush();
    }
    window.addEventListener("kickboard:push-enabled", onEnabled);
    return () => window.removeEventListener("kickboard:push-enabled", onEnabled);
  }, [subscribeToPush]);

  return null;
}
