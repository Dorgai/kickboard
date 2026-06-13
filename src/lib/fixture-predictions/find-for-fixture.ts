import { resolveFixtureKeyMatchParams } from "@/lib/fixtures/fixture-key-match";
import type { FixturePredictionRecord } from "@/lib/fixture-predictions/types";

function slugPairKey(homeSlug: string, awaySlug: string) {
  return [homeSlug, awaySlug].sort().join("|");
}

export function findUserPredictionForFixture(
  predictions: FixturePredictionRecord[],
  input: { fixtureKey: string; homeTeam: string; awayTeam: string }
): FixturePredictionRecord | null {
  const direct = predictions.find((prediction) => prediction.fixtureKey === input.fixtureKey);
  if (direct) return direct;

  const target = resolveFixtureKeyMatchParams(input);
  if (!target?.homeSlug || !target?.awaySlug) return null;

  const targetPair = slugPairKey(target.homeSlug, target.awaySlug);
  for (const prediction of predictions) {
    const match = resolveFixtureKeyMatchParams({ fixtureKey: prediction.fixtureKey });
    if (!match?.homeSlug || !match?.awaySlug) continue;
    if (slugPairKey(match.homeSlug, match.awaySlug) === targetPair) {
      return prediction;
    }
  }

  return null;
}
