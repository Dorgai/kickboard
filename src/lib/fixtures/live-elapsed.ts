import { inferElapsedMinutesFromKickoff, kickoffInstant } from "@/lib/fixtures/infer-fixture-status";

/** Prefer API elapsed; fall back to kickoff-based minutes during live play. */
export function resolveLiveElapsed(
  status: "upcoming" | "live" | "finished",
  date: string | null | undefined,
  serverElapsed: number | null | undefined,
  nowMs = Date.now()
): number | null {
  if (status !== "live") return serverElapsed ?? null;
  if (serverElapsed != null) return serverElapsed;
  return inferElapsedMinutesFromKickoff(date, nowMs);
}

export function formatLiveStatusLabel(
  status: "upcoming" | "live" | "finished",
  elapsed: number | null | undefined
) {
  if (status === "live") {
    return elapsed != null ? `Live · ${elapsed}'` : "Live";
  }
  if (status === "finished") return "FT";
  return null;
}

export function kickoffInstantMs(date: string | null | undefined) {
  return kickoffInstant(date);
}
