"use client";

import { useCallback, useRef, useState } from "react";
import {
  clampPitchCoord,
  slotSide,
  SLOTS_PER_TEAM,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import { playerRoleLabel } from "@/lib/squads/player-roles";
import { teamsMatch } from "@/lib/squads/team-names";

const DRAG_PLAYER_MIME = "application/x-kickboard-player";

export type PitchDragPlayer = {
  playerId: number;
  name: string;
  teamName: string;
  role: SquadLineupSlot["role"];
  jerseyNumber: number | null;
  fromPitch?: boolean;
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
  side: SquadLineupSlot["side"],
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

      const next = lineup.map((slot, index) => {
        if (index === slotIndex) {
          return {
            ...slot,
            label: player.name,
            role: player.role,
            playerId: player.playerId,
            teamName: player.teamName,
            jerseyNumber: player.jerseyNumber ?? undefined,
            x: coords.x,
            y: coords.y
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
        lineup.map((slot) =>
          slot.slot === slotNumber ? { ...slot, x: coords.x, y: coords.y } : slot
        )
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

    const raw = event.dataTransfer.getData(DRAG_PLAYER_MIME);
    if (!raw) return;

    try {
      const player = JSON.parse(raw) as PitchDragPlayer;
      if (player.fromPitch) return;
      const coords = coordsFromPointer(pitch, event.clientX, event.clientY);
      const dropSide: SquadLineupSlot["side"] = coords.y < 50 ? "home" : "away";
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
          Drag from each team&apos;s bench onto their half. Click a player or drag back to the bench to
          remove.
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
        <div className="squad-pitch-grass" aria-hidden />
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
          ? lineup.map((slot) => (
              <button
                className={`squad-pitch-ghost${slot.label ? " squad-pitch-ghost--filled" : " squad-pitch-ghost--empty"}${
                  selectedSlot === slot.slot ? " squad-pitch-ghost--selected" : ""
                }`}
                key={`ghost-${slot.slot}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                type="button"
                onClick={() => onSelectSlot(slot.slot)}
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
          .map((slot) => (
            <div
              className={`squad-pitch-token squad-pitch-token--${slotSide(slot)}${
                selectedSlot === slot.slot ? " squad-pitch-token--selected" : ""
              }`}
              draggable={!readOnly}
              key={slot.slot}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              onDragStart={
                readOnly
                  ? undefined
                  : (event) => {
                      event.dataTransfer.setData(
                        DRAG_PLAYER_MIME,
                        JSON.stringify({
                          playerId: Number(slot.playerId),
                          name: slot.label,
                          teamName: slot.teamName ?? "",
                          role: slot.role,
                          jerseyNumber: slot.jerseyNumber ?? null,
                          fromPitch: true
                        } satisfies PitchDragPlayer)
                      );
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
                      event.preventDefault();
                      setDraggingSlot(slot.slot);
                      onSelectSlot(slot.slot);
                      const pitch = pitchRef.current?.getBoundingClientRect();
                      if (!pitch) return;

                      const onMove = (moveEvent: PointerEvent) => {
                        if (
                          Math.abs(moveEvent.clientX - startX) > 4 ||
                          Math.abs(moveEvent.clientY - startY) > 4
                        ) {
                          moved = true;
                        }
                        moveSlot(
                          slot.slot,
                          coordsFromPointer(pitch, moveEvent.clientX, moveEvent.clientY)
                        );
                      };

                      const onUp = () => {
                        setDraggingSlot(null);
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                        if (!moved) {
                          clearSlot(slot.slot);
                        }
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
          ))}

        {draggingSlot ? <span className="squad-pitch-drag-overlay" aria-hidden /> : null}
      </div>
    </div>
  );
}

export { DRAG_PLAYER_MIME, SLOTS_PER_TEAM };
