"use client";

import { useMemo, useState } from "react";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { FORMATIONS, type SquadFormation, type SquadLineupSlot } from "@/lib/squads/lineup";
import { playerRoleLabel, SQUAD_PLAYER_ROLES, type SquadPlayerRole } from "@/lib/squads/player-roles";
import { slotSide } from "@/lib/squads/lineup";
import { DRAG_PLAYER_MIME, type PitchDragPlayer } from "@/components/squad-pitch";
import { teamsMatch } from "@/lib/squads/team-names";

type SquadPlayerPoolProps = {
  homePlayers: SquadPoolPlayer[];
  awayPlayers: SquadPoolPlayer[];
  homeFormation: SquadFormation;
  awayFormation: SquadFormation;
  lineup: SquadLineupSlot[];
  homeTeam: string;
  awayTeam: string;
  sourceLabel: string | null;
  loading: boolean;
  error: string | null;
  onHomeFormationChange: (formation: SquadFormation) => void;
  onAwayFormationChange: (formation: SquadFormation) => void;
  onRemoveFromPitch: (playerId: number) => void;
};

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
  formation,
  players,
  lineup,
  loading,
  error,
  onFormationChange,
  onRemoveFromPitch
}: {
  teamName: string;
  side: "home" | "away";
  formation: SquadFormation;
  players: SquadPoolPlayer[];
  lineup: SquadLineupSlot[];
  loading: boolean;
  error: string | null;
  onFormationChange: (formation: SquadFormation) => void;
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
    const raw = event.dataTransfer.getData(DRAG_PLAYER_MIME);
    if (!raw) return;
    try {
      const player = JSON.parse(raw) as PitchDragPlayer;
      if (!player.fromPitch) return;
      if (!teamsMatch(player.teamName, teamName)) return;
      onRemoveFromPitch(player.playerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <aside
      className={`squad-team-bench squad-team-bench--${side}`}
      aria-label={`${teamName} bench`}
    >
      <header className="squad-team-bench-header">
        <h4 className="squad-team-bench-title">{teamName} bench</h4>
        <label className="squad-team-bench-formation">
          <span>Formation</span>
          <select
            aria-label={`${teamName} formation`}
            className="feed-control-input"
            value={formation}
            onChange={(event) => onFormationChange(event.target.value as SquadFormation)}
          >
            {FORMATIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p className="squad-team-bench-lead">
          {side === "home" ? "Top half" : "Bottom half"} of the pitch · drag players from this list only
        </p>
      </header>

      <div
        className={`squad-team-bench-drop${benchDragOver ? " squad-team-bench-drop--active" : ""}`}
        onDragLeave={() => setBenchDragOver(false)}
        onDragOver={handleBenchDragOver}
        onDrop={handleBenchDrop}
      >
        Drop {teamName} players here to return to this bench
      </div>

      <div className="squad-team-bench-filters">
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

      <ul className="squad-team-bench-list">
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
  homeFormation,
  awayFormation,
  lineup,
  homeTeam,
  awayTeam,
  sourceLabel,
  loading,
  error,
  onHomeFormationChange,
  onAwayFormationChange,
  onRemoveFromPitch
}: SquadPlayerPoolProps) {
  return (
    <div className="squad-team-benches" aria-label="Team benches">
      {sourceLabel ? <p className="squad-team-benches-source">{sourceLabel}</p> : null}
      <div className="squad-team-benches-grid">
        <SquadTeamPlayerPool
          error={error}
          formation={homeFormation}
          lineup={lineup}
          loading={loading}
          players={homePlayers}
          side="home"
          teamName={homeTeam}
          onFormationChange={onHomeFormationChange}
          onRemoveFromPitch={onRemoveFromPitch}
        />
        <SquadTeamPlayerPool
          error={error}
          formation={awayFormation}
          lineup={lineup}
          loading={loading}
          players={awayPlayers}
          side="away"
          teamName={awayTeam}
          onFormationChange={onAwayFormationChange}
          onRemoveFromPitch={onRemoveFromPitch}
        />
      </div>
    </div>
  );
}
