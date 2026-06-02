"use client";

import { useMemo, useRef, useState } from "react";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { FORMATIONS, type SquadFormation, type SquadLineupSlot } from "@/lib/squads/lineup";
import { playerRoleLabel } from "@/lib/squads/player-roles";
import { slotSide } from "@/lib/squads/lineup";
import {
  isPlayerDragEvent,
  readPlayerDragData,
  writePlayerDragData,
  type PitchDragPlayer
} from "@/lib/squads/drag-player";
import { teamsMatch } from "@/lib/squads/team-names";
import { teamKitInlineStyle } from "@/lib/team-kit-colors";

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
  side,
  onPitch,
  onRemoveFromPitch
}: {
  player: SquadPoolPlayer;
  side: "home" | "away";
  onPitch: boolean;
  onRemoveFromPitch: (playerId: number) => void;
}) {
  return (
    <li>
      <button
        className={`squad-player-chip${onPitch ? " squad-player-chip--on-pitch" : ""}`}
        draggable
        type="button"
        title={
          onPitch
            ? `Drag into the bench ${side === "home" ? "above" : "below"} to remove from the pitch`
            : `Drag onto the ${side === "home" ? "top" : "bottom"} half of the pitch`
        }
        onClick={() => {
          if (onPitch) onRemoveFromPitch(player.playerId);
        }}
        onDragStart={(event) => {
          const payload: PitchDragPlayer = {
            playerId: player.playerId,
            name: player.name,
            teamName: player.teamName,
            role: player.role,
            jerseyNumber: player.jerseyNumber,
            fromPitch: onPitch
          };
          writePlayerDragData(event.dataTransfer, payload);
          event.dataTransfer.effectAllowed = onPitch ? "move" : "copy";
        }}
      >
        <span className="squad-player-chip-role">{playerRoleLabel(player.role)}</span>
        <span className="squad-player-chip-name">{player.name}</span>
        {player.jerseyNumber ? (
          <span className="squad-player-chip-number">{player.jerseyNumber}</span>
        ) : null}
        {onPitch ? <span className="squad-player-chip-on-pitch">On pitch</span> : null}
      </button>
    </li>
  );
}

export function SquadTeamBench({
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
  const dragDepthRef = useRef(0);
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

  function handleBenchDragEnter(event: React.DragEvent) {
    if (!isPlayerDragEvent(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setBenchDragOver(true);
    event.dataTransfer.dropEffect = "move";
  }

  function handleBenchDragLeave(event: React.DragEvent) {
    if (!isPlayerDragEvent(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setBenchDragOver(false);
    }
  }

  function handleBenchDragOver(event: React.DragEvent) {
    if (!isPlayerDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  }

  function handleBenchDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setBenchDragOver(false);

    const player = readPlayerDragData(event.dataTransfer);
    if (!player?.fromPitch) return;
    if (!teamsMatch(player.teamName, teamName)) return;
    onRemoveFromPitch(player.playerId);
  }

  return (
    <aside
      className={`squad-team-bench squad-team-bench--${side}${benchDragOver ? " squad-team-bench--drag-over" : ""}`}
      aria-label={`${teamName} bench`}
      style={teamKitInlineStyle(teamName, side)}
      onDragEnter={handleBenchDragEnter}
      onDragLeave={handleBenchDragLeave}
      onDragOver={handleBenchDragOver}
      onDrop={handleBenchDrop}
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
          Drag players onto the {side === "home" ? "top" : "bottom"} half · drop here to remove from pitch
        </p>
      </header>

      {loading ? <p className="inline-status">Loading players…</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}

      <ul className="squad-team-bench-list">
        {players.map((player) => (
          <PlayerChip
            key={player.playerId}
            onPitch={onPitchIds.has(player.playerId)}
            onRemoveFromPitch={onRemoveFromPitch}
            player={player}
            side={side}
          />
        ))}
      </ul>
      {!loading && !error && players.length === 0 ? (
        <p className="inline-status">No players loaded for this team.</p>
      ) : null}
    </aside>
  );
}

/** @deprecated Use SquadTeamBench in pitch-stack layout from squad-builder. */
export function SquadPlayerPool(props: SquadPlayerPoolProps) {
  const {
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
  } = props;

  return (
    <div className="squad-builder-pitch-stack" aria-label="Team benches and pitch">
      {sourceLabel ? <p className="squad-team-benches-source">{sourceLabel}</p> : null}
      <SquadTeamBench
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
      <SquadTeamBench
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
  );
}
