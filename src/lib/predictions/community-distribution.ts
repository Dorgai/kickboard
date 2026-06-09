import { query } from "@/lib/db";
import type { FixtureOutcome } from "@/lib/fixture-predictions/types";
import {
  fixtureKeyMatchSqlFrom,
  resolveFixtureKeyMatchParams
} from "@/lib/fixtures/fixture-key-match";
import {
  listApiFootballFixtureKeysForTeams,
  teamsUsableForApiFootballLookup
} from "@/lib/fixtures/fixture-key-query";
import { teamsMatch } from "@/lib/squads/team-names";
import { DEFAULT_TOURNAMENT_KEY } from "@/lib/tournament-predictions/types";

const ELIGIBLE_USER_SQL = `u.deleted_at IS NULL AND u.is_child = false`;

export type CommunityDistributionOption = {
  key: string;
  label: string | null;
  count: number;
  percent: number;
};

export type CommunityDistribution = {
  scope: "fixture" | "tournament";
  category: string;
  totalPicks: number;
  eligiblePredictors: number;
  participationPercent: number;
  options: CommunityDistributionOption[];
};

function roundPercent(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function buildDistribution(
  scope: CommunityDistribution["scope"],
  category: string,
  rows: { key: string; label: string | null; count: number }[],
  eligiblePredictors: number
): CommunityDistribution {
  const totalPicks = rows.reduce((sum, row) => sum + row.count, 0);
  const participationPercent = roundPercent(totalPicks, eligiblePredictors);
  return {
    scope,
    category,
    totalPicks,
    eligiblePredictors,
    participationPercent,
    options: rows.map((row) => ({
      ...row,
      percent: roundPercent(row.count, totalPicks)
    }))
  };
}

async function countEligiblePredictors() {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM users u
     WHERE ${ELIGIBLE_USER_SQL}
       AND u.onboarding_completed_at IS NOT NULL`
  );
  return result.rows[0]?.count ?? 0;
}

async function resolveFixtureMatchBind(
  fixtureKey: string,
  homeTeam?: string,
  awayTeam?: string
) {
  const match = resolveFixtureKeyMatchParams({ fixtureKey, homeTeam, awayTeam });
  if (!match) return null;

  const home = homeTeam?.trim() ?? "";
  const away = awayTeam?.trim() ?? "";
  const apiKeys =
    match.homeSlug && match.awaySlug && teamsUsableForApiFootballLookup(home, away)
      ? await listApiFootballFixtureKeysForTeams(home, away)
      : [];

  if (match.homeSlug && match.awaySlug) {
    return {
      matchSql: fixtureKeyMatchSqlFrom("fp.fixture_key", 1),
      params: [match.fixtureKey, match.homeSlug, match.awaySlug, apiKeys] as const
    };
  }

  return {
    matchSql: "fp.fixture_key = $1",
    params: [match.fixtureKey] as const
  };
}

export async function getFixtureOutcomeDistribution(input: {
  fixtureKey: string;
  homeTeam?: string;
  awayTeam?: string;
  homeLabel?: string;
  awayLabel?: string;
}): Promise<CommunityDistribution> {
  const bind = await resolveFixtureMatchBind(input.fixtureKey, input.homeTeam, input.awayTeam);
  const eligiblePredictors = await countEligiblePredictors();

  if (!bind) {
    return buildDistribution("fixture", "outcome", [], eligiblePredictors);
  }

  const result = await query<{ predicted_outcome: string; count: number }>(
    `WITH matched AS (
       SELECT DISTINCT ON (fp.user_id)
         fp.user_id,
         fp.predicted_outcome
       FROM fixture_predictions fp
       INNER JOIN users u ON u.id = fp.user_id AND ${ELIGIBLE_USER_SQL}
       WHERE fp.predicted_outcome IS NOT NULL
         AND ${bind.matchSql}
       ORDER BY fp.user_id, fp.updated_at DESC
     )
     SELECT predicted_outcome, COUNT(*)::int AS count
     FROM matched
     GROUP BY predicted_outcome`,
    [...bind.params]
  );

  const labels: Record<FixtureOutcome, string> = {
    home: input.homeLabel?.trim() || "Home win",
    draw: "Draw",
    away: input.awayLabel?.trim() || "Away win"
  };

  const order: FixtureOutcome[] = ["home", "draw", "away"];
  const counts = new Map(result.rows.map((row) => [row.predicted_outcome, row.count]));

  const rows = order.map((key) => ({
    key,
    label: labels[key],
    count: counts.get(key) ?? 0
  }));

  return buildDistribution("fixture", "outcome", rows, eligiblePredictors);
}

export async function getTournamentTeamDistribution(input: {
  tournamentKey?: string;
  category: "champion" | "finalOpponent";
}): Promise<CommunityDistribution> {
  const tournamentKey = input.tournamentKey?.trim() || DEFAULT_TOURNAMENT_KEY;
  const eligiblePredictors = await countEligiblePredictors();

  if (input.category === "champion") {
    const result = await query<{ team: string; count: number }>(
      `SELECT tp.predicted_champion AS team, COUNT(*)::int AS count
       FROM tournament_predictions tp
       INNER JOIN users u ON u.id = tp.user_id AND ${ELIGIBLE_USER_SQL}
       WHERE tp.tournament_key = $1
         AND tp.predicted_champion IS NOT NULL
         AND btrim(tp.predicted_champion) <> ''
       GROUP BY tp.predicted_champion
       ORDER BY count DESC, team ASC`,
      [tournamentKey]
    );

    return buildDistribution(
      "tournament",
      "champion",
      result.rows.map((row) => ({
        key: row.team,
        label: row.team,
        count: row.count
      })),
      eligiblePredictors
    );
  }

  const result = await query<{ team: string; count: number }>(
    `WITH opponents AS (
       SELECT
         tp.user_id,
         (
           SELECT elem
           FROM jsonb_array_elements_text(tp.predicted_finalists) AS elem
           WHERE lower(btrim(elem)) <> lower(btrim(tp.predicted_champion))
           LIMIT 1
         ) AS team
       FROM tournament_predictions tp
       INNER JOIN users u ON u.id = tp.user_id AND ${ELIGIBLE_USER_SQL}
       WHERE tp.tournament_key = $1
         AND tp.predicted_champion IS NOT NULL
         AND jsonb_array_length(tp.predicted_finalists) > 0
     )
     SELECT team, COUNT(*)::int AS count
     FROM opponents
     WHERE team IS NOT NULL AND btrim(team) <> ''
     GROUP BY team
     ORDER BY count DESC, team ASC`,
    [tournamentKey]
  );

  return buildDistribution(
    "tournament",
    "finalOpponent",
    result.rows.map((row) => ({
      key: row.team,
      label: row.team,
      count: row.count
    })),
    eligiblePredictors
  );
}

export async function getTournamentPlayerDistribution(input: {
  tournamentKey?: string;
  category: "topScorer" | "bestPlayer";
  limit?: number;
}): Promise<CommunityDistribution> {
  const tournamentKey = input.tournamentKey?.trim() || DEFAULT_TOURNAMENT_KEY;
  const eligiblePredictors = await countEligiblePredictors();
  const column = input.category === "topScorer" ? "predicted_top_scorer" : "predicted_best_player";
  const limit = input.limit ?? 8;

  const result = await query<{ player_id: string; player_name: string; count: number }>(
    `SELECT
       tp.${column}->>'playerId' AS player_id,
       tp.${column}->>'playerName' AS player_name,
       COUNT(*)::int AS count
     FROM tournament_predictions tp
     INNER JOIN users u ON u.id = tp.user_id AND ${ELIGIBLE_USER_SQL}
     WHERE tp.tournament_key = $1
       AND tp.${column} IS NOT NULL
       AND tp.${column}->>'playerId' IS NOT NULL
     GROUP BY player_id, player_name
     ORDER BY count DESC, player_name ASC
     LIMIT $2`,
    [tournamentKey, limit]
  );

  return buildDistribution(
    "tournament",
    input.category,
    result.rows.map((row) => ({
      key: row.player_id,
      label: row.player_name,
      count: row.count
    })),
    eligiblePredictors
  );
}

export function lookupTeamCrowdPercent(
  distribution: CommunityDistribution | null | undefined,
  teamName: string
) {
  if (!distribution?.totalPicks) return null;
  const match = distribution.options.find((option) => teamsMatch(option.key, teamName));
  return match?.percent ?? 0;
}

export function outcomeCrowdPercents(distribution: CommunityDistribution | null | undefined) {
  const byKey = new Map(distribution?.options.map((option) => [option.key, option.percent]) ?? []);
  return {
    home: byKey.get("home") ?? 0,
    draw: byKey.get("draw") ?? 0,
    away: byKey.get("away") ?? 0,
    totalPicks: distribution?.totalPicks ?? 0,
    participationPercent: distribution?.participationPercent ?? 0
  };
}
