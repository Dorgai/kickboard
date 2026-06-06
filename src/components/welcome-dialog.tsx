"use client";

import { ArrowRight, LayoutGrid, LogIn, Target, Trophy, Users } from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { OPEN_WELCOME_EVENT } from "@/lib/help/events";
import { writeLocationHash } from "@/lib/navigation/location-hash";
import { celebrateWelcomeStart } from "@/lib/welcome/celebrate";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/welcome";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";

const HIGHLIGHTS = [
  {
    icon: Target,
    title: "Predictions",
    line: "Pick scores and outcomes. Climb the points board.",
    hash: "predictions",
    accent: "predictions"
  },
  {
    icon: LayoutGrid,
    title: "Coach Board",
    line: "Set lineups for any match — drag players onto the pitch.",
    hash: "coach-board",
    accent: "coach"
  },
  {
    icon: Trophy,
    title: "Tournament",
    line: "Groups, fixtures, and the road to the final.",
    hash: "tournament",
    accent: "tournament"
  },
  {
    icon: Users,
    title: "Community",
    line: "Add friends, share boards, and compare picks.",
    hash: "community",
    accent: "community"
  }
] as const;

export function WelcomeDialog() {
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
    return () => window.cancelAnimationFrame(frame);
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

  function handleSignIn() {
    closeWelcome();
    void signIn("google", {
      callbackUrl: typeof window !== "undefined" ? window.location.href : "/"
    });
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
      <div className="welcome-dialog-panel kickboard-hero-backdrop">
        <div className="welcome-dialog-shell">
          <header className="welcome-dialog-header">
            <p className="welcome-dialog-eyebrow">World Cup 2026</p>
            <h2 id={titleId}>Welcome to Kickboard</h2>
            <p className="welcome-dialog-lead">
              Predict matches, build squads, follow the tournament, and connect with fans — all in one
              place.
            </p>
          </header>

          <div className="welcome-dialog-actions" role="list">
            {HIGHLIGHTS.map((item) => (
              <button
                key={item.title}
                className={`welcome-dialog-action welcome-dialog-action--${item.accent}`}
                role="listitem"
                type="button"
                onClick={() => goToSection(item.hash)}
              >
                <span className="welcome-dialog-action-icon" aria-hidden>
                  <item.icon size={22} strokeWidth={2.25} />
                </span>
                <span className="welcome-dialog-action-copy">
                  <strong>{item.title}</strong>
                  <span>{item.line}</span>
                </span>
                <ArrowRight aria-hidden className="welcome-dialog-action-arrow" size={18} />
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
              Start exploring
            </button>
            <button className="button welcome-dialog-cta-secondary" type="button" onClick={handleSignIn}>
              <LogIn aria-hidden size={18} strokeWidth={2.25} />
              Sign in with Google
            </button>
            <p className="welcome-dialog-footnote">Free to browse. Sign in to save picks, squads, and chat.</p>
          </footer>
        </div>
      </div>
    </dialog>
  );
}
