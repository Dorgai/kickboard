"use client";

import type { SquadSummary } from "@/lib/squads/store";

type SavedSquadsBarProps = {
  squads: SquadSummary[];
  activeSquadId: string | null;
  loading: boolean;
  onSelect: (squadId: string) => void;
  onNew: () => void;
};

export function SavedSquadsBar({
  squads,
  activeSquadId,
  loading,
  onSelect,
  onNew
}: SavedSquadsBarProps) {
  return (
    <section className="saved-squads-bar" aria-label="Your saved squads for this match">
      <div className="saved-squads-bar-header">
        <h3>Your saved boards</h3>
        <button className="button secondary saved-squads-new" type="button" onClick={onNew}>
          New board
        </button>
      </div>

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
