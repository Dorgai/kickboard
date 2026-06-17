import { loadMatchBoard } from "@/lib/fixtures/match-board";
import type { MatchBoardFixtureState } from "@/lib/fixtures/match-board-shared";
import { parseFixtureKeyTeams, teamNameToFixtureSlug } from "@/lib/fixtures/fixture-key";
import { resolveFixtureKeyMatchParams } from "@/lib/fixtures/fixture-key-match";
import { normalizeMatchGoals } from "@/lib/fixtures/display-match-score";
import type { FixtureMatchFacts } from "@/lib/fixture-predictions/grading";

function slugPairKey(homeSlug: string, awaySlug: string) {
  return [homeSlug, awaySlug].sort().join("|");
}

function stateToFacts(state: MatchBoardFixtureState): FixtureMatchFacts | null {
  if (state.status !== "finished") return null;
  const goals = normalizeMatchGoals(state.homeGoals, state.awayGoals, "finished");
  if (goals.homeGoals === null || goals.awayGoals === null) return null;

  return {
    homeGoals: goals.homeGoals,
    awayGoals: goals.awayGoals,
    goalScorers: state.goalScorers ?? []
  };
}

export type FinishedMatchIndex = {
  byFixtureKey: Map<string, FixtureMatchFacts>;
  bySlugPair: Map<string, FixtureMatchFacts>;
};

export async function buildFinishedMatchIndex(): Promise<FinishedMatchIndex> {
  const board = await loadMatchBoard();
  const byFixtureKey = new Map<string, FixtureMatchFacts>();
  const bySlugPair = new Map<string, FixtureMatchFacts>();

  for (const [fixtureKey, state] of Object.entries(board.byKey)) {
    const facts = stateToFacts(state);
    if (!facts) continue;
    byFixtureKey.set(fixtureKey, facts);

    const teams = parseFixtureKeyTeams(fixtureKey);
    const match = resolveFixtureKeyMatchParams({
      fixtureKey,
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam
    });
    if (match?.homeSlug && match.awaySlug) {
      bySlugPair.set(slugPairKey(match.homeSlug, match.awaySlug), facts);
    } else {
      const homeSlug = teamNameToFixtureSlug(teams.homeTeam);
      const awaySlug = teamNameToFixtureSlug(teams.awayTeam);
      if (homeSlug && awaySlug) {
        bySlugPair.set(slugPairKey(homeSlug, awaySlug), facts);
      }
    }
  }

  return { byFixtureKey, bySlugPair };
}

export function lookupFinishedMatchFacts(
  index: FinishedMatchIndex,
  fixtureKey: string
): FixtureMatchFacts | null {
  const direct = index.byFixtureKey.get(fixtureKey);
  if (direct) return direct;

  const teams = parseFixtureKeyTeams(fixtureKey);
  const match = resolveFixtureKeyMatchParams({
    fixtureKey,
    homeTeam: teams.homeTeam,
    awayTeam: teams.awayTeam
  });
  if (match?.homeSlug && match?.awaySlug) {
    return index.bySlugPair.get(slugPairKey(match.homeSlug, match.awaySlug)) ?? null;
  }

  const homeSlug = teamNameToFixtureSlug(teams.homeTeam);
  const awaySlug = teamNameToFixtureSlug(teams.awayTeam);
  if (homeSlug && awaySlug) {
    return index.bySlugPair.get(slugPairKey(homeSlug, awaySlug)) ?? null;
  }

  return null;
}
