"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  formatScorerPicksSummary,
  outcomeShort,
  type FixtureOutcome,
  type ScorerPick
} from "@/lib/fixture-predictions/types";
import { PREDICTION_BLOCK_SHORT } from "@/lib/fixture-predictions/labels";
import { HelpTooltip } from "@/components/help-tooltip";
import { PredictionShareButtons } from "@/components/prediction-share-buttons";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { parseFixtureKeyTeams, type FixtureOption } from "@/lib/fixtures/fixture-key";
import { isFixturePredictionLocked } from "@/lib/fixtures/prediction-window";
import type { PredictionSharePayload } from "@/lib/predictions/share";
import { dismissSessionCheckpoint } from "@/lib/session-checkpoint/storage";

type CategoryStats = {
  won: number;
  lost: number;
  pending: number;
  points: number;
};

type PredictionPickSummary = {
  id: string;
  fixtureKey: string;
  fixtureLabel: string;
  predictedOutcome: FixtureOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: ScorerPick[];
  outcomeStatus: string;
  scoreStatus: string;
  scorersStatus: string;
  outcomePointsAwarded: number;
  scorePointsAwarded: number;
  scorersPointsAwarded: number;
  updatedAt: string;
};

type ConnectionPredictionSummary = PredictionPickSummary & {
  userId: string;
  username: string;
  displayName: string;
};

export type PredictionsOverviewData = {
  wallet: {
    balance: number;
    pointsWon: number;
    picksWon: number;
    picksLost: number;
    picksPending: number;
    byCategory: {
      outcome: CategoryStats;
      score: CategoryStats;
      scorers: CategoryStats;
    };
  };
  myPredictions: PredictionPickSummary[];
  connectionsPredictions: ConnectionPredictionSummary[];
};

type UsePredictionsOverviewOptions = {
  fixtureKey?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  refreshToken?: number;
};

type PredictionCategory = "outcome" | "score" | "scorers";

function resultBadge(status: string) {
  if (status === "won") return { label: "Won", className: "predictions-result--won" };
  if (status === "lost") return { label: "Lost", className: "predictions-result--lost" };
  if (status === "partial") return { label: "Partial", className: "predictions-result--partial" };
  if (status === "void") return { label: "Void", className: "predictions-result--void" };
  return { label: "Pending", className: "predictions-result--pending" };
}

function pickHasCategory(pick: PredictionPickSummary, category: PredictionCategory) {
  if (category === "outcome") return pick.predictedOutcome !== null;
  if (category === "score") return pick.homeScore !== null && pick.awayScore !== null;
  return pick.scorerPicks.length > 0;
}

function categoryStatus(pick: PredictionPickSummary, category: PredictionCategory) {
  if (category === "outcome") return pick.outcomeStatus;
  if (category === "score") return pick.scoreStatus;
  return pick.scorersStatus;
}

function shortFixtureName(pick: PredictionPickSummary) {
  const { homeTeam, awayTeam } = parseFixtureKeyTeams(pick.fixtureKey);
  if (homeTeam !== "Home" && awayTeam !== "Away") {
    const abbrev = (name: string) => (name.length > 8 ? `${name.slice(0, 7)}…` : name);
    return `${abbrev(homeTeam)}–${abbrev(awayTeam)}`;
  }
  const base = pick.fixtureLabel.split(" — ")[0] ?? pick.fixtureLabel;
  return base.length > 16 ? `${base.slice(0, 14)}…` : base;
}

function miniPickLabel(pick: PredictionPickSummary, category: PredictionCategory) {
  const fixture = shortFixtureName(pick);
  if (category === "outcome" && pick.predictedOutcome) {
    return `${fixture} · ${outcomeShort(pick.predictedOutcome)}`;
  }
  if (category === "score" && pick.homeScore !== null && pick.awayScore !== null) {
    return `${fixture} · ${pick.homeScore}–${pick.awayScore}`;
  }
  if (category === "scorers" && pick.scorerPicks.length > 0) {
    const scorers = formatScorerPicksSummary(pick.scorerPicks);
    const trimmed = scorers.length > 14 ? `${scorers.slice(0, 12)}…` : scorers;
    return `${fixture} · ${trimmed}`;
  }
  return fixture;
}

function picksForCategoryStatus(
  predictions: PredictionPickSummary[],
  category: PredictionCategory,
  status: "won" | "lost" | "pending"
) {
  return predictions.filter((pick) => {
    if (!pickHasCategory(pick, category)) return false;
    const pickStatus = categoryStatus(pick, category);
    if (status === "won") return pickStatus === "won" || pickStatus === "partial";
    if (status === "lost") return pickStatus === "lost";
    return pickStatus !== "won" && pickStatus !== "partial" && pickStatus !== "lost" && pickStatus !== "void";
  });
}

const PICK_CATEGORY_ROWS: { category: PredictionCategory; label: string }[] = [
  { category: "outcome", label: PREDICTION_BLOCK_SHORT.outcome },
  { category: "score", label: PREDICTION_BLOCK_SHORT.score },
  { category: "scorers", label: PREDICTION_BLOCK_SHORT.scorers }
];

function pickCategoryValue(pick: PredictionPickSummary | null, category: PredictionCategory) {
  if (!pick) return null;
  if (category === "outcome" && pick.predictedOutcome) {
    return outcomeShort(pick.predictedOutcome);
  }
  if (category === "score" && pick.homeScore !== null && pick.awayScore !== null) {
    return `${pick.homeScore}–${pick.awayScore}`;
  }
  if (category === "scorers" && pick.scorerPicks.length > 0) {
    return formatScorerPicksSummary(pick.scorerPicks);
  }
  return null;
}

function pickCategoryPoints(pick: PredictionPickSummary, category: PredictionCategory) {
  if (category === "outcome") return pick.outcomePointsAwarded;
  if (category === "score") return pick.scorePointsAwarded;
  return pick.scorersPointsAwarded;
}

function pickToSharePayload(
  pick: PredictionPickSummary,
  displayName: string | null
): PredictionSharePayload {
  const { homeTeam, awayTeam } = parseFixtureKeyTeams(pick.fixtureKey);
  return {
    v: 1,
    fixtureKey: pick.fixtureKey,
    fixtureLabel: pick.fixtureLabel,
    homeTeam,
    awayTeam,
    predictedOutcome: pick.predictedOutcome,
    homeScore: pick.homeScore,
    awayScore: pick.awayScore,
    scorerPicks: pick.scorerPicks,
    displayName
  };
}

function PickCategoryLine({
  pick,
  category,
  label
}: {
  pick: PredictionPickSummary | null;
  category: PredictionCategory;
  label: string;
}) {
  const hasData = Boolean(pick && pickHasCategory(pick, category));
  const value = pickCategoryValue(pick, category);
  const status = pick ? categoryStatus(pick, category) : "pending";
  const badge = resultBadge(status);

  return (
    <div className="predictions-type-line">
      <span className="predictions-type-line-label">{label}</span>
      <span className="predictions-type-line-value">
        {hasData && value ? value : <span className="predictions-picks-placeholder">—</span>}
      </span>
      {hasData ? (
        <span className={`predictions-result-badge ${badge.className}`}>
          {badge.label}
          {pick ? (pickCategoryPoints(pick, category) > 0 ? ` · +${pickCategoryPoints(pick, category)}` : "") : null}
        </span>
      ) : null}
    </div>
  );
}

function CompactPickLines({ pick }: { pick: PredictionPickSummary | null }) {
  return (
    <div className="predictions-type-lines predictions-type-lines--unified">
      {PICK_CATEGORY_ROWS.map((row) => (
        <PickCategoryLine key={row.category} category={row.category} label={row.label} pick={pick} />
      ))}
    </div>
  );
}

function PointsStatCell({
  count,
  picks,
  category,
  onPickClick
}: {
  count: number;
  picks: PredictionPickSummary[];
  category: PredictionCategory;
  onPickClick?: (fixtureKey: string) => void;
}) {
  return (
    <td className="predictions-results-cell">
      <span className="predictions-results-count">{count}</span>
      {picks.length > 0 ? (
        <div className="predictions-results-mini">
          {picks.map((pick) => (
            <button
              key={`${category}-${pick.id}-${pick.fixtureKey}`}
              className="predictions-results-mini-link"
              type="button"
              onClick={() => onPickClick?.(pick.fixtureKey)}
            >
              {miniPickLabel(pick, category)}
            </button>
          ))}
        </div>
      ) : null}
    </td>
  );
}

function peerMatchesNameFilter(pick: ConnectionPredictionSummary, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const displayName = pick.displayName?.trim().toLowerCase() ?? "";
  const username = pick.username.trim().toLowerCase();
  return displayName.includes(term) || username.includes(term);
}

export function usePredictionsOverview({
  fixtureKey,
  homeTeam,
  awayTeam,
  refreshToken = 0
}: UsePredictionsOverviewOptions) {
  const [data, setData] = useState<PredictionsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const hasLoadedDataRef = useRef(false);

  useEffect(() => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    const controller = new AbortController();
    const showInitialSpinner = !hasLoadedDataRef.current;

    setLoading(showInitialSpinner);
    setError(null);

    async function loadOverview() {
      try {
        const params = new URLSearchParams();
        if (fixtureKey) params.set("fixtureKey", fixtureKey);
        if (homeTeam) params.set("homeTeam", homeTeam);
        if (awayTeam) params.set("awayTeam", awayTeam);
        const response = await fetch(`/api/predictions/overview?${params}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json()) as PredictionsOverviewData & { error?: string };
        if (loadGenerationRef.current !== generation) return;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load overview.");
        hasLoadedDataRef.current = true;
        setData(payload);
      } catch (loadError) {
        if (loadGenerationRef.current !== generation) return;
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        if (!hasLoadedDataRef.current) setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load overview.");
      } finally {
        if (loadGenerationRef.current === generation) setLoading(false);
      }
    }

    void loadOverview();
    return () => controller.abort();
  }, [fixtureKey, homeTeam, awayTeam, refreshToken]);

  return { data, loading, error };
}

export function PredictionsPointsBoard({
  wallet,
  myPredictions = [],
  onPickClick
}: {
  wallet: PredictionsOverviewData["wallet"];
  myPredictions?: PredictionPickSummary[];
  onPickClick?: (fixtureKey: string) => void;
}) {
  const categories = [
    { key: "outcome" as const, label: PREDICTION_BLOCK_SHORT.outcome },
    { key: "score" as const, label: PREDICTION_BLOCK_SHORT.score },
    { key: "scorers" as const, label: PREDICTION_BLOCK_SHORT.scorers }
  ];

  const maxMiniPickLines = useMemo(() => {
    let max = 0;
    for (const { key } of categories) {
      max = Math.max(
        max,
        picksForCategoryStatus(myPredictions, key, "won").length,
        picksForCategoryStatus(myPredictions, key, "lost").length,
        picksForCategoryStatus(myPredictions, key, "pending").length
      );
    }
    return max;
  }, [myPredictions]);

  return (
    <section className="predictions-results-board data-card predictions-points-board">
      <header className="predictions-results-board-header">
        <h3 className="panel-help-row">
          Your points
          <HelpTooltip label="How points settle" size="sm">
            Points update after each match finishes. Until then, picks show as <strong>Pending</strong>.
            Earned <strong>{wallet.pointsWon}</strong> pts so far · <strong>{wallet.picksPending}</strong>{" "}
            picks still waiting on results.
          </HelpTooltip>
        </h3>
        <p className="predictions-wallet-balance">
          <span className="predictions-wallet-balance-value">{wallet.balance}</span>
          <span className="predictions-wallet-balance-label">points total</span>
        </p>
      </header>
      <table
        className="predictions-results-table predictions-results-table--compact"
        style={{ "--points-mini-lines": maxMiniPickLines } as CSSProperties}
      >
        <thead>
          <tr>
            <th>Pick</th>
            <th>Won</th>
            <th>Lost</th>
            <th>Pnd</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(({ key, label }) => {
            const row = wallet.byCategory[key];
            return (
              <tr key={key}>
                <td className="predictions-results-label-cell">{label}</td>
                <PointsStatCell
                  category={key}
                  count={row.won}
                  picks={picksForCategoryStatus(myPredictions, key, "won")}
                  onPickClick={onPickClick}
                />
                <PointsStatCell
                  category={key}
                  count={row.lost}
                  picks={picksForCategoryStatus(myPredictions, key, "lost")}
                  onPickClick={onPickClick}
                />
                <PointsStatCell
                  category={key}
                  count={row.pending}
                  picks={picksForCategoryStatus(myPredictions, key, "pending")}
                  onPickClick={onPickClick}
                />
                <td className="predictions-results-cell predictions-results-cell--points">
                  <span className="predictions-results-count">
                    {row.points > 0 ? `+${row.points}` : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

type UnifiedMatchGroup = {
  fixtureKey: string;
  fixtureLabel: string;
  mine: PredictionPickSummary;
  hasMine: boolean;
  friends: ConnectionPredictionSummary[];
};

type PickParticipant = {
  key: string;
  label: string;
  username?: string;
  pick: PredictionPickSummary;
  isMine: boolean;
};

type FriendCorrectnessRow = {
  userId: string;
  label: string;
  username: string | null;
  isMine: boolean;
  won: number;
  lost: number;
  pending: number;
  points: number;
};

const PICKS_TIME_TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" }
] as const;

type PicksTimeTabId = (typeof PICKS_TIME_TABS)[number]["id"];

type FixturePickMeta = {
  sortKey: string;
  status: FixtureOption["status"];
  date: string | null;
};

function fixturePickIsLocked(fixtureKey: string, fixtureMeta: Map<string, FixturePickMeta>) {
  const meta = fixtureMeta.get(fixtureKey);
  if (!meta) return false;
  return isFixturePredictionLocked(meta);
}

function pickCategoriesSettled(pick: PredictionPickSummary) {
  const statuses: string[] = [];
  if (pick.predictedOutcome) statuses.push(pick.outcomeStatus);
  if (pick.homeScore !== null && pick.awayScore !== null) statuses.push(pick.scoreStatus);
  if (pick.scorerPicks.length > 0) statuses.push(pick.scorersStatus);
  return statuses.some((status) => status !== "pending");
}

function matchIsPast(pick: PredictionPickSummary, fixtureMeta: Map<string, FixturePickMeta>) {
  const meta = fixtureMeta.get(pick.fixtureKey);
  if (meta?.status === "finished") return true;
  if (meta?.status === "live" || meta?.status === "upcoming") return false;
  return pickCategoriesSettled(pick);
}

function matchSortKey(pick: PredictionPickSummary, fixtureMeta: Map<string, FixturePickMeta>) {
  return fixtureMeta.get(pick.fixtureKey)?.sortKey ?? pick.updatedAt;
}

function representativePick(group: UnifiedMatchGroup) {
  return group.hasMine ? group.mine : (group.friends[0] ?? group.mine);
}

function groupIsPast(group: UnifiedMatchGroup, fixtureMeta: Map<string, FixturePickMeta>) {
  return matchIsPast(representativePick(group), fixtureMeta);
}

function groupSortKey(group: UnifiedMatchGroup, fixtureMeta: Map<string, FixturePickMeta>) {
  return matchSortKey(representativePick(group), fixtureMeta);
}

function groupUpdatedAt(group: UnifiedMatchGroup) {
  return representativePick(group).updatedAt;
}

function sortMatchGroups(
  groups: UnifiedMatchGroup[],
  fixtureMeta: Map<string, FixturePickMeta>,
  tab: PicksTimeTabId
) {
  const direction = tab === "upcoming" ? 1 : -1;
  return [...groups].sort((a, b) => {
    const byKickoff = groupSortKey(a, fixtureMeta).localeCompare(groupSortKey(b, fixtureMeta));
    if (byKickoff !== 0) return direction * byKickoff;
    return groupUpdatedAt(b).localeCompare(groupUpdatedAt(a));
  });
}

function createEmptyPickSummary(fixtureKey: string, fixtureLabel: string): PredictionPickSummary {
  return {
    id: "",
    fixtureKey,
    fixtureLabel,
    predictedOutcome: null,
    homeScore: null,
    awayScore: null,
    scorerPicks: [],
    outcomeStatus: "pending",
    scoreStatus: "pending",
    scorersStatus: "pending",
    outcomePointsAwarded: 0,
    scorePointsAwarded: 0,
    scorersPointsAwarded: 0,
    updatedAt: ""
  };
}

function TablePickCell({ pick }: { pick: PredictionPickSummary | null }) {
  return <CompactPickLines pick={pick} />;
}

function participantsForGroup(group: UnifiedMatchGroup): PickParticipant[] {
  const participants: PickParticipant[] = [];
  if (group.hasMine) {
    participants.push({
      key: "you",
      label: "You",
      pick: group.mine,
      isMine: true
    });
  }

  for (const friend of group.friends) {
    participants.push({
      key: friend.userId,
      label: friend.displayName?.trim() || friend.username,
      username: friend.username,
      pick: friend,
      isMine: false
    });
  }

  return participants;
}

function aggregateCategorySummary(participants: PickParticipant[], category: PredictionCategory) {
  const counts = new Map<string, number>();
  for (const participant of participants) {
    const value = pickCategoryValue(participant.pick, category);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  if (counts.size === 0) return "No picks";

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([value, count]) => (count > 1 ? `${value} ×${count}` : value))
    .join(" · ");
}

function statusCounts(participants: PickParticipant[]) {
  let won = 0;
  let lost = 0;
  let pending = 0;

  for (const participant of participants) {
    const pick = participant.pick;
    const statuses = [
      pick.predictedOutcome ? pick.outcomeStatus : null,
      pick.homeScore !== null && pick.awayScore !== null ? pick.scoreStatus : null,
      pick.scorerPicks.length > 0 ? pick.scorersStatus : null
    ].filter(Boolean) as string[];

    for (const status of statuses) {
      if (status === "won" || status === "partial") won += 1;
      else if (status === "lost") lost += 1;
      else if (status !== "void") pending += 1;
    }
  }

  return { won, lost, pending };
}

function addPickCorrectness(row: FriendCorrectnessRow, pick: PredictionPickSummary) {
  const entries = [
    pick.predictedOutcome
      ? { status: pick.outcomeStatus, points: pick.outcomePointsAwarded }
      : null,
    pick.homeScore !== null && pick.awayScore !== null
      ? { status: pick.scoreStatus, points: pick.scorePointsAwarded }
      : null,
    pick.scorerPicks.length > 0
      ? { status: pick.scorersStatus, points: pick.scorersPointsAwarded }
      : null
  ].filter(Boolean) as { status: string; points: number }[];

  for (const entry of entries) {
    if (entry.status === "won" || entry.status === "partial") {
      row.won += 1;
      row.points += entry.points;
    } else if (entry.status === "lost") {
      row.lost += 1;
    } else if (entry.status !== "void") {
      row.pending += 1;
    }
  }
}

function buildCorrectnessRows(
  myPredictions: PredictionPickSummary[],
  friendPredictions: ConnectionPredictionSummary[]
) {
  const byFriend = new Map<string, FriendCorrectnessRow>();

  if (myPredictions.length > 0) {
    const me: FriendCorrectnessRow = {
      userId: "you",
      label: "You",
      username: null,
      isMine: true,
      won: 0,
      lost: 0,
      pending: 0,
      points: 0
    };
    for (const pick of myPredictions) {
      addPickCorrectness(me, pick);
    }
    byFriend.set(me.userId, me);
  }

  for (const pick of friendPredictions) {
    let row = byFriend.get(pick.userId);
    if (!row) {
      row = {
        userId: pick.userId,
        label: pick.displayName?.trim() || pick.username,
        username: pick.username,
        isMine: false,
        won: 0,
        lost: 0,
        pending: 0,
        points: 0
      };
      byFriend.set(pick.userId, row);
    }
    addPickCorrectness(row, pick);
  }

  return Array.from(byFriend.values()).sort(
    (a, b) =>
      Number(b.isMine) - Number(a.isMine) ||
      b.points - a.points ||
      b.won - a.won ||
      a.label.localeCompare(b.label)
  );
}

function accuracyLabel(row: FriendCorrectnessRow) {
  const decided = row.won + row.lost;
  if (decided === 0) return "—";
  return `${Math.round((row.won / decided) * 100)}%`;
}

function FriendsCorrectnessSummary({ rows }: { rows: FriendCorrectnessRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="predictions-friends-correctness">
      <div className="predictions-friends-correctness-header">
        <h4>Prediction correctness</h4>
        <span>Aggregate by pick category</span>
      </div>
      <div className="predictions-friends-correctness-table-wrap">
        <table className="predictions-results-table predictions-friends-correctness-table">
          <thead>
            <tr>
              <th>Friend</th>
              <th>Won</th>
              <th>Lost</th>
              <th>Pending</th>
              <th>Accuracy</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <td>
                  <span className="predictions-picks-col-label">{row.label}</span>
                  {row.username ? (
                    <span className="predictions-picks-col-meta">@{row.username}</span>
                  ) : null}
                </td>
                <td><span className="predictions-result-badge predictions-result--won">{row.won}</span></td>
                <td><span className="predictions-result-badge predictions-result--lost">{row.lost}</span></td>
                <td><span className="predictions-result-badge predictions-result--pending">{row.pending}</span></td>
                <td>{accuracyLabel(row)}</td>
                <td><strong>{row.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AggregateMatchCard({
  group,
  fixtureMeta,
  activeFixtureKey,
  viewerDisplayName,
  onEditPick,
  showingPlaceholderRow
}: {
  group: UnifiedMatchGroup;
  fixtureMeta: Map<string, FixturePickMeta>;
  activeFixtureKey: string | null;
  viewerDisplayName: string | null;
  onEditPick?: (fixtureKey: string) => void;
  showingPlaceholderRow: boolean;
}) {
  const isActive = activeFixtureKey === group.fixtureKey;
  const sharePayload = group.hasMine ? pickToSharePayload(group.mine, viewerDisplayName) : null;
  const pickLocked = fixturePickIsLocked(group.fixtureKey, fixtureMeta);
  const participants = participantsForGroup(group);
  const counts = statusCounts(participants);
  const friendCount = group.friends.length;
  const participantLabel =
    participants.length === 1 ? "1 pick" : `${participants.length} picks`;
  const detailCount = [
    group.hasMine ? "you" : null,
    friendCount > 0 ? `${friendCount} friend${friendCount === 1 ? "" : "s"}` : null
  ]
    .filter(Boolean)
    .join(" + ");

  return (
    <details
      className={`predictions-picks-aggregate-card${isActive ? " predictions-picks-aggregate-card--active" : ""}${
        showingPlaceholderRow ? " predictions-picks-aggregate-card--placeholder" : ""
      }`}
      open={isActive}
    >
      <summary className="predictions-picks-aggregate-summary">
        <span className="predictions-picks-aggregate-match">
          <span className="predictions-picks-match-label">{group.fixtureLabel}</span>
          <span className="predictions-picks-aggregate-meta">
            {participantLabel}
            {detailCount ? ` · ${detailCount}` : ""}
          </span>
        </span>
        <span className="predictions-picks-aggregate-grid">
          {PICK_CATEGORY_ROWS.map((row) => (
            <span className="predictions-picks-aggregate-stat" key={row.category}>
              <span className="predictions-picks-aggregate-label">{row.label}</span>
              <span className="predictions-picks-aggregate-value">
                {aggregateCategorySummary(participants, row.category)}
              </span>
            </span>
          ))}
        </span>
        <span className="predictions-picks-aggregate-status">
          {counts.won > 0 ? <span className="predictions-result-badge predictions-result--won">{counts.won} won</span> : null}
          {counts.lost > 0 ? <span className="predictions-result-badge predictions-result--lost">{counts.lost} lost</span> : null}
          {counts.pending > 0 ? (
            <span className="predictions-result-badge predictions-result--pending">{counts.pending} pending</span>
          ) : null}
        </span>
        <span className="predictions-picks-aggregate-toggle">Details</span>
      </summary>

      <div className="predictions-picks-aggregate-details">
        <div className="predictions-picks-aggregate-actions">
          {sharePayload ? (
            <PredictionShareButtons className="prediction-share--compact" payload={sharePayload} />
          ) : null}
          {onEditPick && !pickLocked ? (
            <button
              className="text-button predictions-overview-edit"
              type="button"
              onClick={() => {
                dismissSessionCheckpoint();
                onEditPick(group.fixtureKey);
              }}
            >
              {group.hasMine ? "Edit your pick" : "Add your pick"}
            </button>
          ) : null}
        </div>

        <div className="predictions-picks-detail-list">
          {participants.length > 0 ? (
            participants.map((participant) => (
              <div
                className={`predictions-picks-mobile-peer${participant.isMine ? " predictions-picks-mobile-peer--you" : ""}`}
                key={participant.key}
              >
                <div className="predictions-picks-mobile-peer-head">
                  <span className="predictions-picks-mobile-peer-label">{participant.label}</span>
                  {participant.username ? (
                    <span className="predictions-picks-col-meta">@{participant.username}</span>
                  ) : null}
                </div>
                <TablePickCell pick={participant.pick} />
              </div>
            ))
          ) : (
            <div className="predictions-picks-mobile-peer predictions-picks-mobile-peer--you">
              <div className="predictions-picks-mobile-peer-head">
                <span className="predictions-picks-mobile-peer-label">You</span>
              </div>
              <TablePickCell pick={group.mine} />
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

export function PredictionsPicksSection({
  data,
  fixtures = [],
  activeFixtureKey = null,
  viewerDisplayName = null,
  onEditPick
}: {
  data: PredictionsOverviewData;
  fixtures?: FixtureOption[];
  activeFixtureKey?: string | null;
  viewerDisplayName?: string | null;
  onEditPick?: (fixtureKey: string) => void;
}) {
  const [friendsNameFilter, setFriendsNameFilter] = useState("");
  const [picksTab, setPicksTab] = useState<PicksTimeTabId>("upcoming");

  useEffect(() => {
    setFriendsNameFilter("");
  }, [activeFixtureKey]);

  const { myPredictions, connectionsPredictions } = data;
  const filteredConnectionsPredictions = useMemo(
    () => connectionsPredictions.filter((pick) => peerMatchesNameFilter(pick, friendsNameFilter)),
    [connectionsPredictions, friendsNameFilter]
  );
  const friendCorrectnessRows = useMemo(
    () => buildCorrectnessRows(myPredictions, filteredConnectionsPredictions),
    [filteredConnectionsPredictions, myPredictions]
  );

  const fixtureMeta = useMemo(() => {
    const map = new Map<string, FixturePickMeta>();
    for (const fixture of fixtures) {
      map.set(fixture.key, {
        sortKey: fixture.sortKey,
        status: fixture.status,
        date: fixture.date
      });
    }
    return map;
  }, [fixtures]);

  const matchGroups = useMemo(() => {
    const groups = new Map<string, UnifiedMatchGroup>();

    for (const mine of myPredictions) {
      groups.set(mine.fixtureKey, {
        fixtureKey: mine.fixtureKey,
        fixtureLabel: mine.fixtureLabel,
        mine,
        hasMine: true,
        friends: []
      });
    }

    for (const friend of filteredConnectionsPredictions) {
      const existing = groups.get(friend.fixtureKey);
      if (existing) {
        existing.friends.push(friend);
        continue;
      }

      groups.set(friend.fixtureKey, {
        fixtureKey: friend.fixtureKey,
        fixtureLabel: friend.fixtureLabel,
        mine: createEmptyPickSummary(friend.fixtureKey, friend.fixtureLabel),
        hasMine: false,
        friends: [friend]
      });
    }

    return Array.from(groups.values());
  }, [filteredConnectionsPredictions, myPredictions]);

  const upcomingGroups = useMemo(
    () =>
      sortMatchGroups(
        matchGroups.filter((group) => !groupIsPast(group, fixtureMeta)),
        fixtureMeta,
        "upcoming"
      ),
    [fixtureMeta, matchGroups]
  );

  const pastGroups = useMemo(
    () =>
      sortMatchGroups(
        matchGroups.filter((group) => groupIsPast(group, fixtureMeta)),
        fixtureMeta,
        "past"
      ),
    [fixtureMeta, matchGroups]
  );

  const visibleGroups = picksTab === "upcoming" ? upcomingGroups : pastGroups;
  const displayGroups = useMemo((): UnifiedMatchGroup[] => {
    if (visibleGroups.length > 0) return visibleGroups;

    const activeFixture = activeFixtureKey
      ? fixtures.find((fixture) => fixture.key === activeFixtureKey)
      : null;
    const fixtureKey = activeFixture?.key ?? `empty-${picksTab}`;
    const fixtureLabel = activeFixture
      ? `${activeFixture.homeTeam} vs ${activeFixture.awayTeam}`
      : picksTab === "upcoming"
        ? "Upcoming matches"
        : "Past matches";

    return [
      {
        fixtureKey,
        fixtureLabel,
        mine: createEmptyPickSummary(fixtureKey, fixtureLabel),
        hasMine: false,
        friends: []
      }
    ];
  }, [activeFixtureKey, fixtures, picksTab, visibleGroups]);
  const showingPlaceholderRow = visibleGroups.length === 0;
  const friendPickCount = visibleGroups.reduce((sum, group) => sum + group.friends.length, 0);

  return (
    <section
      className="predictions-overview-card predictions-unified-picks"
      id="predictions-match-picks"
    >
      <header className="predictions-unified-picks-header">
        <h3 className="predictions-unified-picks-title">Yours &amp; friends&apos; picks</h3>
        {connectionsPredictions.length > 0 ? (
          <label className="predictions-overview-name-filter predictions-unified-picks-filter">
            <span className="sr-only">Filter friends by name</span>
            <input
              className="predictions-overview-name-filter-input predictions-unified-picks-filter-input"
              placeholder="Filter friends"
              type="search"
              value={friendsNameFilter}
              onChange={(event) => setFriendsNameFilter(event.target.value)}
            />
          </label>
        ) : null}
      </header>

      <div className="kickboard-tab-rail predictions-unified-picks-tabs-rail">
        <FeedTabBar
          ariaLabel="Upcoming or past picks"
          className="predictions-unified-picks-tabs kickboard-tab-bar"
          tabs={PICKS_TIME_TABS.map((tab) => ({
            id: tab.id,
            label: `${tab.label} (${tab.id === "upcoming" ? upcomingGroups.length : pastGroups.length})`
          }))}
          value={picksTab}
          onChange={(id) => setPicksTab(id as PicksTimeTabId)}
        />
      </div>

      {myPredictions.length === 0 && connectionsPredictions.length === 0 ? (
        <p className="predictions-overview-hint predictions-overview-empty--inline">
          No picks yet — choose a match above.
        </p>
      ) : null}
      {myPredictions.length === 0 && connectionsPredictions.length > 0 ? (
        <p className="predictions-overview-hint predictions-overview-empty--inline">
          No picks from you yet — friends&apos; picks are shown below.
        </p>
      ) : null}

      <FriendsCorrectnessSummary rows={friendCorrectnessRows} />

      <div className="predictions-picks-aggregate-list" role="tabpanel">
        {displayGroups.map((group) => (
          <AggregateMatchCard
            activeFixtureKey={activeFixtureKey}
            fixtureMeta={fixtureMeta}
            group={group}
            key={group.fixtureKey}
            showingPlaceholderRow={showingPlaceholderRow}
            viewerDisplayName={viewerDisplayName}
            onEditPick={onEditPick}
          />
        ))}
      </div>

      {showingPlaceholderRow && myPredictions.length > 0 ? (
        <p className="predictions-overview-hint predictions-unified-filter-empty">
          {picksTab === "upcoming"
            ? "No upcoming picks on this tab — switch to Past to see settled matches."
            : "No past picks yet."}
        </p>
      ) : null}

      {myPredictions.length > 0 && friendPickCount === 0 && connectionsPredictions.length > 0 ? (
        <p className="predictions-overview-empty predictions-unified-filter-empty">
          No friends match that filter on your {picksTab} matches.
        </p>
      ) : null}
    </section>
  );
}
