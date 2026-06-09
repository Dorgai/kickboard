import { parseWorldCupFixtureDate } from "@/lib/fixtures/fixture-date";
import {
  parseApiFootballFixtureId,
  teamNameToFixtureSlug,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";
import { parseWorldCupKeySlugs } from "@/lib/fixtures/fixture-key-match";
import { loadWorldCupFixtureOptions } from "@/lib/fixtures/world-cup-fixture-options";

export type FixturePredictionWindow = Pick<FixtureOption, "date" | "status">;

export function isFixturePredictionOpen(
  fixture: FixturePredictionWindow | null | undefined,
  now = Date.now()
): boolean {
  if (!fixture) return true;
  if (fixture.status === "live" || fixture.status === "finished") return false;

  const kickoff = parseWorldCupFixtureDate(fixture.date);
  if (kickoff && now >= kickoff.getTime()) return false;

  return true;
}

export function isFixturePredictionLocked(fixture: FixturePredictionWindow | null | undefined) {
  return !isFixturePredictionOpen(fixture);
}

function slugsForOption(option: FixtureOption) {
  const fromKey = parseWorldCupKeySlugs(option.key);
  if (fromKey.homeSlug && fromKey.awaySlug) return fromKey;
  return {
    homeSlug: teamNameToFixtureSlug(option.homeTeam),
    awaySlug: teamNameToFixtureSlug(option.awayTeam)
  };
}

function slugsMatch(
  a: { homeSlug: string; awaySlug: string },
  b: { homeSlug: string; awaySlug: string }
) {
  if (!a.homeSlug || !a.awaySlug || !b.homeSlug || !b.awaySlug) return false;
  return (
    (a.homeSlug === b.homeSlug && a.awaySlug === b.awaySlug) ||
    (a.homeSlug === b.awaySlug && a.awaySlug === b.homeSlug)
  );
}

function pickBestFixtureOption(candidates: FixtureOption[]) {
  if (candidates.length === 0) return null;
  const live = candidates.find((option) => option.status === "live");
  if (live) return live;
  const finished = candidates.find((option) => option.status === "finished");
  if (finished) return finished;
  return candidates.find((option) => option.key.startsWith("api-football:")) ?? candidates[0];
}

function findFixtureOptionInList(fixtureKey: string, options: FixtureOption[]) {
  const key = fixtureKey.trim();
  if (!key) return null;

  const direct = options.filter((option) => option.key === key);
  if (direct.length) return pickBestFixtureOption(direct);

  if (key.startsWith("api-football:") && parseApiFootballFixtureId(key)) {
    return options.find((option) => option.key === key) ?? null;
  }

  const targetSlugs = parseWorldCupKeySlugs(key);
  if (!targetSlugs.homeSlug || !targetSlugs.awaySlug) return null;

  const matches = options.filter((option) => slugsMatch(targetSlugs, slugsForOption(option)));
  return pickBestFixtureOption(matches);
}

export async function resolveFixtureOptionByKey(fixtureKey: string): Promise<FixtureOption | null> {
  const options = await loadWorldCupFixtureOptions();
  return findFixtureOptionInList(fixtureKey, options);
}

export async function getFixturePredictionLockState(fixtureKey: string) {
  const option = await resolveFixtureOptionByKey(fixtureKey);
  const kickoff = option?.date ? parseWorldCupFixtureDate(option.date)?.toISOString() ?? null : null;
  return {
    locked: isFixturePredictionLocked(option),
    kickoff,
    status: option?.status ?? null
  };
}

export async function assertFixturePredictionsOpen(fixtureKey: string) {
  const { locked } = await getFixturePredictionLockState(fixtureKey);
  if (locked) throw new Error("PREDICTIONS_LOCKED");
}
