import { listAcceptedPeerIds } from "@/lib/connections/store";
import { query } from "@/lib/db";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import { outcomeShort } from "@/lib/fixture-predictions/types";
import { listConnectionsFixturePredictions } from "@/lib/fixture-predictions/overview";
import {
  formatTournamentFinalistsLabel,
  formatTournamentPlayerLabel,
  formatTournamentScorerBoardLabel
} from "@/lib/tournament-predictions/overview-shared";
import { listConnectionsTournamentPredictions } from "@/lib/tournament-predictions/overview";

export type FriendsDailyHighlight = {
  id: string;
  peerName: string;
  headline: string;
  detail: string;
  fixtureKey: string | null;
  occurredAt: string;
};

export type FriendsDailyHighlightsPayload = {
  peerCount: number;
  highlights: FriendsDailyHighlight[];
};

const HIGHLIGHT_LIMIT = 6;
const RECENT_EVENT_HOURS = 48;

function peerName(displayName: string | null | undefined, username: string) {
  return displayName?.trim() || username || "A connection";
}

function dedupeHighlights(items: FriendsDailyHighlight[]) {
  const seen = new Set<string>();
  const result: FriendsDailyHighlight[] = [];
  for (const item of items) {
    const key = `${item.peerName}:${item.fixtureKey ?? item.headline}:${item.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= HIGHLIGHT_LIMIT) break;
  }
  return result;
}

async function listRecentPeerPredictionEvents(peerIds: string[]) {
  const result = await query<{
    id: string;
    user_id: string;
    fixture_key: string;
    action: string;
    summary: string;
    next_snapshot: unknown;
    created_at: Date;
    username: string;
    display_name: string | null;
  }>(
    `SELECT e.id, e.user_id, e.fixture_key, e.action, e.summary, e.next_snapshot, e.created_at,
            u.username, u.display_name
     FROM fixture_prediction_events e
     INNER JOIN users u ON u.id = e.user_id
     WHERE e.user_id = ANY($1::uuid[])
       AND e.created_at > now() - make_interval(hours => $2)
       AND e.action IN ('created', 'updated')
     ORDER BY e.created_at DESC
     LIMIT 24`,
    [peerIds, RECENT_EVENT_HOURS]
  );

  return result.rows.map((row) => {
    const name = peerName(row.display_name, row.username);
    const fixtureLabel = fixtureKeyToShortLabel(row.fixture_key);
    const headline =
      row.action === "created" ? `${name} placed a match pick` : `${name} updated a match pick`;
    return {
      id: `event-${row.id}`,
      peerName: name,
      headline,
      detail: row.summary.trim() || fixtureLabel,
      fixtureKey: row.fixture_key,
      occurredAt: row.created_at.toISOString()
    } satisfies FriendsDailyHighlight;
  });
}

function tournamentHighlightsFromPick(
  pick: Awaited<ReturnType<typeof listConnectionsTournamentPredictions>>[number]
) {
  const name = peerName(pick.displayName, pick.username);
  const items: FriendsDailyHighlight[] = [];
  const cutoff = Date.now() - RECENT_EVENT_HOURS * 60 * 60 * 1000;
  if (new Date(pick.updatedAt).getTime() < cutoff) return items;

  if (pick.predictedChampion) {
    items.push({
      id: `tournament-champion-${pick.id}`,
      peerName: name,
      headline: `${name} picked a champion`,
      detail: pick.predictedChampion,
      fixtureKey: null,
      occurredAt: pick.updatedAt
    });
  }

  const finalists = formatTournamentFinalistsLabel(pick);
  if (finalists) {
    items.push({
      id: `tournament-final-${pick.id}`,
      peerName: name,
      headline: `${name} set a final`,
      detail: finalists,
      fixtureKey: null,
      occurredAt: pick.updatedAt
    });
  }

  const scorer = formatTournamentPlayerLabel(pick.predictedTopScorer);
  if (scorer) {
    items.push({
      id: `tournament-scorer-${pick.id}`,
      peerName: name,
      headline: `${name} picked a top scorer`,
      detail: scorer,
      fixtureKey: null,
      occurredAt: pick.updatedAt
    });
  }

  const board = formatTournamentScorerBoardLabel(pick.predictedTopScorerBoard);
  if (board) {
    items.push({
      id: `tournament-board-${pick.id}`,
      peerName: name,
      headline: `${name} filled a scorer board`,
      detail: board,
      fixtureKey: null,
      occurredAt: pick.updatedAt
    });
  }

  return items;
}

async function listRecentPeerTournamentHighlights(userId: string) {
  const picks = await listConnectionsTournamentPredictions(userId, undefined, 12);
  return picks.flatMap((pick) => tournamentHighlightsFromPick(pick));
}

async function listFallbackPeerPicks(userId: string) {
  const [fixturePicks, tournamentPicks] = await Promise.all([
    listConnectionsFixturePredictions(userId, { limit: 8 }),
    listConnectionsTournamentPredictions(userId, undefined, 6)
  ]);

  const fixtureItems: FriendsDailyHighlight[] = fixturePicks.map((pick) => {
    const name = peerName(pick.displayName, pick.username);
    const outcome =
      pick.predictedOutcome != null
        ? outcomeShort(pick.predictedOutcome)
        : pick.homeScore != null && pick.awayScore != null
          ? `${pick.homeScore}–${pick.awayScore}`
          : "Match pick";
    return {
      id: `pick-${pick.id}`,
      peerName: name,
      headline: `${name} on ${pick.fixtureLabel}`,
      detail: outcome,
      fixtureKey: pick.fixtureKey,
      occurredAt: pick.updatedAt
    };
  });

  const tournamentItems: FriendsDailyHighlight[] = tournamentPicks.flatMap((pick) => {
    const name = peerName(pick.displayName, pick.username);
    const items: FriendsDailyHighlight[] = [];
    if (pick.predictedChampion) {
      items.push({
        id: `fallback-champion-${pick.id}`,
        peerName: name,
        headline: `${name}'s champion pick`,
        detail: pick.predictedChampion,
        fixtureKey: null,
        occurredAt: pick.updatedAt
      });
    }
    const finalists = formatTournamentFinalistsLabel(pick);
    if (finalists) {
      items.push({
        id: `fallback-final-${pick.id}`,
        peerName: name,
        headline: `${name}'s final pick`,
        detail: finalists,
        fixtureKey: null,
        occurredAt: pick.updatedAt
      });
    }
    return items;
  });

  return [...fixtureItems, ...tournamentItems];
}

export async function getFriendsDailyHighlights(userId: string): Promise<FriendsDailyHighlightsPayload> {
  const peerIds = await listAcceptedPeerIds(userId);
  if (!peerIds.length) {
    return { peerCount: 0, highlights: [] };
  }

  const [events, tournamentItems] = await Promise.all([
    listRecentPeerPredictionEvents(peerIds),
    listRecentPeerTournamentHighlights(userId)
  ]);

  let highlights = dedupeHighlights(
    [...events, ...tournamentItems].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
  );

  if (highlights.length === 0) {
    highlights = dedupeHighlights(
      (await listFallbackPeerPicks(userId)).sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )
    );
  }

  return {
    peerCount: peerIds.length,
    highlights: highlights.map((item) => ({
      ...item,
      detail:
        item.detail ||
        (item.fixtureKey ? fixtureKeyToShortLabel(item.fixtureKey) : "Prediction update")
    }))
  };
}
