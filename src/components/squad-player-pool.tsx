"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import type { SquadPitchHandle } from "@/components/squad-pitch";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import {
  FORMATIONS,
  SLOTS_PER_TEAM,
  type SquadFormation,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import { playerRoleLabel, SQUAD_PLAYER_ROLES, type SquadPlayerRole } from "@/lib/squads/player-roles";
import { slotSide } from "@/lib/squads/lineup";
import {
  isPlayerDragEvent,
  readPlayerDragData,
  writePlayerDragData,
  type PitchDragPlayer
} from "@/lib/squads/drag-player";
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
  homeSelectedPlayerIds: ReadonlySet<number>;
  awaySelectedPlayerIds: ReadonlySet<number>;
  onHomeFormationChange: (formation: SquadFormation) => void;
  onAwayFormationChange: (formation: SquadFormation) => void;
  onHomeTogglePlayerSelect: (playerId: number) => void;
  onAwayTogglePlayerSelect: (playerId: number) => void;
  onRemoveFromPitch: (playerId: number) => void;
};

const POINTER_DRAG_THRESHOLD_PX = 8;

function BenchPlayerChip({
  player,
  side,
  teamName,
  onPitch,
  selected,
  selectionFull,
  onToggleSelect,
  onRemoveFromPitch,
  pitchDropRef
}: {
  player: SquadPoolPlayer;
  side: "home" | "away";
  teamName: string;
  onPitch: boolean;
  selected: boolean;
  selectionFull: boolean;
  onToggleSelect: (playerId: number) => void;
  onRemoveFromPitch: (playerId: number) => void;
  pitchDropRef?: RefObject<SquadPitchHandle | null>;
}) {
  const suppressClickRef = useRef(false);
  const [pointerDragging, setPointerDragging] = useState(false);

  const dragPayload: PitchDragPlayer = {
    playerId: player.playerId,
    name: player.name,
    teamName,
    role: player.role,
    jerseyNumber: player.jerseyNumber,
    fromPitch: onPitch
  };

  return (
    <li>
      <div
        className={`squad-player-chip squad-player-chip--bench${onPitch ? " squad-player-chip--on-pitch" : ""}${
          selected ? " squad-player-chip--selected" : ""
        }${pointerDragging ? " squad-player-chip--pointer-drag" : ""}`}
        draggable={!onPitch}
        role="button"
        tabIndex={0}
        title={
          onPitch
            ? `Tap to remove from the pitch, or drag here from the pitch`
            : selected
              ? "Click to deselect for formation lineup"
              : selectionFull
                ? `Bench selection is full (${SLOTS_PER_TEAM}). Deselect a player or drag onto the pitch.`
                : `Tap to select · drag onto the ${side === "home" ? "top" : "bottom"} half`
        }
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          if (onPitch) {
            onRemoveFromPitch(player.playerId);
            return;
          }
          onToggleSelect(player.playerId);
        }}
        onDragStart={(event) => {
          writePlayerDragData(event.dataTransfer, dragPayload);
          event.dataTransfer.effectAllowed = onPitch ? "move" : "copy";
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (onPitch) {
              onRemoveFromPitch(player.playerId);
            } else {
              onToggleSelect(player.playerId);
            }
          }
        }}
        onPointerDown={(event) => {
          if (onPitch || event.button !== 0) return;
          const target = event.currentTarget;
          target.setPointerCapture(event.pointerId);

          const startX = event.clientX;
          const startY = event.clientY;
          let moved = false;

          const onMove = (moveEvent: PointerEvent) => {
            if (
              Math.abs(moveEvent.clientX - startX) > POINTER_DRAG_THRESHOLD_PX ||
              Math.abs(moveEvent.clientY - startY) > POINTER_DRAG_THRESHOLD_PX
            ) {
              moved = true;
              setPointerDragging(true);
            }
          };

          const end = (endEvent: PointerEvent) => {
            if (target.hasPointerCapture(endEvent.pointerId)) {
              target.releasePointerCapture(endEvent.pointerId);
            }
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", end);
            target.removeEventListener("pointercancel", end);
            setPointerDragging(false);

            if (moved) {
              suppressClickRef.current = true;
              pitchDropRef?.current?.tryDropPlayer(dragPayload, endEvent.clientX, endEvent.clientY);
            }
          };

          target.addEventListener("pointermove", onMove);
          target.addEventListener("pointerup", end);
          target.addEventListener("pointercancel", end);
        }}
      >
        <span className="squad-player-chip-name">{player.name}</span>
        {onPitch ? <span className="squad-player-chip-on-pitch">· on pitch</span> : null}
        {!onPitch && selected ? <span className="squad-player-chip-on-pitch">· selected</span> : null}
      </div>
    </li>
  );
}

function groupPlayersByRole(players: SquadPoolPlayer[]) {
  const groups: { role: SquadPlayerRole; players: SquadPoolPlayer[] }[] = [];
  for (const role of SQUAD_PLAYER_ROLES) {
    const list = players
      .filter((player) => player.role === role)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (list.length > 0) groups.push({ role, players: list });
  }
  return groups;
}

export function SquadTeamBench({
  teamName,
  side,
  formation,
  players,
  lineup,
  loading,
  error,
  selectedPlayerIds,
  onFormationChange,
  onTogglePlayerSelect,
  onRemoveFromPitch,
  pitchDropRef
}: {
  teamName: string;
  side: "home" | "away";
  formation: SquadFormation;
  players: SquadPoolPlayer[];
  lineup: SquadLineupSlot[];
  loading: boolean;
  error: string | null;
  selectedPlayerIds: ReadonlySet<number>;
  onFormationChange: (formation: SquadFormation) => void;
  onTogglePlayerSelect: (playerId: number) => void;
  onRemoveFromPitch: (playerId: number) => void;
  pitchDropRef?: RefObject<SquadPitchHandle | null>;
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

  const playersByRole = useMemo(() => groupPlayersByRole(players), [players]);
  const selectionCount = selectedPlayerIds.size;
  const selectionFull = selectionCount >= SLOTS_PER_TEAM;

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
      className={`squad-team-bench${benchDragOver ? " squad-team-bench--drag-over" : ""}`}
      aria-label={`${teamName} bench`}
      onDragEnter={handleBenchDragEnter}
      onDragLeave={handleBenchDragLeave}
      onDragOver={handleBenchDragOver}
      onDrop={handleBenchDrop}
    >
      <header className="squad-team-bench-header">
        <h4 className="squad-team-bench-title">{teamName} bench</h4>
        <div className="squad-team-bench-formation">
          <span className="squad-team-bench-formation-label">Formation</span>
          <nav
            aria-label={`${teamName} formation`}
            className="squad-team-bench-formations feed-tab-bar"
          >
            {FORMATIONS.map((value) => (
              <button
                aria-pressed={formation === value}
                className={formation === value ? "active" : undefined}
                key={value}
                type="button"
                onClick={() => onFormationChange(value)}
              >
                {value}
              </button>
            ))}
          </nav>
        </div>
        <p className="squad-team-bench-lead">
          {selectionCount > 0
            ? `${selectionCount}/${SLOTS_PER_TEAM} selected — tap a formation to line them up`
            : `Select up to ${SLOTS_PER_TEAM} players, then a formation · or drag onto the ${
                side === "home" ? "top" : "bottom"
              } half`}
          {" · drop here to remove from pitch"}
        </p>
      </header>

      {loading ? <p className="inline-status">Loading players…</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}

      <div className="squad-team-bench-groups">
        {playersByRole.map(({ role, players: rolePlayers }) => (
          <section className="squad-team-bench-group" key={role}>
            <h5 className="squad-team-bench-group-label">{playerRoleLabel(role)}</h5>
            <ul className="squad-team-bench-row">
              {rolePlayers.map((player) => (
                <BenchPlayerChip
                  key={player.playerId}
                  onPitch={onPitchIds.has(player.playerId)}
                  onRemoveFromPitch={onRemoveFromPitch}
                  onToggleSelect={onTogglePlayerSelect}
                  player={player}
                  selected={selectedPlayerIds.has(player.playerId)}
                  selectionFull={selectionFull}
                  pitchDropRef={pitchDropRef}
                  side={side}
                  teamName={teamName}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {!loading && !error && players.length === 0 ? (
        <p className="inline-status squad-team-bench-empty">
          No squad list found for {teamName} yet. Kickboard checks StatsBomb historical World Cups,
          API-Football WC squads and recent lineups (when configured), and Wikipedia national-team
          call-up lists.
        </p>
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
    homeSelectedPlayerIds,
    awaySelectedPlayerIds,
    onHomeFormationChange,
    onAwayFormationChange,
    onHomeTogglePlayerSelect,
    onAwayTogglePlayerSelect,
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
        selectedPlayerIds={homeSelectedPlayerIds}
        side="home"
        teamName={homeTeam}
        onFormationChange={onHomeFormationChange}
        onRemoveFromPitch={onRemoveFromPitch}
        onTogglePlayerSelect={onHomeTogglePlayerSelect}
      />
      <SquadTeamBench
        error={error}
        formation={awayFormation}
        lineup={lineup}
        loading={loading}
        players={awayPlayers}
        selectedPlayerIds={awaySelectedPlayerIds}
        side="away"
        teamName={awayTeam}
        onFormationChange={onAwayFormationChange}
        onRemoveFromPitch={onRemoveFromPitch}
        onTogglePlayerSelect={onAwayTogglePlayerSelect}
      />
    </div>
  );
}
