"use client";

import { useMemo, useState } from "react";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import type { SquadLineupSlot } from "@/lib/squads/lineup";
import { DRAG_PLAYER_MIME } from "@/components/squad-pitch";

type SquadPlayerPoolProps = {
  players: SquadPoolPlayer[];
  lineup: SquadLineupSlot[];
  sourceLabel: string | null;
  loading: boolean;
  error: string | null;
};

export function SquadPlayerPool({
  players,
  lineup,
  sourceLabel,
  loading,
  error
}: SquadPlayerPoolProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | SquadLineupSlot["role"]>("ALL");

  const onPitchIds = useMemo(
    () => new Set(lineup.map((slot) => slot.playerId).filter(Boolean)),
    [lineup]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => {
      if (roleFilter !== "ALL" && player.role !== roleFilter) return false;
      if (!query) return true;
      return (
        player.name.toLowerCase().includes(query) ||
        player.teamName.toLowerCase().includes(query)
      );
    });
  }, [players, roleFilter, search]);

  return (
    <aside className="squad-player-pool">
      <header className="squad-player-pool-header">
        <h4>Player pool</h4>
        {sourceLabel ? <p className="squad-player-pool-source">{sourceLabel}</p> : null}
      </header>

      <div className="squad-player-pool-filters">
        <input
          aria-label="Search players"
          className="feed-control-input"
          placeholder="Search name or team"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Filter by role"
          className="feed-control-input"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
        >
          <option value="ALL">All roles</option>
          <option value="GK">GK</option>
          <option value="DEF">DEF</option>
          <option value="MID">MID</option>
          <option value="FWD">FWD</option>
        </select>
      </div>

      {loading ? <p className="inline-status">Loading players…</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}

      <ul className="squad-player-pool-list">
        {filtered.map((player) => {
          const onPitch = onPitchIds.has(player.playerId);
          return (
            <li key={player.playerId}>
              <button
                className={`squad-player-chip${onPitch ? " squad-player-chip--on-pitch" : ""}`}
                draggable={!onPitch}
                type="button"
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    DRAG_PLAYER_MIME,
                    JSON.stringify({
                      playerId: player.playerId,
                      name: player.name,
                      teamName: player.teamName,
                      role: player.role,
                      jerseyNumber: player.jerseyNumber
                    })
                  );
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <span className="squad-player-chip-role">{player.role}</span>
                <span className="squad-player-chip-name">{player.name}</span>
                <span className="squad-player-chip-meta">{player.teamName}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!loading && !error && filtered.length === 0 ? (
        <p className="inline-status">No players match your search.</p>
      ) : null}
    </aside>
  );
}
