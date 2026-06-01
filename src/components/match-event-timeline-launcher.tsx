"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MatchEventTimeline } from "@/components/match-event-timeline";

type MatchEventTimelineLauncherProps = {
  matchId: number;
};

export function MatchEventTimelineLauncher({ matchId }: MatchEventTimelineLauncherProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  function close() {
    setOpen(false);
  }

  return (
    <>
      <p className="match-timeline-link-row">
        <button className="text-button match-timeline-open" type="button" onClick={() => setOpen(true)}>
          View event timeline
        </button>
        <span className="match-timeline-link-caption">StatsBomb match events open in a popup</span>
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="timeline-modal"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={close}
      >
        <div className="timeline-modal-panel">
          <header className="timeline-modal-header">
            <div>
              <p className="eyebrow">Match events</p>
              <h2 id={titleId}>Event timeline</h2>
            </div>
            <button className="button secondary timeline-modal-close" type="button" onClick={close}>
              Close
            </button>
          </header>
          <div className="timeline-modal-body">
            {open ? <MatchEventTimeline enabled inModal matchId={matchId} /> : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
