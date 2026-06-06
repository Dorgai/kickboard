import { teamNameToFixtureSlug } from "@/lib/fixtures/fixture-key";

export type FixtureKeyMatchParams = {
  fixtureKey: string;
  homeSlug: string;
  awaySlug: string;
};

/** Slugs embedded in a stored wc26 fixture key (parts 3 and 4). */
export function parseWorldCupKeySlugs(fixtureKey: string) {
  const parts = fixtureKey.trim().split(":");
  if (parts[0] !== "wc26" || parts.length < 5) {
    return { homeSlug: "", awaySlug: "" };
  }
  const homeSlug = parts[2]?.trim() ?? "";
  const awaySlug = parts[3]?.trim() ?? "";
  if (!homeSlug || !awaySlug || homeSlug === "home" || awaySlug === "away") {
    return { homeSlug: "", awaySlug: "" };
  }
  return { homeSlug, awaySlug };
}

/** Resolve slug pair for cross-key fixture matching (wc26 + api-football aliases). */
export function resolveFixtureKeyMatchParams(input: {
  fixtureKey?: string;
  homeTeam?: string;
  awayTeam?: string;
}): FixtureKeyMatchParams | null {
  const fixtureKey = input.fixtureKey?.trim().slice(0, 120) ?? "";
  if (!fixtureKey) return null;

  const fromTeams = {
    homeSlug: input.homeTeam?.trim() ? teamNameToFixtureSlug(input.homeTeam) : "",
    awaySlug: input.awayTeam?.trim() ? teamNameToFixtureSlug(input.awayTeam) : ""
  };

  if (fromTeams.homeSlug && fromTeams.awaySlug) {
    return { fixtureKey, homeSlug: fromTeams.homeSlug, awaySlug: fromTeams.awaySlug };
  }

  const fromKey = parseWorldCupKeySlugs(fixtureKey);
  if (fromKey.homeSlug && fromKey.awaySlug) {
    return { fixtureKey, homeSlug: fromKey.homeSlug, awaySlug: fromKey.awaySlug };
  }

  return { fixtureKey, homeSlug: "", awaySlug: "" };
}

/** SQL fragment matching the same fixture across wc26 key variants and api-football aliases. */
export function fixtureKeyMatchSql(column = "fixture_key") {
  return `(
  ${column} = $2
  OR (
    split_part(${column}, ':', 1) = 'wc26'
    AND (
      (split_part(${column}, ':', 3) = $3 AND split_part(${column}, ':', 4) = $4)
      OR (split_part(${column}, ':', 3) = $4 AND split_part(${column}, ':', 4) = $3)
    )
  )
  OR (cardinality($5::text[]) > 0 AND ${column} = ANY($5::text[]))
)`;
}

export function fixtureKeyMatchBindParams(
  peerIds: string[],
  match: FixtureKeyMatchParams,
  apiKeys: string[]
) {
  if (match.homeSlug && match.awaySlug) {
    return [peerIds, match.fixtureKey, match.homeSlug, match.awaySlug, apiKeys] as const;
  }
  return [peerIds, match.fixtureKey] as const;
}

export function fixtureKeyMatchQueryParams(
  peerIds: string[],
  match: FixtureKeyMatchParams,
  apiKeys: string[],
  limit: number
) {
  return {
    params: [...fixtureKeyMatchBindParams(peerIds, match, apiKeys), limit] as const
  };
}

type DatedPick = { userId: string; updatedAt: string };

/** Keep the newest pick per friend when several fixture_key aliases match the same match. */
export function dedupeConnectionPredictionsByUser<T extends DatedPick>(rows: T[]) {
  const byUser = new Map<string, T>();
  for (const row of rows) {
    const existing = byUser.get(row.userId);
    if (!existing || row.updatedAt > existing.updatedAt) {
      byUser.set(row.userId, row);
    }
  }
  return [...byUser.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
