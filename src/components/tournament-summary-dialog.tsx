"use client";

import { useEffect, useId, useRef, useState } from "react";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";

export type TournamentSummary = {
  hostCountries: string | null;
  dates: string | null;
  teams: string | null;
  venueCount: string | null;
};

function SummaryTile({
  label,
  value,
  compact = false
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`summary-tile${compact ? " summary-tile--compact" : ""}`}>
      <span className="summary-tile-label">{label}</span>
      <strong className="summary-tile-value">{value}</strong>
    </div>
  );
}

type TournamentSummaryDialogProps = {
  title: string;
  summary: TournamentSummary;
  triggerClassName?: string;
};

export function TournamentSummaryDialog({
  title,
  summary,
  triggerClassName = "current-event-title-trigger"
}: TournamentSummaryDialogProps) {
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
      <button
        aria-haspopup="dialog"
        className={triggerClassName}
        type="button"
        onClick={() => setOpen(true)}
      >
        {title}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="timeline-modal tournament-summary-modal"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => closeDialogOnBackdropClick(event, close)}
        onClose={close}
      >
        <div className="timeline-modal-panel">
          <header className="timeline-modal-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h2 id={titleId}>{title}</h2>
            </div>
            <button className="button secondary timeline-modal-close" type="button" onClick={close}>
              Close
            </button>
          </header>
          <div className="timeline-modal-body">
            <div className="current-summary-grid current-summary-grid--popup">
              <SummaryTile label="Hosts" value={summary.hostCountries ?? "—"} />
              <SummaryTile label="Dates" value={summary.dates ?? "—"} />
              <SummaryTile label="Teams" value={summary.teams ?? "—"} />
              <SummaryTile label="Venues" value={summary.venueCount ?? "—"} />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
