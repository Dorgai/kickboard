import type { SquadLineupSlot } from "@/lib/squads/lineup";

export const DRAG_PLAYER_MIME = "application/x-kickboard-player";

export type PitchDragPlayer = {
  playerId: number;
  name: string;
  teamName: string;
  role: SquadLineupSlot["role"];
  jerseyNumber: number | null;
  fromPitch?: boolean;
};

export function writePlayerDragData(dataTransfer: DataTransfer, player: PitchDragPlayer) {
  const json = JSON.stringify(player);
  dataTransfer.setData(DRAG_PLAYER_MIME, json);
  dataTransfer.setData("text/plain", json);
}

export function readPlayerDragData(dataTransfer: DataTransfer): PitchDragPlayer | null {
  const raw = dataTransfer.getData(DRAG_PLAYER_MIME) || dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PitchDragPlayer;
    if (typeof parsed.playerId !== "number" || typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isPlayerDragEvent(event: React.DragEvent) {
  const types = event.dataTransfer.types;
  return types.includes(DRAG_PLAYER_MIME) || types.includes("text/plain");
}
