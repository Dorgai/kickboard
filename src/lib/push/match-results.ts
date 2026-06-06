import { deliverUserAlert } from "@/lib/alerts/deliver";
import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";
import { buildApiFootballFixtureKey } from "@/lib/fixtures/fixture-key";
import {
  listUsersWithPushSubscriptions,
  userPushNotificationsEnabled
} from "@/lib/push/store";

export type FinishedMatchResult = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  occurredAt: Date;
};

function mapFinishedFixture(fixture: ApiFootballFixture): FinishedMatchResult | null {
  const short = fixture.fixture.status.short;
  const isFinished = short === "FT" || short === "AET" || short === "PEN";
  if (!isFinished) return null;

  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;
  if (homeGoals === null || awayGoals === null) return null;

  return {
    fixtureKey: buildApiFootballFixtureKey(fixture.fixture.id),
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeGoals,
    awayGoals,
    occurredAt: new Date(fixture.fixture.date)
  };
}

export async function listRecentFinishedMatchResults(): Promise<FinishedMatchResult[]> {
  const { keyConfigured } = getApiFootballConfig();
  if (!keyConfigured) return [];

  const wc = {
    league: process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1",
    season: process.env.API_FOOTBALL_SEASON?.trim() || "2026"
  };

  try {
    const [recent, live] = await Promise.all([
      fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, last: "25" }),
      fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" })
    ]);

    const seen = new Set<string>();
    const results: FinishedMatchResult[] = [];

    for (const fixture of [...recent.response, ...live.response]) {
      const mapped = mapFinishedFixture(fixture);
      if (!mapped || seen.has(mapped.fixtureKey)) continue;
      seen.add(mapped.fixtureKey);
      results.push(mapped);
    }

    return results;
  } catch {
    return [];
  }
}

/** Push full-time results to every subscribed user (deduped per user via user_alerts). */
export async function pushRecentMatchResultsToSubscribers() {
  const matches = await listRecentFinishedMatchResults();
  if (!matches.length) {
    return { fixtures: 0, usersProcessed: 0, alertsCreated: 0 };
  }

  const userIds = await listUsersWithPushSubscriptions();
  let usersProcessed = 0;
  let alertsCreated = 0;

  for (const userId of userIds) {
    if (!(await userPushNotificationsEnabled(userId))) continue;
    usersProcessed += 1;

    for (const match of matches) {
      const { isNew } = await deliverUserAlert({
        userId,
        alertKey: `match:result:${match.fixtureKey}`,
        category: "match_result",
        title: "Full-time result",
        body: `${match.homeTeam} ${match.homeGoals}–${match.awayGoals} ${match.awayTeam}`,
        href: "/#tournament",
        fixtureKey: match.fixtureKey,
        occurredAt: match.occurredAt,
        push: "ifNew"
      });
      if (isNew) alertsCreated += 1;
    }
  }

  return {
    fixtures: matches.length,
    usersProcessed,
    alertsCreated
  };
}
