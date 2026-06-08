"use client";

import { BrandWordmark } from "@/components/brand-wordmark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useTranslation } from "@/components/locale-provider";
import { useEffect, useId, useRef, useState } from "react";
import { OPEN_WELCOME_EVENT } from "@/lib/help/events";
import { writeLocationHash } from "@/lib/navigation/location-hash";
import { celebrateWelcomeStart } from "@/lib/welcome/celebrate";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/welcome";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";

const HIGHLIGHT_HASHES = [
  { titleKey: "welcome.highlights.predictionsTitle" as const, lineKey: "welcome.highlights.predictionsLine" as const, hash: "predictions" },
  { titleKey: "welcome.highlights.coachBoardTitle" as const, lineKey: "welcome.highlights.coachBoardLine" as const, hash: "coach-board" },
  { titleKey: "welcome.highlights.tournamentTitle" as const, lineKey: "welcome.highlights.tournamentLine" as const, hash: "tournament" },
  { titleKey: "welcome.highlights.communityTitle" as const, lineKey: "welcome.highlights.communityLine" as const, hash: "community" }
] as const;

export function WelcomeDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryCtaRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    function onOpenWelcome() {
      setForced(true);
      setOpen(true);
    }
    window.addEventListener(OPEN_WELCOME_EVENT, onOpenWelcome);
    return () => window.removeEventListener(OPEN_WELCOME_EVENT, onOpenWelcome);
  }, []);

  useEffect(() => {
    if (hasSeenWelcome()) return;
    const frame = window.requestAnimationFrame(() => setOpen(true));
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !hasSeenWelcome()) {
        setOpen(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function closeWelcome() {
    markWelcomeSeen();
    setForced(false);
    setOpen(false);
    window.dispatchEvent(new Event("kickboard:welcome-dismissed"));
  }

  function goToSection(hash: string) {
    writeLocationHash(hash);
    closeWelcome();
  }

  function handleStartExploring() {
    celebrateWelcomeStart(primaryCtaRef.current);
    writeLocationHash("predictions");
    window.setTimeout(() => closeWelcome(), 520);
  }

  if (hasSeenWelcome() && !open && !forced) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="timeline-modal welcome-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeWelcome();
      }}
      onClick={(event) => closeDialogOnBackdropClick(event, closeWelcome)}
      onClose={closeWelcome}
    >
      <div className="welcome-dialog-panel kickboard-hero-backdrop kickboard-hero-backdrop--nico-accent">
        <div className="welcome-dialog-shell">
          <header className="welcome-dialog-header">
            <BrandWordmark className="welcome-dialog-brand" />
            <p className="welcome-dialog-eyebrow">{t("welcome.eyebrow")}</p>
            <h2 id={titleId}>{t("welcome.title")}</h2>
            <p className="welcome-dialog-lead">{t("welcome.lead")}</p>
          </header>

          <div className="welcome-dialog-actions" role="list">
            {HIGHLIGHT_HASHES.map((item) => (
              <button
                key={item.hash}
                className="welcome-dialog-action"
                role="listitem"
                type="button"
                onClick={() => goToSection(item.hash)}
              >
                <span className="welcome-dialog-action-copy">
                  <strong>{t(item.titleKey)}</strong>
                  <span>{t(item.lineKey)}</span>
                </span>
              </button>
            ))}
          </div>

          <footer className="welcome-dialog-footer">
            <button
              ref={primaryCtaRef}
              className="button welcome-dialog-cta-primary"
              type="button"
              onClick={handleStartExploring}
            >
              {t("welcome.startExploring")}
            </button>
            <GoogleSignInButton
              className="welcome-dialog-google-sign-in"
              onBeforeSignIn={closeWelcome}
            />
            <p className="welcome-dialog-footnote">{t("welcome.footnote")}</p>
          </footer>
        </div>
      </div>
    </dialog>
  );
}
