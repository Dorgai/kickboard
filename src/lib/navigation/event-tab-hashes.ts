export type EventTab = "current" | "past";

export const PAST_EVENT_HASHES = new Set(["bracket", "squads", "players", "analytics"]);
export const CURRENT_EVENT_HASHES = new Set([
  "tournament",
  "bracket",
  "coach-board",
  "predictions",
  "community"
]);
