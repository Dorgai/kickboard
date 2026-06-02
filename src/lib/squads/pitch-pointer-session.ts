import { hitTestBenchSide, hitTestPitchRect } from "@/lib/squads/pitch-hit-test";
import {
  clampPitchCoord,
  nearestFormationSlotNumber,
  slotSide,
  swapLineupSlots,
  type SquadLineupSide,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import { playerIdsMatch, type PitchDragPlayer } from "@/lib/squads/drag-player";
import { teamsMatch } from "@/lib/squads/team-names";

const DRAG_THRESHOLD_PX = 6;

export type PitchPointerSessionCallbacks = {
  getLineup: () => SquadLineupSlot[];
  commitLineup: (next: SquadLineupSlot[]) => void;
  getPitchRect: () => DOMRect | null;
  homeTeam: string;
  awayTeam: string;
  tryPlaceBenchPlayer: (player: PitchDragPlayer, clientX: number, clientY: number) => boolean;
  removePlayer: (playerId: number | string) => void;
  onDragVisualChange?: (playerId: number | string | null, offset: { x: number; y: number } | null) => void;
};

export type PitchPointerSession =
  | { kind: "bench"; player: PitchDragPlayer; startX: number; startY: number; moved: boolean }
  | {
      kind: "token";
      playerId: number | string;
      startX: number;
      startY: number;
      moved: boolean;
      lastTargetSlot: number | null;
    };

export function sideForDragPlayer(
  player: PitchDragPlayer,
  homeTeam: string,
  awayTeam: string
): SquadLineupSide | null {
  if (teamsMatch(player.teamName, homeTeam)) return "home";
  if (teamsMatch(player.teamName, awayTeam)) return "away";
  return null;
}

export function startBenchPointerSession(player: PitchDragPlayer, x: number, y: number): PitchPointerSession {
  return { kind: "bench", player, startX: x, startY: y, moved: false };
}

export function startTokenPointerSession(
  playerId: number | string,
  x: number,
  y: number
): PitchPointerSession {
  return { kind: "token", playerId, startX: x, startY: y, moved: false, lastTargetSlot: null };
}

function coordsFromPointer(pitch: DOMRect, clientX: number, clientY: number) {
  return {
    x: clampPitchCoord(((clientX - pitch.left) / pitch.width) * 100),
    y: clampPitchCoord(((clientY - pitch.top) / pitch.height) * 100)
  };
}

function moveToken(
  session: Extract<PitchPointerSession, { kind: "token" }>,
  callbacks: PitchPointerSessionCallbacks,
  clientX: number,
  clientY: number,
  force = false
) {
  const pitch = callbacks.getPitchRect();
  if (!pitch) return;

  const currentLineup = callbacks.getLineup();
  const moving = currentLineup.find(
    (slot) => playerIdsMatch(slot.playerId, session.playerId) && slot.label
  );
  if (!moving) return;

  const coords = coordsFromPointer(pitch, clientX, clientY);
  const side = slotSide(moving);
  const { side: dropSide } = hitTestPitchRect(pitch, clientX, clientY);
  if (!dropSide || side !== dropSide) return;

  const targetSlot = nearestFormationSlotNumber(currentLineup, side, coords);
  if (!targetSlot || targetSlot === moving.slot) {
    session.lastTargetSlot = null;
    return;
  }
  if (!force && targetSlot === session.lastTargetSlot) return;

  session.lastTargetSlot = targetSlot;
  callbacks.commitLineup(swapLineupSlots(currentLineup, moving.slot, targetSlot));
}

export function updatePointerSession(
  session: PitchPointerSession,
  callbacks: PitchPointerSessionCallbacks,
  clientX: number,
  clientY: number
) {
  const deltaX = clientX - session.startX;
  const deltaY = clientY - session.startY;

  if (!session.moved) {
    if (Math.abs(deltaX) <= DRAG_THRESHOLD_PX && Math.abs(deltaY) <= DRAG_THRESHOLD_PX) return;
    session.moved = true;
  }

  if (session.kind === "bench") {
    callbacks.onDragVisualChange?.(session.player.playerId, { x: deltaX, y: deltaY });
    return;
  }

  callbacks.onDragVisualChange?.(session.playerId, { x: deltaX, y: deltaY });
  moveToken(session, callbacks, clientX, clientY);
}

export function endPointerSession(
  session: PitchPointerSession,
  callbacks: PitchPointerSessionCallbacks,
  clientX: number,
  clientY: number
) {
  callbacks.onDragVisualChange?.(null, null);

  if (!session.moved) return;

  if (session.kind === "bench") {
    if (session.player.fromPitch) {
      const benchSide = hitTestBenchSide(clientX, clientY);
      const playerSide = sideForDragPlayer(session.player, callbacks.homeTeam, callbacks.awayTeam);
      if (benchSide && playerSide === benchSide) {
        callbacks.removePlayer(session.player.playerId);
      } else {
        callbacks.tryPlaceBenchPlayer(session.player, clientX, clientY);
      }
      return;
    }
    callbacks.tryPlaceBenchPlayer(session.player, clientX, clientY);
    return;
  }

  const benchSide = hitTestBenchSide(clientX, clientY);
  const currentLineup = callbacks.getLineup();
  const moving = currentLineup.find(
    (slot) => playerIdsMatch(slot.playerId, session.playerId) && slot.label
  );
  if (benchSide && moving && slotSide(moving) === benchSide) {
    callbacks.removePlayer(session.playerId);
    return;
  }

  session.lastTargetSlot = null;
  moveToken(session, callbacks, clientX, clientY, true);
}

export function attachPitchPointerSession(
  session: PitchPointerSession,
  callbacks: PitchPointerSessionCallbacks,
  options?: { captureTarget?: HTMLElement | null; onEnd?: () => void }
) {
  const captureTarget = options?.captureTarget ?? null;

  const onMove = (moveEvent: PointerEvent) => {
    moveEvent.preventDefault();
    updatePointerSession(session, callbacks, moveEvent.clientX, moveEvent.clientY);
  };

  const onEnd = (endEvent: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
    if (captureTarget?.hasPointerCapture(endEvent.pointerId)) {
      captureTarget.releasePointerCapture(endEvent.pointerId);
    }
    endPointerSession(session, callbacks, endEvent.clientX, endEvent.clientY);
    options?.onEnd?.();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd);
  window.addEventListener("pointercancel", onEnd);
}
