"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  clampPitchCoord,
  nearestFormationSlotNumber,
  slotSide,
  swapLineupSlots,
  SLOTS_PER_TEAM,
  type SquadLineupSide,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import { playerRoleLabel } from "@/lib/squads/player-roles";
import { readPlayerDragData, writePlayerDragData, type PitchDragPlayer } from "@/lib/squads/drag-player";
import { teamsMatch } from "@/lib/squads/team-names";
import { teamKitInlineStyle } from "@/lib/team-kit-colors";

export type { PitchDragPlayer };

export type SquadPitchHandle = {
  tryDropPlayer: (player: PitchDragPlayer, clientX: number, clientY: number) => boolean;
};

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

function isPointOnPitch(pitch: DOMRect, clientX: number, clientY: number) {
  return (
    clientX >= pitch.left &&
    clientX <= pitch.right &&
    clientY >= pitch.top &&
    clientY <= pitch.bottom
  );
}

export const SquadPitch = forwardRef<SquadPitchHandle, SquadPitchProps>(function SquadPitch(
  {
    lineup,
    homeTeam,
    awayTeam,
    selectedSlot,
    onSelectSlot,
    onLineupChange,
    readOnly = false
  },
  ref
) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);

  const assignPlayerAt = useCallback(
    (player: PitchDragPlayer, coords: { x: number; y: number }, targetSlot?: number) => {
      const playerSide = sideForPlayer(player, homeTeam, awayTeam);
      if (!playerSide) return false;

      const slotIndex =
        targetSlot !== undefined
          ? targetSlot
          : nearestEmptySlot(lineup, playerSide, player.role);

      if (slotIndex < 0) return false;
      if (slotSide(lineup[slotIndex]) !== playerSide) return false;

      const anchor = lineup[slotIndex];
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
            x: anchor.x,
            y: anchor.y
          };
        }
        if (slot.playerId === player.playerId) {
          return { ...slot, label: "", playerId: undefined, teamName: undefined, jerseyNumber: undefined };
        }
        return slot;
      });

      onLineupChange(next);
      onSelectSlot(lineup[slotIndex]?.slot ?? slotIndex + 1);
      return true;
    },
    [awayTeam, homeTeam, lineup, onLineupChange, onSelectSlot]
  );

  const tryDropPlayer = useCallback(
    (player: PitchDragPlayer, clientX: number, clientY: number) => {
      if (player.fromPitch) return false;
      const pitch = pitchRef.current?.getBoundingClientRect();
      if (!pitch || !isPointOnPitch(pitch, clientX, clientY)) return false;

      const playerSide = sideForPlayer(player, homeTeam, awayTeam);
      if (!playerSide) return false;

      const coords = coordsFromPointer(pitch, clientX, clientY);
      const dropSide: SquadLineupSide = coords.y < 50 ? "home" : "away";
      if (playerSide !== dropSide) return false;

      const targetIndex = nearestEmptySlot(lineup, playerSide, player.role);
      if (targetIndex < 0) return false;
      const anchor = lineup[targetIndex];
      return assignPlayerAt(player, { x: anchor.x, y: anchor.y }, targetIndex);
    },
    [assignPlayerAt, awayTeam, homeTeam, lineup]
  );

  useImperativeHandle(ref, () => ({ tryDropPlayer }), [tryDropPlayer]);

  const moveSlot = useCallback(
    (slotNumber: number, coords: { x: number; y: number }) => {
      const moving = lineup.find((slot) => slot.slot === slotNumber);
      if (!moving?.label) return;
      const targetSlot = nearestFormationSlotNumber(lineup, slotSide(moving), coords);
      if (!targetSlot) return;
      onLineupChange(swapLineupSlots(lineup, slotNumber, targetSlot));
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
    const player = readPlayerDragData(event.dataTransfer);
    if (!player) return;
    tryDropPlayer(player, event.clientX, event.clientY);
  }

  function handleTokenPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    slot: SquadLineupSlot
  ) {
    if (readOnly || event.button !== 0) return;
    event.preventDefault();

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    setDraggingSlot(slot.slot);
    onSelectSlot(slot.slot);

    const onMove = (moveEvent: PointerEvent) => {
      if (
        Math.abs(moveEvent.clientX - startX) > 6 ||
        Math.abs(moveEvent.clientY - startY) > 6
      ) {
        moved = true;
      }
      if (!moved) return;

      const pitch = pitchRef.current?.getBoundingClientRect();
      if (!pitch) return;
      moveSlot(slot.slot, coordsFromPointer(pitch, moveEvent.clientX, moveEvent.clientY));
    };

    const end = (endEvent: PointerEvent) => {
      setDraggingSlot(null);
      if (target.hasPointerCapture(endEvent.pointerId)) {
        target.releasePointerCapture(endEvent.pointerId);
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
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
        className={`squad-pitch squad-pitch--dual${draggingSlot ? " squad-pitch--token-drag" : ""}`}
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
          ? lineup.map((slot, slotIndex) => {
              if (slot.label) return null;
              return (
                <button
                  className={`squad-pitch-ghost squad-pitch-ghost--empty${
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
                    const player = readPlayerDragData(event.dataTransfer);
                    if (!player) return;
                    tryDropPlayer(player, event.clientX, event.clientY);
                  }}
                  aria-label={`${slotSide(slot)} ${playerRoleLabel(slot.role)} slot ${slot.slot}`}
                />
              );
            })
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
                }${draggingSlot === slot.slot ? " squad-pitch-token--dragging" : ""}`}
                key={`token-${slot.slot}`}
                role={readOnly ? "presentation" : "button"}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  ...teamKitInlineStyle(canonicalTeam, side, { homeTeam, awayTeam })
                }}
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
                onPointerDown={
                  readOnly ? undefined : (event) => handleTokenPointerDown(event, slot)
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
});

export { DRAG_PLAYER_MIME } from "@/lib/squads/drag-player";
export { SLOTS_PER_TEAM } from "@/lib/squads/lineup";
