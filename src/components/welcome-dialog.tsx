"use client";

import { LayoutGrid, Target, Trophy, Users } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/welcome";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";

const HIGHLIGHTS = [
  {
    icon: Target,
    title: "Predictions",
    line: "Pick scores and outcomes. Climb the points board."
  },
  {
    icon: LayoutGrid,
    title: "Coach Board",
    line: "Set lineups for any match — drag players onto the pitch."
  },
  {
    icon: Trophy,
    title: "Tournament",
    line: "Groups, fixtures, and the road to the final."
  },
  {
    icon: Users,
    title: "Community",
    line: "Add friends, share boards, and compare picks."
  }
] as const;

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  function dismiss() {
    markWelcomeSeen();
    setOpen(false);
  }

  if (hasSeenWelcome() && !open) {
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
          <p className="welcome-dialog-eyebrow">World Cup 2026</p>
          <h2 id={titleId}>Welcome to Kickboard</h2>
          <p className="welcome-dialog-lead">Everything fans need — in four tabs below.</p>
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
            Start exploring
          </button>
          <p className="welcome-dialog-footnote">Sign in anytime for squads, chat, and saved picks.</p>
        </footer>
      </div>
    </dialog>
  );
}
