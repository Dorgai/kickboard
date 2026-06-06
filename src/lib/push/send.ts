import webpush from "web-push";
import {
  deletePushSubscription,
  listPushSubscriptionsForUser,
  userPushNotificationsEnabled
} from "@/lib/push/store";
import { getVapidPublicKey, getVapidSubject, isWebPushConfigured } from "@/lib/push/vapid";

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured || !isWebPushConfigured()) return;
  webpush.setVapidDetails(
    getVapidSubject(),
    getVapidPublicKey()!,
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  vapidConfigured = true;
}

export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<number> {
  if (!isWebPushConfigured()) return 0;
  if (!(await userPushNotificationsEnabled(userId))) return 0;

  ensureVapid();

  const subscriptions = await listPushSubscriptionsForUser(userId);
  if (!subscriptions.length) return 0;

  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 240),
    url: payload.url?.slice(0, 200) || "/",
    tag: payload.tag?.slice(0, 64) || "kickboard"
  });

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          body
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(userId, subscription.endpoint);
        }
      }
    })
  );

  return sent;
}

/** Fire-and-forget push — never blocks the caller on network I/O failures. */
export function notifyUserPush(userId: string, payload: WebPushPayload) {
  void sendWebPushToUser(userId, payload).catch(() => undefined);
}
