import { clampPitchCoord, type PitchCoords } from "@/lib/squads/lineup";
import type { SquadLineupSide } from "@/lib/squads/lineup";

/** Vertical = goals top/bottom (phone). Horizontal = goals left/right (tablet+). */
export type PitchLayout = "vertical" | "horizontal";

/** Canonical pitch coords: x = touchline, y = goal line (home low y, away high y). */
export function canonicalCoordsFromPointer(
  pitch: DOMRect,
  clientX: number,
  clientY: number,
  layout: PitchLayout
): PitchCoords {
  const domX = ((clientX - pitch.left) / pitch.width) * 100;
  const domY = ((clientY - pitch.top) / pitch.height) * 100;
  if (layout === "vertical") {
    return { x: clampPitchCoord(domX), y: clampPitchCoord(domY) };
  }
  return { x: clampPitchCoord(domY), y: clampPitchCoord(domX) };
}

export function displayPositionFromCanonical(
  coords: PitchCoords,
  layout: PitchLayout
): { left: number; top: number } {
  if (layout === "vertical") {
    return { left: coords.x, top: coords.y };
  }
  return { left: coords.y, top: coords.x };
}

export function sideFromCanonicalCoords(coords: PitchCoords): SquadLineupSide {
  return coords.y < 50 ? "home" : "away";
}

export function hitTestPitchRect(
  pitch: DOMRect,
  clientX: number,
  clientY: number,
  layout: PitchLayout
): { inside: boolean; side: SquadLineupSide | null } {
  const inside =
    clientX >= pitch.left &&
    clientX <= pitch.right &&
    clientY >= pitch.top &&
    clientY <= pitch.bottom;
  if (!inside) return { inside: false, side: null };
  const coords = canonicalCoordsFromPointer(pitch, clientX, clientY, layout);
  return { inside: true, side: sideFromCanonicalCoords(coords) };
}
