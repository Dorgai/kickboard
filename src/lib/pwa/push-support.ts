import { isIosSafari, isStandaloneDisplayMode } from "@/lib/pwa/standalone";

export type WebPushBlockReason =
  | "no-service-worker"
  | "no-push-manager"
  | "no-notification-api"
  | "ios-needs-home-screen";

export function webPushBlockReason(): WebPushBlockReason | null {
  if (typeof window === "undefined") return "no-notification-api";
  if (!("serviceWorker" in navigator)) return "no-service-worker";
  if (!("PushManager" in window)) return "no-push-manager";
  if (!("Notification" in window)) return "no-notification-api";
  if (isIosSafari() && !isStandaloneDisplayMode()) return "ios-needs-home-screen";
  return null;
}

export function canSubscribeToWebPush() {
  return webPushBlockReason() === null;
}
