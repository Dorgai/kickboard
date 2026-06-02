"use client";

import { useCallback, useMemo, useState } from "react";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import type { SquadLineupSlot } from "@/lib/squads/lineup";
import { DRAG_PLAYER_MIME } from "@/components/squad-pitch";
import { teamsMatch } from "@/lib/squads/team-names";

type SquadPlayerPoolProps = {
  players: SquadPoolPlayer[];
  lineup: SquadLineupSlot[];
  homeTeam: string;
  awayTeam: string;
  sourceLabel: string | null;
  loading: boolean;
  error: string | null;
  onRemoveFromPitch: (playerId: number) => void;
};

function parseDragPlayer(raw: string): { playerId: number; fromPitch?: boolean } | null {
  try {
    const parsed = JSON.parse(raw) as { playerId?: number; fromPitch?: boolean };
    if (typeof parsed.playerId !== "number") return null;
    return { playerId: parsed.playerId, fromPitch: parsed.fromPitch };
  } catch {
    return null;
  }
}

function PlayerChip({
  player,
  onPitch,
  onRemoveFromPitch
}: {
  player: SquadPoolPlayer;
  onPitch: boolean;
  onRemoveFromPitch: (playerId: number) => void;
}) {
  return (
    <li key={player.playerId}>
      <button
        className={`squad-player-chip${onPitch ? " squad-player-chip--on-pitch" : ""}`}
        draggable
        type="button"
        title={onPitch ? "Click or drag here to move back to bench" : "Drag onto your team's half of the pitch"}
        onClick={() => {
          if (onPitch) onRemoveFromPitch(player.playerId);
        }}
        onDragStart={(event) => {
          event.dataTransfer.setData(
            DRAG_PLAYER_MIME,
            JSON.stringify({
              playerId: player.playerId,
              name: player.name,
              teamName: player.teamName,
              role: player.role,
              jerseyNumber: player.jerseyNumber,
              fromPitch: onPitch
            })
          );
          event.dataTransfer.effectAllowed = onPitch ? "move" : "copy";
        }}
      >
        <span className="squad-player-chip-role">{player.role}</span>
        <span className="squad-player-chip-name">{player.name}</span>
        {player.jerseyNumber ? (
          <span className="squad-player-chip-number">{player.jerseyNumber}</span>
        ) : null}
        {onPitch ? <span className="squad-player-chip-on-pitch">On pitch · tap to bench</span> : null}
      </button>
    </li>
  );
}

export function SquadPlayerPool({
  players,
  lineup,
  homeTeam,
  awayTeam,
  sourceLabel,
  loading,
  error,
  onRemoveFromPitch
}: SquadPlayerPoolProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | SquadLineupSlot["role"]>("ALL");
  const [benchDragOver, setBenchDragOver] = useState(false);

  const onPitchIds = useMemo(
    () => new Set(lineup.map((slot) => slot.playerId).filter(Boolean)),
    [lineup]
  );

  const filterPlayers = useCallback(
    (teamName: string) => {
      const query = search.trim().toLowerCase();
      return players.filter((player) => {
        if (!teamsMatch(player.teamName, teamName)) return false;
        if (roleFilter !== "ALL" && player.role !== roleFilter) return false;
        if (!query) return true;
        return (
          player.name.toLowerCase().includes(query) ||
          player.teamName.toLowerCase().includes(query)
        );
      });
    },
    [players, roleFilter, search]
  );

  const homePlayers = useMemo(() => filterPlayers(homeTeam), [filterPlayers, homeTeam]);
  const awayPlayers = useMemo(() => filterPlayers(awayTeam), [filterPlayers, awayTeam]);

  function handleBenchDragOver(event: React.DragEvent) {
    const raw = event.dataTransfer.types.includes(DRAG_PLAYER_MIME);
    if (!raw) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setBenchDragOver(true);
  }

  function handleBenchDrop(event: React.DragEvent) {
    event.preventDefault();
    setBenchDragOver(false);
    const parsed = parseDragPlayer(event.dataTransfer.getData(DRAG_PLAYER_MIME));
    if (parsed?.fromPitch) {
      onRemoveFromPitch(parsed.playerId);
    }
  }

  return (
    <aside className="squad-player-pool">
      <header className="squad-player-pool-header">
        <h4>Bench</h4>
        {sourceLabel ? <p className="squad-player-pool-source">{sourceLabel}</p> : null}
      </header>

      <div
        className={`squad-player-bench-drop${benchDragOver ? " squad-player-bench-drop--active" : ""}`}
        onDragLeave={() => setBenchDragOver(false)}
        onDragOver={handleBenchDragOver}
        onDrop={handleBenchDrop}
      >
        Drop a pitch player here to move back to the bench
      </div>

      <div className="squad-player-pool-filters">
        <input
          aria-label="Search players"
          className="feed-control-input"
          placeholder="Search name"
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

      <section className="squad-player-team-section">
        <h5 className="squad-player-team-heading">{homeTeam}</h5>
        <ul className="squad-player-pool-list">
          {homePlayers.map((player) => (
            <PlayerChip
              key={player.playerId}
              onPitch={onPitchIds.has(player.playerId)}
              onRemoveFromPitch={onRemoveFromPitch}
              player={player}
            />
          ))}
        </ul>
        {!loading && !error && homePlayers.length === 0 ? (
          <p className="inline-status">No home players match.</p>
        ) : null}
      </section>

      <section className="squad-player-team-section">
        <h5 className="squad-player-team-heading">{awayTeam}</h5>
        <ul className="squad-player-pool-list">
          {awayPlayers.map((player) => (
            <PlayerChip
              key={player.playerId}
              onPitch={onPitchIds.has(player.playerId)}
              onRemoveFromPitch={onRemoveFromPitch}
              player={player}
            />
          ))}
        </ul>
        {!loading && !error && awayPlayers.length === 0 ? (
          <p className="inline-status">No away players match.</p>
        ) : null}
      </section>
    </aside>
  );
}
