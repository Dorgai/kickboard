"use client";

import { useCallback, useRef, useState } from "react";
import { clampPitchCoord, type SquadLineupSlot } from "@/lib/squads/lineup";

const DRAG_PLAYER_MIME = "application/x-kickboard-player";

export type PitchDragPlayer = {
  playerId: number;
  name: string;
  teamName: string;
  role: SquadLineupSlot["role"];
  jerseyNumber: number | null;
};

type SquadPitchProps = {
  lineup: SquadLineupSlot[];
  selectedSlot: number | null;
  onSelectSlot: (slot: number | null) => void;
  onLineupChange: (lineup: SquadLineupSlot[]) => void;
};

function coordsFromPointer(pitch: DOMRect, clientX: number, clientY: number) {
  const x = clampPitchCoord(((clientX - pitch.left) / pitch.width) * 100);
  const y = clampPitchCoord(((clientY - pitch.top) / pitch.height) * 100);
  return { x, y };
}

function nearestEmptySlot(lineup: SquadLineupSlot[], role?: SquadLineupSlot["role"]) {
  const byRole = lineup.findIndex((slot) => !slot.label && (!role || slot.role === role));
  if (byRole >= 0) return byRole;
  return lineup.findIndex((slot) => !slot.label);
}

export function SquadPitch({
  lineup,
  selectedSlot,
  onSelectSlot,
  onLineupChange
}: SquadPitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);

  const assignPlayerAt = useCallback(
    (player: PitchDragPlayer, coords: { x: number; y: number }, targetSlot?: number) => {
      const slotIndex =
        targetSlot !== undefined
          ? targetSlot
          : nearestEmptySlot(
              lineup,
              player.role
            );

      if (slotIndex < 0) return;

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
      onSelectSlot(slotIndex + 1);
    },
    [lineup, onLineupChange, onSelectSlot]
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
      const coords = coordsFromPointer(pitch, event.clientX, event.clientY);
      assignPlayerAt(player, coords);
    } catch {
      /* ignore malformed drag payload */
    }
  }

  return (
    <div className="squad-pitch-wrap">
      <p className="squad-pitch-hint">
        Drag players from the pool onto the pitch. Drag tokens to set exact positions. Click a token
        then <kbd>Backspace</kbd> to remove.
      </p>
      <div
        aria-label="Football pitch"
        className="squad-pitch"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ref={pitchRef}
        role="application"
      >
        <div className="squad-pitch-grass" />
        <div className="squad-pitch-midline" />
        <div className="squad-pitch-circle" />
        <div className="squad-pitch-box squad-pitch-box--top" />
        <div className="squad-pitch-box squad-pitch-box--bottom" />

        {lineup.map((slot) => (
          <button
            className={`squad-pitch-ghost${slot.label ? " squad-pitch-ghost--filled" : ""}${
              selectedSlot === slot.slot ? " squad-pitch-ghost--selected" : ""
            }`}
            key={`ghost-${slot.slot}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            type="button"
            onClick={() => onSelectSlot(slot.slot)}
            aria-label={`${slot.role} slot ${slot.slot}`}
          />
        ))}

        {lineup
          .filter((slot) => slot.label)
          .map((slot) => (
            <div
              className={`squad-pitch-token${selectedSlot === slot.slot ? " squad-pitch-token--selected" : ""}`}
              key={slot.slot}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                setDraggingSlot(slot.slot);
                onSelectSlot(slot.slot);
                const pitch = pitchRef.current?.getBoundingClientRect();
                if (!pitch) return;

                const onMove = (moveEvent: PointerEvent) => {
                  moveSlot(slot.slot, coordsFromPointer(pitch, moveEvent.clientX, moveEvent.clientY));
                };

                const onUp = () => {
                  setDraggingSlot(null);
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Backspace" || event.key === "Delete") {
                  clearSlot(slot.slot);
                }
              }}
            >
              <span className="squad-pitch-token-role">{slot.role}</span>
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

export { DRAG_PLAYER_MIME };
