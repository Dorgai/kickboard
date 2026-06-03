"use client";

import { useRef, useState } from "react";
import { isFixtureDragEvent, readFixtureDragData } from "@/lib/fixtures/drag-fixture";
import type { SquadSummary } from "@/lib/squads/store";

type SavedSquadsBarProps = {
  squads: SquadSummary[];
  activeSquadId: string | null;
  loading: boolean;
  fixtureLabel?: string;
  touchLayout?: boolean;
  onSelect: (squadId: string) => void;
  onNew: () => void;
  onFixtureDrop?: (fixtureKey: string) => void;
};

export function SavedSquadsBar({
  squads,
  activeSquadId,
  loading,
  fixtureLabel,
  touchLayout = false,
  onSelect,
  onNew,
  onFixtureDrop
}: SavedSquadsBarProps) {
  const dragDepthRef = useRef(0);
  const [fixtureDragOver, setFixtureDragOver] = useState(false);

  function handleDragEnter(event: React.DragEvent) {
    if (!onFixtureDrop || !isFixtureDragEvent(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setFixtureDragOver(true);
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: React.DragEvent) {
    if (!onFixtureDrop || !isFixtureDragEvent(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setFixtureDragOver(false);
    }
  }

  function handleDragOver(event: React.DragEvent) {
    if (!onFixtureDrop || !isFixtureDragEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: React.DragEvent) {
    if (!onFixtureDrop) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setFixtureDragOver(false);
    const fixtureKey = readFixtureDragData(event.dataTransfer);
    if (!fixtureKey) return;
    onFixtureDrop(fixtureKey);
  }

  return (
    <section
      aria-label="Your saved squads for this match"
      className={`saved-squads-bar${fixtureDragOver ? " saved-squads-bar--fixture-drag-over" : ""}`}
      onDragEnter={onFixtureDrop ? handleDragEnter : undefined}
      onDragLeave={onFixtureDrop ? handleDragLeave : undefined}
      onDragOver={onFixtureDrop ? handleDragOver : undefined}
      onDrop={onFixtureDrop ? handleDrop : undefined}
    >
      <div className="saved-squads-bar-header">
        <h3>Your saved boards</h3>
        <button className="button secondary saved-squads-new" type="button" onClick={onNew}>
          New board
        </button>
      </div>

      {onFixtureDrop || (touchLayout && fixtureLabel) ? (
        <p className="saved-squads-bar-hint">
          {fixtureLabel ? (
            <>
              Boards for <strong>{fixtureLabel}</strong>.
              {onFixtureDrop ? " Drag a match from the list to switch, or click a match." : " Tap another match above to switch."}
            </>
          ) : onFixtureDrop ? (
            <>Drag a match from the list onto this area to open its boards.</>
          ) : null}
        </p>
      ) : null}

      {loading ? <p className="inline-status">Loading saved boards…</p> : null}

      {!loading && squads.length === 0 ? (
        <p className="inline-status">No saved squads for this match yet. Build one below and save.</p>
      ) : null}

      {!loading && squads.length > 0 ? (
        <ul className="saved-squads-list">
          {squads.map((squad) => (
            <li key={squad.id}>
              <button
                className={`saved-squad-card${activeSquadId === squad.id ? " selected" : ""}`}
                type="button"
                onClick={() => onSelect(squad.id)}
              >
                <span className="saved-squad-card-name">{squad.name}</span>
                <span className="saved-squad-card-meta">
                  {squad.formation} · {squad.playersPlaced}/11
                  {squad.publishedAt ? " · Published" : ""}
                </span>
                <time className="saved-squad-card-time" dateTime={squad.updatedAt}>
                  {new Date(squad.updatedAt).toLocaleString()}
                </time>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
