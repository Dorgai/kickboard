import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";
import { listAcceptedPeerIds } from "@/lib/connections/store";
import { query } from "@/lib/db";
import {
  getCurrentWorldCupFeedCached,
  parseWorldCupFixtureDate
} from "@/lib/feeds/current-world-cup";
import {
  buildApiFootballFixtureKey,
  buildWorldCupFixtureKey,
  fixtureKeyToShortLabel,
  formatFixtureLabel
} from "@/lib/fixtures/fixture-key";
import { deliverUserAlert } from "@/lib/alerts/deliver";
import { upsertUserAlert, pruneOldAlerts } from "@/lib/alerts/store";
import { outcomeShort } from "@/lib/fixture-predictions/types";

const ACTIVITY_WINDOW_DAYS = 14;

function peerLabel(displayName: string | null, username: string) {
  return displayName?.trim() || username;
}

function formatPredictionBody(input: {
  homeScore: number | null;
  awayScore: number | null;
  predictedOutcome: string | null;
}) {
  const parts: string[] = [];
  if (input.predictedOutcome === "home" || input.predictedOutcome === "draw" || input.predictedOutcome === "away") {
    parts.push(outcomeShort(input.predictedOutcome));
  }
  if (input.homeScore !== null && input.awayScore !== null) {
    parts.push(`${input.homeScore}–${input.awayScore}`);
  }
  return parts.length ? parts.join(" · ") : "Updated picks";
}

async function syncConnectionActivityAlerts(userId: string, peerIds: string[]) {
  if (!peerIds.length) return;

  const predictions = await query<{
    user_id: string;
    fixture_key: string;
    home_score: number | null;
    away_score: number | null;
    predicted_outcome: string | null;
    updated_at: Date;
    username: string;
    display_name: string | null;
  }>(
    `SELECT fp.user_id, fp.fixture_key, fp.home_score, fp.away_score, fp.predicted_outcome, fp.updated_at,
            u.username, u.display_name
     FROM fixture_predictions fp
     INNER JOIN users u ON u.id = fp.user_id
     WHERE fp.user_id = ANY($1::uuid[])
       AND fp.updated_at > now() - ($2::text || ' days')::interval
     ORDER BY fp.updated_at DESC
     LIMIT 40`,
    [peerIds, String(ACTIVITY_WINDOW_DAYS)]
  );

  for (const row of predictions.rows) {
    const label = fixtureKeyToShortLabel(row.fixture_key);
    const name = peerLabel(row.display_name, row.username);
    await upsertUserAlert({
      userId,
      alertKey: `connection:prediction:${row.user_id}:${row.fixture_key}`,
      category: "connection_activity",
      title: `${name} updated predictions`,
      body: `${label} — ${formatPredictionBody({
        homeScore: row.home_score,
        awayScore: row.away_score,
        predictedOutcome: row.predicted_outcome
      })}`,
      href: "/?predictionsTab=match#predictions-match",
      actorUserId: row.user_id,
      fixtureKey: row.fixture_key,
      occurredAt: row.updated_at
    });
  }

  const squads = await query<{
    id: string;
    user_id: string;
    name: string;
    fixture_key: string | null;
    updated_at: Date;
    published_to_board_at: Date | null;
    username: string;
    display_name: string | null;
  }>(
    `SELECT s.id, s.user_id, s.name, s.fixture_key, s.updated_at, s.published_to_board_at,
            u.username, u.display_name
     FROM squads s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.user_id = ANY($1::uuid[])
       AND GREATEST(s.updated_at, COALESCE(s.published_to_board_at, s.updated_at)) > now() - ($2::text || ' days')::interval
     ORDER BY GREATEST(s.updated_at, COALESCE(s.published_to_board_at, s.updated_at)) DESC
     LIMIT 40`,
    [peerIds, String(ACTIVITY_WINDOW_DAYS)]
  );

  for (const row of squads.rows) {
    const name = peerLabel(row.display_name, row.username);
    const match = row.fixture_key ? fixtureKeyToShortLabel(row.fixture_key) : "Coach Board";
    const published = Boolean(row.published_to_board_at);
    const occurredAt = row.published_to_board_at ?? row.updated_at;
    await upsertUserAlert({
      userId,
      alertKey: `connection:squad:${row.id}`,
      category: "connection_activity",
      title: published ? `${name} published a board` : `${name} updated a board`,
      body: `${row.name} — ${match}`,
      href: "/#coach-board",
      actorUserId: row.user_id,
      fixtureKey: row.fixture_key,
      occurredAt
    });
  }

  const posts = await query<{
    id: string;
    author_id: string;
    body: string | null;
    fixture_key: string | null;
    created_at: Date;
    username: string;
    display_name: string | null;
  }>(
    `SELECT p.id, p.author_id, p.body, p.fixture_key, p.created_at, u.username, u.display_name
     FROM posts p
     INNER JOIN users u ON u.id = p.author_id
     WHERE p.author_id = ANY($1::uuid[])
       AND p.moderation_status = 'approved'
       AND p.created_at > now() - ($2::text || ' days')::interval
     ORDER BY p.created_at DESC
     LIMIT 30`,
    [peerIds, String(ACTIVITY_WINDOW_DAYS)]
  );

  for (const row of posts.rows) {
    const name = peerLabel(row.display_name, row.username);
    const snippet = (row.body ?? "Shared on Coach Board").slice(0, 120);
    await upsertUserAlert({
      userId,
      alertKey: `connection:post:${row.id}`,
      category: "connection_activity",
      title: `${name} posted on Coach Board`,
      body: snippet,
      href: "/#community",
      actorUserId: row.author_id,
      fixtureKey: row.fixture_key,
      occurredAt: row.created_at
    });
  }
}

function mapApiFixture(fixture: ApiFootballFixture) {
  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;
  const short = fixture.fixture.status.short;
  const isFinished = short === "FT" || short === "AET" || short === "PEN";
  const isLive = short === "1H" || short === "2H" || short === "HT" || short === "ET" || short === "LIVE";
  const isUpcoming = !isFinished && !isLive;

  const fixtureKey = buildApiFootballFixtureKey(fixture.fixture.id);
  return {
    fixtureKey,
    label: formatFixtureLabel({
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      date: fixture.fixture.date
    }),
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    date: new Date(fixture.fixture.date),
    isFinished,
    isUpcoming,
    homeGoals,
    awayGoals
  };
}

function worldCupLeagueParams() {
  return {
    league: process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1",
    season: process.env.API_FOOTBALL_SEASON?.trim() || "2026"
  };
}

async function syncWorldCupScheduleAlerts(userId: string) {
  try {
    const feed = await getCurrentWorldCupFeedCached();
    const now = Date.now();
    const upcomingCutoff = now + 1000 * 60 * 60 * 72;

    for (const group of feed.groups) {
      for (const fixture of group.fixtures) {
        const kickoff = parseWorldCupFixtureDate(fixture.date);
        if (!kickoff) continue;
        const kickoffMs = kickoff.getTime();
        if (kickoffMs < now - 1000 * 60 * 30) continue;
        if (kickoffMs > upcomingCutoff) continue;

        const fixtureKey = buildWorldCupFixtureKey({
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          date: fixture.date,
          group: group.group
        });

        await deliverUserAlert({
          userId,
          alertKey: `match:upcoming:${fixtureKey}`,
          category: "match_upcoming",
          title: "Upcoming match",
          body: `${fixture.homeTeam} vs ${fixture.awayTeam} — ${kickoff.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
          })} · Group ${group.group}`,
          href: "/#tournament",
          fixtureKey,
          occurredAt: kickoff,
          push: "ifNew"
        });
      }
    }
  } catch {
    /* Public schedule optional */
  }
}

async function syncApiFootballMatchAlerts(userId: string) {
  const { keyConfigured } = getApiFootballConfig();
  if (!keyConfigured) return;

  const wc = worldCupLeagueParams();

  try {
    const [upcoming, recent, live] = await Promise.all([
      fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, next: "25" }),
      fetchApiFootball<ApiFootballFixture[]>("/fixtures", { ...wc, last: "25" }),
      fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" })
    ]);

    const now = Date.now();
    const upcomingCutoff = now + 1000 * 60 * 60 * 72;

    for (const fixture of upcoming.response) {
      const mapped = mapApiFixture(fixture);
      if (!mapped.isUpcoming) continue;
      if (mapped.date.getTime() > upcomingCutoff) continue;
      if (mapped.date.getTime() < now - 1000 * 60 * 30) continue;

      await deliverUserAlert({
        userId,
        alertKey: `match:upcoming:${mapped.fixtureKey}`,
        category: "match_upcoming",
        title: "Upcoming match",
        body: `${mapped.homeTeam} vs ${mapped.awayTeam} — ${mapped.date.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        })}`,
        href: "/#tournament",
        fixtureKey: mapped.fixtureKey,
        occurredAt: mapped.date,
        push: "ifNew"
      });
    }

    const finishedFixtures = [...recent.response, ...live.response];
    const seenResultKeys = new Set<string>();

    for (const fixture of finishedFixtures) {
      const mapped = mapApiFixture(fixture);
      if (!mapped.isFinished) continue;
      if (mapped.homeGoals === null || mapped.awayGoals === null) continue;
      if (seenResultKeys.has(mapped.fixtureKey)) continue;
      seenResultKeys.add(mapped.fixtureKey);

      await deliverUserAlert({
        userId,
        alertKey: `match:result:${mapped.fixtureKey}`,
        category: "match_result",
        title: "Full-time result",
        body: `${mapped.homeTeam} ${mapped.homeGoals}–${mapped.awayGoals} ${mapped.awayTeam}`,
        href: "/#tournament",
        fixtureKey: mapped.fixtureKey,
        occurredAt: new Date(fixture.fixture.date),
        push: "ifNew"
      });
    }
  } catch {
    /* API optional — connection and schedule alerts still work */
  }
}

export async function syncAlertsForUser(userId: string) {
  const peerIds = await listAcceptedPeerIds(userId);
  await syncConnectionActivityAlerts(userId, peerIds);
  await syncWorldCupScheduleAlerts(userId);
  await syncApiFootballMatchAlerts(userId);
  await pruneOldAlerts(userId);
}
