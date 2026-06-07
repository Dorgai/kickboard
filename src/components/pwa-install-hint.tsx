"use client";

import { BrandMark } from "@/components/brand-logo";
import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isIosSafari, isStandaloneDisplayMode } from "@/lib/pwa/standalone";

const DISMISS_KEY = "kickboard-pwa-install-hint-dismissed";

export function PwaInstallHint() {
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
    <aside className="pwa-install-hint" aria-label="Install MyPicks">
      <div className="pwa-install-hint-inner">
        <BrandMark className="pwa-install-hint-mark" size={44} />
        <p className="pwa-install-hint-title">Add MyPicks Live to your home screen</p>
        {ios ? (
          <p className="pwa-install-hint-copy">
            Tap <Share aria-hidden size={14} className="pwa-install-hint-icon" /> Share, then{" "}
            <strong>Add to Home Screen</strong> for a full-screen app experience.
          </p>
        ) : (
          <p className="pwa-install-hint-copy">
            Install MyPicks from your browser menu for quick access and a full-screen view.
          </p>
        )}
        <div className="pwa-install-hint-actions">
          <button className="button secondary" type="button" onClick={dismiss}>
            Not now
          </button>
        </div>
        <button
          aria-label="Dismiss install hint"
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
