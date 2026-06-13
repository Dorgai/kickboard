import { canSubscribeToWebPush } from "@/lib/pwa/push-support";

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

export async function ensureKickboardServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  let registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration?.active) {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  }

  await navigator.serviceWorker.ready;
  return registration;
}

export async function fetchPushSubscriptionStatus() {
  const response = await fetch("/api/push/status", { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as {
    configured?: boolean;
    pushEnabled?: boolean;
    subscriptionCount?: number;
  };
}

export async function subscribeToKickboardPush(): Promise<boolean> {
  if (!canSubscribeToWebPush()) return false;
  if (Notification.permission !== "granted") return false;

  const keyResponse = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
  const keyPayload = (await keyResponse.json()) as {
    configured?: boolean;
    publicKey?: string | null;
  };
  if (!keyPayload.configured || !keyPayload.publicKey) return false;

  const registration = await ensureKickboardServiceWorker();
  if (!registration) return false;

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
  if (!endpoint || !p256dh || !auth) return false;

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, keys: { p256dh, auth } })
  });

  return response.ok;
}

export async function requestPushPermissionAndSubscribe(): Promise<boolean> {
  if (!canSubscribeToWebPush()) return false;
  if (Notification.permission === "granted") {
    return subscribeToKickboardPush();
  }
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  return subscribeToKickboardPush();
}
