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
import { HelpTooltip } from "@/components/help-tooltip";
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
import {
  playerIdsMatch,
  readPlayerDragData,
  type PitchDragPlayer
} from "@/lib/squads/drag-player";
import {
  attachPitchPointerSession,
  startTokenPointerSession,
  type PitchPointerSessionCallbacks
} from "@/lib/squads/pitch-pointer-session";
import { teamsMatch } from "@/lib/squads/team-names";
import { teamKitInlineStyle } from "@/lib/team-kit-colors";

export type { PitchDragPlayer };

export type SquadPitchHandle = {
  tryDropPlayer: (player: PitchDragPlayer, clientX: number, clientY: number) => boolean;
  getPitchRect: () => DOMRect | null;
};

type SquadPitchProps = {
  lineup: SquadLineupSlot[];
  homeTeam: string;
  awayTeam: string;
  selectedSlot: number | null;
  onSelectSlot: (slot: number | null) => void;
  onLineupChange: (lineup: SquadLineupSlot[]) => void;
  onRemovePlayer?: (playerId: number | string) => void;
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

function nearestEmptySlotIndex(
  lineup: SquadLineupSlot[],
  side: SquadLineupSide,
  role?: SquadLineupSlot["role"]
) {
  const byRole = lineup.findIndex(
    (slot) => !slot.label && slotSide(slot) === side && (!role || slot.role === role)
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

function pitchPlayerId(slot: SquadLineupSlot): number | string | undefined {
  return slot.playerId;
}

export const SquadPitch = forwardRef<SquadPitchHandle, SquadPitchProps>(function SquadPitch(
  {
    lineup,
    homeTeam,
    awayTeam,
    selectedSlot,
    onSelectSlot,
    onLineupChange,
    onRemovePlayer,
    readOnly = false
  },
  ref
) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const lineupRef = useRef(lineup);
  const onLineupChangeRef = useRef(onLineupChange);
  const onRemovePlayerRef = useRef(onRemovePlayer);
  const [draggingPlayerId, setDraggingPlayerId] = useState<number | string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    lineupRef.current = lineup;
  }, [lineup]);

  useEffect(() => {
    onLineupChangeRef.current = onLineupChange;
  }, [onLineupChange]);

  useEffect(() => {
    onRemovePlayerRef.current = onRemovePlayer;
  }, [onRemovePlayer]);

  const commitLineup = useCallback((next: SquadLineupSlot[]) => {
    lineupRef.current = next;
    onLineupChangeRef.current(next);
  }, []);

  const assignPlayerAt = useCallback(
    (player: PitchDragPlayer, targetIndex: number) => {
      const currentLineup = lineupRef.current;
      const playerSide = sideForPlayer(player, homeTeam, awayTeam);
      if (!playerSide) return false;
      if (targetIndex < 0) return false;
      if (slotSide(currentLineup[targetIndex]) !== playerSide) return false;

      const anchor = currentLineup[targetIndex];
      const canonicalTeam = playerSide === "home" ? homeTeam : awayTeam;

      const next = currentLineup.map((slot, index) => {
        if (index === targetIndex) {
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
        if (playerIdsMatch(slot.playerId, player.playerId)) {
          return { ...slot, label: "", playerId: undefined, teamName: undefined, jerseyNumber: undefined };
        }
        return slot;
      });

      commitLineup(next);
      onSelectSlot(currentLineup[targetIndex]?.slot ?? targetIndex + 1);
      return true;
    },
    [awayTeam, commitLineup, homeTeam, onSelectSlot]
  );

  const tryMovePitchPlayer = useCallback(
    (player: PitchDragPlayer, clientX: number, clientY: number) => {
      const pitch = pitchRef.current?.getBoundingClientRect();
      if (!pitch || !isPointOnPitch(pitch, clientX, clientY)) return false;

      const currentLineup = lineupRef.current;
      const moving = currentLineup.find(
        (slot) => playerIdsMatch(slot.playerId, player.playerId) && slot.label
      );
      if (!moving) return false;

      const coords = coordsFromPointer(pitch, clientX, clientY);
      const side = slotSide(moving);
      const dropSide: SquadLineupSide = coords.y < 50 ? "home" : "away";
      if (side !== dropSide) return false;

      const targetSlot = nearestFormationSlotNumber(currentLineup, side, coords);
      if (!targetSlot || targetSlot === moving.slot) return false;

      commitLineup(swapLineupSlots(currentLineup, moving.slot, targetSlot));
      return true;
    },
    [commitLineup]
  );

  const tryDropPlayer = useCallback(
    (player: PitchDragPlayer, clientX: number, clientY: number) => {
      if (player.fromPitch) {
        return tryMovePitchPlayer(player, clientX, clientY);
      }
      const pitch = pitchRef.current?.getBoundingClientRect();
      if (!pitch || !isPointOnPitch(pitch, clientX, clientY)) return false;

      const playerSide = sideForPlayer(player, homeTeam, awayTeam);
      if (!playerSide) return false;

      const coords = coordsFromPointer(pitch, clientX, clientY);
      const dropSide: SquadLineupSide = coords.y < 50 ? "home" : "away";
      if (playerSide !== dropSide) return false;

      const currentLineup = lineupRef.current;
      let targetIndex = -1;
      let bestDist = Infinity;
      for (let index = 0; index < currentLineup.length; index += 1) {
        const slot = currentLineup[index];
        if (slot.label || slotSide(slot) !== playerSide) continue;
        const dist = (slot.x - coords.x) ** 2 + (slot.y - coords.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          targetIndex = index;
        }
      }
      if (targetIndex < 0) {
        targetIndex = nearestEmptySlotIndex(currentLineup, playerSide, player.role);
      }
      if (targetIndex < 0) return false;
      return assignPlayerAt(player, targetIndex);
    },
    [assignPlayerAt, awayTeam, homeTeam, tryMovePitchPlayer]
  );

  useImperativeHandle(
    ref,
    () => ({
      tryDropPlayer,
      getPitchRect: () => pitchRef.current?.getBoundingClientRect() ?? null
    }),
    [tryDropPlayer]
  );

  const pointerCallbacks = useCallback((): PitchPointerSessionCallbacks => {
    return {
      getLineup: () => lineupRef.current,
      commitLineup,
      getPitchRect: () => pitchRef.current?.getBoundingClientRect() ?? null,
      homeTeam,
      awayTeam,
      tryPlaceBenchPlayer: tryDropPlayer,
      removePlayer: (playerId) => onRemovePlayerRef.current?.(playerId),
      onDragVisualChange: (playerId, offset) => {
        setDraggingPlayerId(playerId);
        setDragOffset(offset);
      }
    };
  }, [awayTeam, commitLineup, homeTeam, tryDropPlayer]);

  const clearSlot = useCallback(
    (slotNumber: number) => {
      const next = lineupRef.current.map((slot) =>
        slot.slot === slotNumber
          ? {
              ...slot,
              label: "",
              playerId: undefined,
              teamName: undefined,
              jerseyNumber: undefined
            }
          : slot
      );
      commitLineup(next);
      onSelectSlot(null);
    },
    [commitLineup, onSelectSlot]
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
    const captureTarget = event.currentTarget;
    try {
      captureTarget.setPointerCapture(event.pointerId);
    } catch {
      /* unsupported */
    }

    const session = startTokenPointerSession(playerId, event.clientX, event.clientY);
    setDraggingPlayerId(playerId);
    setDragOffset({ x: 0, y: 0 });
    onSelectSlot(slot.slot);

    attachPitchPointerSession(session, pointerCallbacks(), {
      captureTarget,
      onEnd: () => {
        const current = lineupRef.current.find((entry) => playerIdsMatch(entry.playerId, playerId));
        if (current) onSelectSlot(current.slot);
      }
    });
  }

  function removeSlotPlayer(slot: SquadLineupSlot) {
    const id = pitchPlayerId(slot);
    if (id === undefined) {
      clearSlot(slot.slot);
      return;
    }
    onRemovePlayerRef.current?.(id);
  }

  return (
    <div className={`squad-pitch-wrap${readOnly ? " squad-pitch-wrap--readonly" : ""}`}>
      {!readOnly ? (
        <div className="squad-pitch-help-row">
          <HelpTooltip label="Pitch controls" size="sm">
            Drag from the bench onto that team&apos;s half. Drag a name on the pitch to swap positions or
            drop on their bench to remove. Tap Remove on a selected player or tap an on-pitch bench chip.
          </HelpTooltip>
        </div>
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
          ? lineup.map((slot) => {
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
          .filter((slot) => slot.label && slot.playerId !== undefined)
          .map((slot) => {
            const side = slotSide(slot);
            const canonicalTeam = side === "home" ? homeTeam : awayTeam;
            const isDragging =
              draggingPlayerId !== null && playerIdsMatch(draggingPlayerId, slot.playerId);
            const offset = isDragging ? dragOffset : null;
            const isSelected = selectedSlot === slot.slot;
            return (
              <div
                aria-label={slot.label}
                className={`squad-pitch-token squad-pitch-token--${side}${
                  isSelected ? " squad-pitch-token--selected" : ""
                }${isDragging ? " squad-pitch-token--dragging" : ""}`}
                key={`player-${slot.playerId}`}
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
                          event.preventDefault();
                          removeSlotPlayer(slot);
                        }
                      }
                }
                onPointerDown={
                  readOnly ? undefined : (event) => handleTokenPointerDown(event, slot)
                }
              >
                <PitchTokenName label={slot.label} />
                {!readOnly && isSelected ? (
                  <button
                    className="squad-pitch-token-remove"
                    type="button"
                    aria-label={`Remove ${slot.label} from pitch`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeSlotPlayer(slot);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            );
          })}

      </div>
    </div>
  );
});

export { DRAG_PLAYER_MIME } from "@/lib/squads/drag-player";
export { SLOTS_PER_TEAM } from "@/lib/squads/lineup";
