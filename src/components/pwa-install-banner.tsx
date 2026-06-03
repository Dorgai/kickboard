"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "kickboard:pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isMobileOrTablet() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1024px)").matches;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function PwaInstallBanner() {
  const { status } = useSession();
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobileOrTablet() || isStandaloneDisplay()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    setVisible(true);
    setIosHint(isIosSafari());

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") dismiss();
    setInstallEvent(null);
  }, [dismiss, installEvent]);

  const enablePush = useCallback(async () => {
    if (status !== "authenticated") {
      setPushMessage("Sign in to enable match and connection alerts.");
      return;
    }
    if (!("Notification" in window)) {
      setPushMessage("Notifications are not supported on this browser.");
      return;
    }

    setPushBusy(true);
    setPushMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMessage("Allow notifications in your browser settings to get daily match alerts.");
        return;
      }
      window.dispatchEvent(new Event("kickboard:push-enabled"));
      setPushMessage("Alerts enabled — you will get daily match reminders and connection updates.");
    } finally {
      setPushBusy(false);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <aside className="pwa-install-banner" aria-label="Install Kickboard app">
      <div className="pwa-install-banner-inner">
        <div className="pwa-install-banner-icon" aria-hidden>
          <img alt="" height={40} src="/logo.svg" width={40} />
        </div>
        <div className="pwa-install-banner-copy">
          <p className="pwa-install-banner-title">Add Kickboard to your home screen</p>
          {iosHint ? (
            <p className="pwa-install-banner-lead">
              Tap <Share className="pwa-install-inline-icon" aria-hidden size={14} /> Share, then{" "}
              <strong>Add to Home Screen</strong> for quick access.
            </p>
          ) : (
            <p className="pwa-install-banner-lead">
              Install the app for one-tap access to fixtures, Coach Board, and predictions.
            </p>
          )}
          {pushMessage ? <p className="pwa-install-banner-status">{pushMessage}</p> : null}
        </div>
        <div className="pwa-install-banner-actions">
          {installEvent ? (
            <button className="button button-primary" type="button" onClick={() => void install()}>
              <Download aria-hidden size={16} />
              Install
            </button>
          ) : iosHint ? (
            <span className="pwa-install-banner-badge">
              <Smartphone aria-hidden size={16} />
              iOS / iPad
            </span>
          ) : null}
          <button
            className="button"
            disabled={pushBusy}
            type="button"
            onClick={() => void enablePush()}
          >
            {pushBusy ? "Enabling…" : "Enable alerts"}
          </button>
          <button
            aria-label="Dismiss install banner"
            className="pwa-install-banner-close"
            type="button"
            onClick={dismiss}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
