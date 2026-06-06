"use client";

import { useRef, useState } from "react";
import { isFixtureDragEvent, readFixtureDragData } from "@/lib/fixtures/drag-fixture";
import { HelpTooltip } from "@/components/help-tooltip";
import type { SquadSummary } from "@/lib/squads/store";

type SavedSquadsBarProps = {
  squads: SquadSummary[];
  activeSquadId: string | null;
  selectedFixtureKey: string | null;
  loading: boolean;
  touchLayout?: boolean;
  fixtureLabelForKey?: (fixtureKey: string) => string;
  onSelect: (squad: SquadSummary) => void;
  onNew: () => void;
  onFixtureDrop?: (fixtureKey: string) => void;
};

export function SavedSquadsBar({
  squads,
  activeSquadId,
  selectedFixtureKey,
  loading,
  touchLayout = false,
  fixtureLabelForKey,
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

  function matchLabel(fixtureKey: string | null) {
    if (!fixtureKey) return "Match";
    return fixtureLabelForKey?.(fixtureKey) ?? fixtureKey;
  }

  return (
    <section
      aria-label="Your saved Coach Boards"
      className={`saved-squads-bar${fixtureDragOver ? " saved-squads-bar--fixture-drag-over" : ""}`}
      onDragEnter={onFixtureDrop ? handleDragEnter : undefined}
      onDragLeave={onFixtureDrop ? handleDragLeave : undefined}
      onDragOver={onFixtureDrop ? handleDragOver : undefined}
      onDrop={onFixtureDrop ? handleDrop : undefined}
    >
      <div className="saved-squads-bar-header">
        <h3 className="saved-squads-bar-title">
          Your saved boards
          {onFixtureDrop || touchLayout ? (
            <HelpTooltip label="Saved boards help" size="sm">
              One board per match. Click a saved board to open that match, or pick a match from the
              list to build a new one.
              {onFixtureDrop ? " You can also drag a match here to switch." : ""}
            </HelpTooltip>
          ) : null}
        </h3>
        <button className="button secondary saved-squads-new" type="button" onClick={onNew}>
          New board
        </button>
      </div>

      {loading ? <p className="inline-status">Loading saved boards…</p> : null}

      {!loading && squads.length === 0 ? (
        <p className="inline-status">
          No saved boards yet. Pick a match, build your squad below, and save.
        </p>
      ) : null}

      {!loading && squads.length > 0 ? (
        <ul className="saved-squads-list">
          {squads.map((squad) => {
            const isActive =
              activeSquadId === squad.id && squad.fixtureKey === selectedFixtureKey;
            return (
              <li key={squad.id}>
                <button
                  className={`saved-squad-card${isActive ? " selected" : ""}`}
                  type="button"
                  onClick={() => onSelect(squad)}
                >
                  {squad.fixtureKey ? (
                    <span className="saved-squad-card-fixture">{matchLabel(squad.fixtureKey)}</span>
                  ) : null}
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
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
