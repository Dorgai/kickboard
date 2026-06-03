"use client";

import { LayoutGrid, PartyPopper, Sparkles, Target, Trophy, Users } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { OPEN_WELCOME_EVENT } from "@/lib/help/events";
import { startWelcomeFireworks } from "@/lib/welcome-celebration";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/welcome";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";

const HIGHLIGHTS = [
  {
    icon: Target,
    title: "Predictions",
    line: "Call the score, stack points, and share your hottest takes."
  },
  {
    icon: LayoutGrid,
    title: "Coach Board",
    line: "Build XIs for any match — drag players straight onto the pitch."
  },
  {
    icon: Trophy,
    title: "Tournament",
    line: "Follow groups, knockouts, and every step to the final."
  },
  {
    icon: Users,
    title: "Community",
    line: "Add friends, compare picks, and cheer together."
  }
] as const;

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    if (!open) return;
    return startWelcomeFireworks();
  }, [open]);

  function dismiss() {
    markWelcomeSeen();
    setForced(false);
    setOpen(false);
    window.dispatchEvent(new Event("kickboard:welcome-dismissed"));
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
        dismiss();
      }}
      onClick={(event) => closeDialogOnBackdropClick(event, dismiss)}
      onClose={dismiss}
    >
      <div className="welcome-dialog-panel">
        <header className="welcome-dialog-header">
          <p className="welcome-dialog-eyebrow">
            <Sparkles aria-hidden size={14} strokeWidth={2.5} />
            You&apos;re in — World Cup 2026
          </p>
          <div aria-hidden className="welcome-dialog-hero-icon">
            <PartyPopper size={40} strokeWidth={1.75} />
          </div>
          <h2 id={titleId}>Welcome to Kickboard!</h2>
          <p className="welcome-dialog-lead">
            Your fan HQ is live. Predict, coach, follow the bracket, and rally your crew.
          </p>
        </header>

        <ul className="welcome-dialog-highlights">
          {HIGHLIGHTS.map((item) => (
            <li className="welcome-dialog-highlight" key={item.title}>
              <span className="welcome-dialog-icon" aria-hidden>
                <item.icon size={26} strokeWidth={2} />
              </span>
              <span className="welcome-dialog-copy">
                <strong>{item.title}</strong>
                <span>{item.line}</span>
              </span>
            </li>
          ))}
        </ul>

        <footer className="welcome-dialog-footer">
          <button className="button welcome-dialog-cta" type="button" onClick={dismiss}>
            Let&apos;s kick off
          </button>
          <p className="welcome-dialog-footnote">Sign in anytime for squads, chat, and saved picks.</p>
        </footer>
      </div>
    </dialog>
  );
}
