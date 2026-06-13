"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import {
  fetchPushSubscriptionStatus,
  requestPushPermissionAndSubscribe
} from "@/lib/push/subscribe-client";
import { canSubscribeToWebPush, webPushBlockReason } from "@/lib/pwa/push-support";

export function PushNotificationsPrompt() {
  const { t } = useTranslation();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    const status = await fetchPushSubscriptionStatus();
    if (!status) {
      setConfigured(null);
      return;
    }
    setConfigured(Boolean(status.configured));
    setSubscriptionCount(status.subscriptionCount ?? 0);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (configured === false) {
    return <p className="notifications-push-hint inline-status">{t("notifications.pushNotConfigured")}</p>;
  }

  const blockReason = webPushBlockReason();
  if (blockReason === "ios-needs-home-screen") {
    return <p className="notifications-push-hint inline-status">{t("notifications.pushIosInstall")}</p>;
  }

  if (!canSubscribeToWebPush() || permission === "unsupported") {
    return null;
  }

  if (permission === "granted" && subscriptionCount > 0) {
    return null;
  }

  async function enablePush() {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await requestPushPermissionAndSubscribe();
      await refresh();
      if (!ok) {
        setMessage(t("notifications.pushEnableFailed"));
      }
    } catch {
      setMessage(t("notifications.pushEnableFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notifications-push-hint">
      {permission === "denied" ? (
        <p className="inline-status">{t("notifications.pushDenied")}</p>
      ) : (
        <>
          <p className="inline-status">{t("notifications.pushEnableHint")}</p>
          <button className="button secondary" disabled={busy} type="button" onClick={() => void enablePush()}>
            {busy ? t("notifications.pushEnabling") : t("notifications.pushEnable")}
          </button>
        </>
      )}
      {message ? <p className="inline-status">{message}</p> : null}
    </div>
  );
}
