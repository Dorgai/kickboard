"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
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

/** First name(s) on line 1, surname on line 2 (shirt-style). */
function splitPitchPlayerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { given: "", family: parts[0] ?? "" };
  }
  return {
    given: parts.slice(0, -1).join(" "),
    family: parts[parts.length - 1] ?? ""
  };
}

function PitchTokenName({ label }: { label: string }) {
  const { given, family } = splitPitchPlayerName(label);
  return (
    <span className="squad-pitch-token-name">
      {given ? <span className="squad-pitch-token-given">{given}</span> : null}
      {family ? <span className="squad-pitch-token-family">{family}</span> : null}
    </span>
  );
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
  const lineupRef = useRef(lineup);
  const onLineupChangeRef = useRef(onLineupChange);
  const [draggingPlayerId, setDraggingPlayerId] = useState<number | string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    lineupRef.current = lineup;
  }, [lineup]);

  useEffect(() => {
    onLineupChangeRef.current = onLineupChange;
  }, [onLineupChange]);

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

      let targetIndex = -1;
      let bestDist = Infinity;
      for (let index = 0; index < lineup.length; index += 1) {
        const slot = lineup[index];
        if (slot.label || slotSide(slot) !== playerSide) continue;
        const dist = (slot.x - coords.x) ** 2 + (slot.y - coords.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          targetIndex = index;
        }
      }
      if (targetIndex < 0) {
        targetIndex = nearestEmptySlot(lineup, playerSide, player.role);
      }
      if (targetIndex < 0) return false;
      const anchor = lineup[targetIndex];
      return assignPlayerAt(player, { x: anchor.x, y: anchor.y }, targetIndex);
    },
    [assignPlayerAt, awayTeam, homeTeam, lineup]
  );

  useImperativeHandle(ref, () => ({ tryDropPlayer }), [tryDropPlayer]);

  const swapPlayerToNearestSlot = useCallback(
    (playerId: number | string, clientX: number, clientY: number) => {
    const currentLineup = lineupRef.current;
    const pitch = pitchRef.current?.getBoundingClientRect();
    if (!pitch) return;

    const moving = currentLineup.find((slot) => slot.playerId === playerId && slot.label);
    if (!moving) return;

    const coords = coordsFromPointer(pitch, clientX, clientY);
    const side = slotSide(moving);
    const dropSide: SquadLineupSide = coords.y < 50 ? "home" : "away";
    if (side !== dropSide) return;

    const targetSlot = nearestFormationSlotNumber(currentLineup, side, coords);
    if (!targetSlot || targetSlot === moving.slot) return;

    onLineupChangeRef.current(
      swapLineupSlots(currentLineup, moving.slot, targetSlot)
    );
    },
    []
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
    if (readOnly || event.button !== 0 || !slot.playerId || !slot.label) return;
    event.preventDefault();
    event.stopPropagation();

    const playerId = slot.playerId;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    setDraggingPlayerId(playerId);
    setDragOffset({ x: 0, y: 0 });
    onSelectSlot(slot.slot);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (!dragging) {
        if (Math.abs(deltaX) <= 4 && Math.abs(deltaY) <= 4) return;
        dragging = true;
      }

      moveEvent.preventDefault();
      setDragOffset({ x: deltaX, y: deltaY });
      swapPlayerToNearestSlot(playerId, moveEvent.clientX, moveEvent.clientY);
    };

    const end = (endEvent: PointerEvent) => {
      if (dragging) {
        swapPlayerToNearestSlot(playerId, endEvent.clientX, endEvent.clientY);
      }
      setDraggingPlayerId(null);
      setDragOffset(null);
      if (target.hasPointerCapture(endEvent.pointerId)) {
        target.releasePointerCapture(endEvent.pointerId);
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);

      const current = lineupRef.current.find((entry) => entry.playerId === playerId);
      if (current) onSelectSlot(current.slot);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  return (
    <div className={`squad-pitch-wrap${readOnly ? " squad-pitch-wrap--readonly" : ""}`}>
      {!readOnly ? (
        <p className="squad-pitch-hint squad-pitch-hint--compact">
          Drag from the bench onto that team&apos;s half. Drag a name on the pitch to swap positions. Tap a
          bench chip marked on pitch to remove (or press Delete while selected).
        </p>
      ) : null}
      <div
        aria-label="Football pitch with home and away teams"
        className={`squad-pitch squad-pitch--dual${draggingPlayerId ? " squad-pitch--token-drag" : ""}`}
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
            const isDragging = draggingPlayerId === slot.playerId;
            const offset = isDragging ? dragOffset : null;
            return (
              <div
                aria-label={slot.label}
                className={`squad-pitch-token squad-pitch-token--${side}${
                  selectedSlot === slot.slot ? " squad-pitch-token--selected" : ""
                }${isDragging ? " squad-pitch-token--dragging" : ""}`}
                key={`token-${slot.slot}`}
                role={readOnly ? "presentation" : "button"}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  transform: offset
                    ? `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
                    : undefined,
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
                <PitchTokenName label={slot.label} />
              </div>
            );
          })}

      </div>
    </div>
  );
});

export { DRAG_PLAYER_MIME } from "@/lib/squads/drag-player";
export { SLOTS_PER_TEAM } from "@/lib/squads/lineup";
