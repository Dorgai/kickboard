"use client";

import { useCallback, useRef, useState } from "react";
import {
  clampCoordsToSide,
  clampPitchCoord,
  slotSide,
  SLOTS_PER_TEAM,
  type SquadLineupSide,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import { playerRoleLabel } from "@/lib/squads/player-roles";
import { readPlayerDragData, writePlayerDragData, type PitchDragPlayer } from "@/lib/squads/drag-player";
import { teamsMatch } from "@/lib/squads/team-names";
import { teamKitInlineStyle } from "@/lib/team-kit-colors";

export type { PitchDragPlayer };

type SquadPitchProps = {
  lineup: SquadLineupSlot[];
  homeTeam: string;
  awayTeam: string;
  selectedSlot: number | null;
  onSelectSlot: (slot: number | null) => void;
  onLineupChange: (lineup: SquadLineupSlot[]) => void;
  readOnly?: boolean;
};

function coordsFromPointer(pitch: DOMRect, clientX: number, clientY: number) {
  const x = clampPitchCoord(((clientX - pitch.left) / pitch.width) * 100);
  const y = clampPitchCoord(((clientY - pitch.top) / pitch.height) * 100);
  return { x, y };
}

function nearestEmptySlot(
  lineup: SquadLineupSlot[],
  side: SquadLineupSide,
  role?: SquadLineupSlot["role"]
) {
  const byRole = lineup.findIndex(
    (slot) =>
      !slot.label &&
      slotSide(slot) === side &&
      (!role || slot.role === role)
  );
  if (byRole >= 0) return byRole;
  return lineup.findIndex((slot) => !slot.label && slotSide(slot) === side);
}

function sideForPlayer(player: PitchDragPlayer, homeTeam: string, awayTeam: string) {
  if (teamsMatch(player.teamName, homeTeam)) return "home" as const;
  if (teamsMatch(player.teamName, awayTeam)) return "away" as const;
  return null;
}

export function SquadPitch({
  lineup,
  homeTeam,
  awayTeam,
  selectedSlot,
  onSelectSlot,
  onLineupChange,
  readOnly = false
}: SquadPitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);

  const assignPlayerAt = useCallback(
    (player: PitchDragPlayer, coords: { x: number; y: number }, targetSlot?: number) => {
      const playerSide = sideForPlayer(player, homeTeam, awayTeam);
      if (!playerSide) return;

      const slotIndex =
        targetSlot !== undefined
          ? targetSlot
          : nearestEmptySlot(lineup, playerSide, player.role);

      if (slotIndex < 0) return;
      if (slotSide(lineup[slotIndex]) !== playerSide) return;

      const placed = clampCoordsToSide(playerSide, coords);

      const canonicalTeam = playerSide === "home" ? homeTeam : awayTeam;

      const next = lineup.map((slot, index) => {
        if (index === slotIndex) {
          return {
            ...slot,
            label: player.name,
            role: player.role,
            playerId: player.playerId,
            teamName: canonicalTeam,
            jerseyNumber: player.jerseyNumber ?? undefined,
            x: placed.x,
            y: placed.y
          };
        }
        if (slot.playerId === player.playerId) {
          return { ...slot, label: "", playerId: undefined, teamName: undefined, jerseyNumber: undefined };
        }
        return slot;
      });

      onLineupChange(next);
      onSelectSlot(lineup[slotIndex]?.slot ?? slotIndex + 1);
    },
    [awayTeam, homeTeam, lineup, onLineupChange, onSelectSlot]
  );

  const moveSlot = useCallback(
    (slotNumber: number, coords: { x: number; y: number }) => {
      onLineupChange(
        lineup.map((slot) => {
          if (slot.slot !== slotNumber) return slot;
          const placed = clampCoordsToSide(slotSide(slot), coords);
          return { ...slot, x: placed.x, y: placed.y };
        })
      );
    },
    [lineup, onLineupChange]
  );

  const clearSlot = useCallback(
    (slotNumber: number) => {
      onLineupChange(
        lineup.map((slot) =>
          slot.slot === slotNumber
            ? {
                ...slot,
                label: "",
                playerId: undefined,
                teamName: undefined,
                jerseyNumber: undefined
              }
            : slot
        )
      );
      onSelectSlot(null);
    },
    [lineup, onLineupChange, onSelectSlot]
  );

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const pitch = pitchRef.current?.getBoundingClientRect();
    if (!pitch) return;

    const player = readPlayerDragData(event.dataTransfer);
    if (!player) return;

    try {
      if (player.fromPitch) return;
      const coords = coordsFromPointer(pitch, event.clientX, event.clientY);
      const dropSide: SquadLineupSide = coords.y < 50 ? "home" : "away";
      const playerSide = sideForPlayer(player, homeTeam, awayTeam);
      if (!playerSide || playerSide !== dropSide) return;

      const targetSlot = nearestEmptySlot(lineup, playerSide, player.role);
      assignPlayerAt(player, coords, targetSlot >= 0 ? targetSlot : undefined);
    } catch {
      /* ignore malformed drag payload */
    }
  }

  return (
    <div className={`squad-pitch-wrap${readOnly ? " squad-pitch-wrap--readonly" : ""}`}>
      {!readOnly ? (
        <p className="squad-pitch-hint squad-pitch-hint--compact">
          Drag from the bench above or below onto that team&apos;s half. Drop back on their bench to remove
          (or press Delete while selected).
        </p>
      ) : null}
      <div
        aria-label="Football pitch with home and away teams"
        className="squad-pitch squad-pitch--dual"
        onDragOver={readOnly ? undefined : handleDragOver}
        onDrop={readOnly ? undefined : handleDrop}
        ref={pitchRef}
        role={readOnly ? "img" : "application"}
      >
        <div className="squad-pitch-surface" aria-hidden />
        <div className="squad-pitch-midline" aria-hidden />
        <div className="squad-pitch-circle" aria-hidden />
        <div className="squad-pitch-box squad-pitch-box--top" aria-hidden />
        <div className="squad-pitch-box squad-pitch-box--bottom" aria-hidden />
        <div className="squad-pitch-goal-area squad-pitch-goal-area--top" aria-hidden />
        <div className="squad-pitch-goal-area squad-pitch-goal-area--bottom" aria-hidden />
        <div className="squad-pitch-half-line" aria-hidden />

        <span className="squad-pitch-team-banner squad-pitch-team-banner--home">{homeTeam}</span>
        <span className="squad-pitch-team-banner squad-pitch-team-banner--away">{awayTeam}</span>

        {!readOnly
          ? lineup.map((slot, slotIndex) => (
              <button
                className={`squad-pitch-ghost${slot.label ? " squad-pitch-ghost--filled" : " squad-pitch-ghost--empty"}${
                  selectedSlot === slot.slot ? " squad-pitch-ghost--selected" : ""
                }`}
                key={`ghost-${slot.slot}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                type="button"
                onClick={() => onSelectSlot(slot.slot)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (slot.label) return;
                  try {
                    const player = readPlayerDragData(event.dataTransfer);
                    if (!player || player.fromPitch) return;
                    const playerSide = sideForPlayer(player, homeTeam, awayTeam);
                    if (!playerSide || playerSide !== slotSide(slot)) return;
                    assignPlayerAt(player, { x: slot.x, y: slot.y }, slotIndex);
                  } catch {
                    /* ignore */
                  }
                }}
                aria-label={`${slotSide(slot)} ${playerRoleLabel(slot.role)} slot ${slot.slot}`}
              >
                {!slot.label ? (
                  <span className="squad-pitch-placeholder-role" aria-hidden>
                    {playerRoleLabel(slot.role)}
                  </span>
                ) : null}
              </button>
            ))
          : null}

        {lineup
          .filter((slot) => slot.label)
          .map((slot) => {
            const side = slotSide(slot);
            const canonicalTeam = side === "home" ? homeTeam : awayTeam;
            return (
            <div
              className={`squad-pitch-token squad-pitch-token--${side}${
                selectedSlot === slot.slot ? " squad-pitch-token--selected" : ""
              }`}
              draggable={!readOnly}
              key={slot.slot}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                ...teamKitInlineStyle(canonicalTeam, side, { homeTeam, awayTeam })
              }}
              onDragStart={
                readOnly
                  ? undefined
                  : (event) => {
                      writePlayerDragData(event.dataTransfer, {
                        playerId: Number(slot.playerId),
                        name: slot.label,
                        teamName: canonicalTeam,
                        role: slot.role,
                        jerseyNumber: slot.jerseyNumber ?? null,
                        fromPitch: true
                      });
                      event.dataTransfer.effectAllowed = "move";
                    }
              }
              onPointerDown={
                readOnly
                  ? undefined
                  : (event) => {
                      if (event.button !== 0) return;
                      const startX = event.clientX;
                      const startY = event.clientY;
                      let moved = false;
                      setDraggingSlot(slot.slot);
                      onSelectSlot(slot.slot);
                      const pitch = pitchRef.current?.getBoundingClientRect();
                      if (!pitch) return;

                      const onMove = (moveEvent: PointerEvent) => {
                        if (
                          Math.abs(moveEvent.clientX - startX) > 6 ||
                          Math.abs(moveEvent.clientY - startY) > 6
                        ) {
                          moved = true;
                          moveEvent.preventDefault();
                        }
                        if (!moved) return;
                        moveSlot(
                          slot.slot,
                          coordsFromPointer(pitch, moveEvent.clientX, moveEvent.clientY)
                        );
                      };

                      const onUp = () => {
                        setDraggingSlot(null);
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };

                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }
              }
              role={readOnly ? "presentation" : "button"}
              tabIndex={readOnly ? -1 : 0}
              onKeyDown={
                readOnly
                  ? undefined
                  : (event) => {
                      if (event.key === "Backspace" || event.key === "Delete") {
                        clearSlot(slot.slot);
                      }
                    }
              }
            >
              <span className="squad-pitch-token-name">{slot.label}</span>
              {slot.jerseyNumber ? (
                <span className="squad-pitch-token-number">{slot.jerseyNumber}</span>
              ) : null}
            </div>
            );
          })}

        {draggingSlot ? <span className="squad-pitch-drag-overlay" aria-hidden /> : null}
      </div>
    </div>
  );
}

export { DRAG_PLAYER_MIME } from "@/lib/squads/drag-player";
export { SLOTS_PER_TEAM } from "@/lib/squads/lineup";
