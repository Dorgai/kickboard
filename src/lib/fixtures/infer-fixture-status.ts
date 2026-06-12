import { parseWorldCupFixtureDate } from "@/lib/fixtures/fixture-date";

const MATCH_WINDOW_MS = 105 * 60 * 1000;

export function kickoffInstant(date: string | null | undefined) {
  if (!date?.trim()) return null;
  const fromFeed = parseWorldCupFixtureDate(date);
  if (fromFeed) return fromFeed.getTime();
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Best-effort status when API-Football has no row for a static schedule fixture. */
export function inferFixtureStatusFromKickoff(
  date: string | null | undefined,
  nowMs = Date.now()
): "upcoming" | "live" | "finished" | null {
  const kickoff = kickoffInstant(date);
  if (kickoff == null) return null;
  if (nowMs < kickoff) return "upcoming";
  if (nowMs < kickoff + MATCH_WINDOW_MS) return "live";
  return "finished";
}

/** UTC calendar day (YYYY-MM-DD) for a static schedule date string. */
export function fixtureUtcDay(date: string | null | undefined) {
  const kickoff = kickoffInstant(date);
  if (kickoff == null) return null;
  return new Date(kickoff).toISOString().slice(0, 10);
}
