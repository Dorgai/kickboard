"use client";

import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import { isIosSafari, isStandaloneDisplayMode } from "@/lib/pwa/standalone";

const DISMISS_KEY = "kickboard-pwa-install-hint-dismissed";

export function PwaInstallHint() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplayMode()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    if (!narrow && !isIosSafari()) return;

    const delay = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(delay);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  const ios = isIosSafari();

  return (
    <aside className="pwa-install-hint" aria-label={t("pwa.installAria")}>
      <div className="pwa-install-hint-inner">
        <p className="pwa-install-hint-title">{t("pwa.title")}</p>
        {ios ? (
          <p className="pwa-install-hint-copy">
            {t("pwa.iosBeforeShare")}{" "}
            <Share aria-hidden size={14} className="pwa-install-hint-icon" /> {t("pwa.iosShare")}
            {t("pwa.iosAfterShare")} <strong>{t("pwa.iosAddToHomeScreen")}</strong> {t("pwa.iosTail")}
          </p>
        ) : (
          <p className="pwa-install-hint-copy">{t("pwa.androidCopy")}</p>
        )}
        <div className="pwa-install-hint-actions">
          <button className="button secondary" type="button" onClick={dismiss}>
            {t("pwa.notNow")}
          </button>
        </div>
        <button
          aria-label={t("pwa.dismissAria")}
          className="pwa-install-hint-close"
          type="button"
          onClick={dismiss}
        >
          <X size={18} />
        </button>
      </div>
    </aside>
  );
}
