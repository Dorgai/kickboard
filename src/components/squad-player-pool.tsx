"use client";

import { useMemo, useState } from "react";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import type { SquadLineupSlot } from "@/lib/squads/lineup";
import { playerRoleLabel, SQUAD_PLAYER_ROLES, type SquadPlayerRole } from "@/lib/squads/player-roles";
import { slotSide } from "@/lib/squads/lineup";
import { DRAG_PLAYER_MIME } from "@/components/squad-pitch";

type SquadPlayerPoolProps = {
  homePlayers: SquadPoolPlayer[];
  awayPlayers: SquadPoolPlayer[];
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
    <li>
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
        <span className="squad-player-chip-role">{playerRoleLabel(player.role)}</span>
        <span className="squad-player-chip-name">{player.name}</span>
        {player.jerseyNumber ? (
          <span className="squad-player-chip-number">{player.jerseyNumber}</span>
        ) : null}
        {onPitch ? <span className="squad-player-chip-on-pitch">On pitch · tap to bench</span> : null}
      </button>
    </li>
  );
}

function SquadTeamPlayerPool({
  teamName,
  side,
  players,
  lineup,
  loading,
  error,
  onRemoveFromPitch
}: {
  teamName: string;
  side: "home" | "away";
  players: SquadPoolPlayer[];
  lineup: SquadLineupSlot[];
  loading: boolean;
  error: string | null;
  onRemoveFromPitch: (playerId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | SquadPlayerRole>("ALL");
  const [benchDragOver, setBenchDragOver] = useState(false);

  const onPitchIds = useMemo(
    () =>
      new Set(
        lineup
          .filter((slot) => slotSide(slot) === side && slot.playerId)
          .map((slot) => slot.playerId as number)
      ),
    [lineup, side]
  );

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => {
      if (roleFilter !== "ALL" && player.role !== roleFilter) return false;
      if (!query) return true;
      return player.name.toLowerCase().includes(query);
    });
  }, [players, roleFilter, search]);

  function handleBenchDragOver(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes(DRAG_PLAYER_MIME)) return;
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
        <h4>{teamName}</h4>
        <p className="squad-player-pool-source">Bench · drag players onto the {side} half</p>
      </header>

      <div
        className={`squad-player-bench-drop${benchDragOver ? " squad-player-bench-drop--active" : ""}`}
        onDragLeave={() => setBenchDragOver(false)}
        onDragOver={handleBenchDragOver}
        onDrop={handleBenchDrop}
      >
        Drop a {teamName} player here to return to the bench
      </div>

      <div className="squad-player-pool-filters">
        <input
          aria-label={`Search ${teamName} players`}
          className="feed-control-input"
          placeholder="Search name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label={`Filter ${teamName} by position`}
          className="feed-control-input"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
        >
          <option value="ALL">All positions</option>
          {SQUAD_PLAYER_ROLES.map((role) => (
            <option key={role} value={role}>
              {playerRoleLabel(role)}
            </option>
          ))}
        </select>
      </div>

      {loading ? <p className="inline-status">Loading players…</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}

      <ul className="squad-player-pool-list">
        {filteredPlayers.map((player) => (
          <PlayerChip
            key={player.playerId}
            onPitch={onPitchIds.has(player.playerId)}
            onRemoveFromPitch={onRemoveFromPitch}
            player={player}
          />
        ))}
      </ul>
      {!loading && !error && filteredPlayers.length === 0 ? (
        <p className="inline-status">No players match.</p>
      ) : null}
    </aside>
  );
}

export function SquadPlayerPool({
  homePlayers,
  awayPlayers,
  lineup,
  homeTeam,
  awayTeam,
  sourceLabel,
  loading,
  error,
  onRemoveFromPitch
}: SquadPlayerPoolProps) {
  return (
    <div className="squad-player-pools">
      {sourceLabel ? <p className="squad-player-pools-source">{sourceLabel}</p> : null}
      <div className="squad-player-pools-grid">
        <SquadTeamPlayerPool
          error={error}
          lineup={lineup}
          loading={loading}
          players={homePlayers}
          side="home"
          teamName={homeTeam}
          onRemoveFromPitch={onRemoveFromPitch}
        />
        <SquadTeamPlayerPool
          error={error}
          lineup={lineup}
          loading={loading}
          players={awayPlayers}
          side="away"
          teamName={awayTeam}
          onRemoveFromPitch={onRemoveFromPitch}
        />
      </div>
    </div>
  );
}
