import { listAcceptedPeerIds } from "@/lib/connections/store";
import { query } from "@/lib/db";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import {
  formatTournamentFinalistsLabel,
  formatTournamentPlayerLabel
} from "@/lib/tournament-predictions/overview-shared";
import {
  parsePredictedFinalists,
  parseTournamentPlayerPick,
  type TournamentPredictionRecord
} from "@/lib/tournament-predictions/types";

export type LiveConnectionActivity = {
  id: string;
  title: string;
  body: string;
  href: string;
  fixtureKey: string | null;
  occurredAt: string;
};

function peerName(displayName: string | null | undefined, username: string) {
  return displayName?.trim() || username || "A connection";
}

function parseSince(raw: string | null) {
  if (!raw?.trim()) return new Date(Date.now() - 60_000);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(Date.now() - 60_000) : parsed;
}

function mapTournamentRow(row: {
  id: string;
  predicted_champion: string | null;
  predicted_finalists: unknown;
  predicted_top_scorer: unknown;
  updated_at: Date;
  username: string;
  display_name: string | null;
}): LiveConnectionActivity | null {
  const name = peerName(row.display_name, row.username);
  const record: TournamentPredictionRecord = {
    id: row.id,
    tournamentKey: "wc26",
    predictedChampion: row.predicted_champion,
    predictedFinalists: parsePredictedFinalists(row.predicted_finalists),
    predictedTopScorer: parseTournamentPlayerPick(row.predicted_top_scorer),
    predictedTopScorerBoard: null,
    predictedBestPlayer: null,
    championStatus: "pending",
    finalistsStatus: "pending",
    topScorerStatus: "pending",
    bestPlayerStatus: "pending",
    topScorerBoardStatus: "pending",
    championPointsAwarded: 0,
    finalistsPointsAwarded: 0,
    topScorerPointsAwarded: 0,
    bestPlayerPointsAwarded: 0,
    topScorerBoardPointsAwarded: 0,
    createdAt: row.updated_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };

  if (row.predicted_champion) {
    return {
      id: `tournament-champion-${row.id}-${row.updated_at.toISOString()}`,
      title: `${name} picked a champion`,
      body: row.predicted_champion,
      href: "/#predictions-tournament",
      fixtureKey: null,
      occurredAt: row.updated_at.toISOString()
    };
  }

  const finalists = formatTournamentFinalistsLabel(record);
  if (finalists) {
    return {
      id: `tournament-final-${row.id}-${row.updated_at.toISOString()}`,
      title: `${name} updated tournament picks`,
      body: finalists,
      href: "/#predictions-tournament",
      fixtureKey: null,
      occurredAt: row.updated_at.toISOString()
    };
  }

  const scorer = formatTournamentPlayerLabel(record.predictedTopScorer);
  if (scorer) {
    return {
      id: `tournament-scorer-${row.id}-${row.updated_at.toISOString()}`,
      title: `${name} picked a top scorer`,
      body: scorer,
      href: "/#predictions-tournament",
      fixtureKey: null,
      occurredAt: row.updated_at.toISOString()
    };
  }

  return null;
}

export async function listLiveConnectionActivity(
  userId: string,
  sinceInput: string | null
): Promise<LiveConnectionActivity[]> {
  const peerIds = await listAcceptedPeerIds(userId);
  if (!peerIds.length) return [];

  const since = parseSince(sinceInput);

  const [predictionEvents, squads, posts, tournamentRows] = await Promise.all([
    query<{
      id: string;
      user_id: string;
      fixture_key: string;
      action: string;
      summary: string;
      created_at: Date;
      username: string;
      display_name: string | null;
    }>(
      `SELECT e.id, e.user_id, e.fixture_key, e.action, e.summary, e.created_at,
              u.username, u.display_name
       FROM fixture_prediction_events e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.user_id = ANY($1::uuid[])
         AND e.created_at > $2
       ORDER BY e.created_at ASC
       LIMIT 20`,
      [peerIds, since]
    ),
    query<{
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
         AND GREATEST(s.updated_at, COALESCE(s.published_to_board_at, s.updated_at)) > $2
       ORDER BY GREATEST(s.updated_at, COALESCE(s.published_to_board_at, s.updated_at)) ASC
       LIMIT 20`,
      [peerIds, since]
    ),
    query<{
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
         AND p.created_at > $2
       ORDER BY p.created_at ASC
       LIMIT 20`,
      [peerIds, since]
    ),
    query<{
      id: string;
      predicted_champion: string | null;
      predicted_finalists: unknown;
      predicted_top_scorer: unknown;
      updated_at: Date;
      username: string;
      display_name: string | null;
    }>(
      `SELECT tp.id, tp.predicted_champion, tp.predicted_finalists, tp.predicted_top_scorer,
              tp.updated_at, u.username, u.display_name
       FROM tournament_predictions tp
       INNER JOIN users u ON u.id = tp.user_id
       WHERE tp.user_id = ANY($1::uuid[])
         AND tp.updated_at > $2
       ORDER BY tp.updated_at ASC
       LIMIT 20`,
      [peerIds, since]
    )
  ]);

  const items: LiveConnectionActivity[] = [];

  for (const row of predictionEvents.rows) {
    const name = peerName(row.display_name, row.username);
    const fixtureLabel = fixtureKeyToShortLabel(row.fixture_key);
    const headline =
      row.action === "created"
        ? `${name} placed a match pick`
        : row.action === "deleted"
          ? `${name} removed a match pick`
          : `${name} updated a match pick`;
    items.push({
      id: `prediction-event-${row.id}`,
      title: headline,
      body: row.summary.trim() || fixtureLabel,
      href: "/?predictionsTab=match#predictions-match",
      fixtureKey: row.fixture_key,
      occurredAt: row.created_at.toISOString()
    });
  }

  for (const row of squads.rows) {
    const name = peerName(row.display_name, row.username);
    const occurredAt = (row.published_to_board_at ?? row.updated_at).toISOString();
    const match = row.fixture_key ? fixtureKeyToShortLabel(row.fixture_key) : "Coach Board";
    const published = Boolean(row.published_to_board_at);
    items.push({
      id: `squad-${row.id}-${occurredAt}`,
      title: published ? `${name} published a board` : `${name} updated a board`,
      body: `${row.name} — ${match}`,
      href: "/#coach-board",
      fixtureKey: row.fixture_key,
      occurredAt
    });
  }

  for (const row of posts.rows) {
    const name = peerName(row.display_name, row.username);
    items.push({
      id: `post-${row.id}`,
      title: `${name} posted on Coach Board`,
      body: (row.body ?? "Shared on Coach Board").slice(0, 160),
      href: "/#community",
      fixtureKey: row.fixture_key,
      occurredAt: row.created_at.toISOString()
    });
  }

  for (const row of tournamentRows.rows) {
    const mapped = mapTournamentRow(row);
    if (mapped) items.push(mapped);
  }

  return items.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
}
