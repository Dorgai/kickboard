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

function formatPickSummary(pick: PredictionPickSummary) {
  const lines: { label: string; value: string; status: string; points: number }[] = [];

  if (pick.predictedOutcome) {
    lines.push({
      label: PREDICTION_BLOCK_SHORT.outcome,
      value: outcomeShort(pick.predictedOutcome),
      status: pick.outcomeStatus,
      points: pick.outcomePointsAwarded
    });
  }
  if (pick.homeScore !== null && pick.awayScore !== null) {
    lines.push({
      label: PREDICTION_BLOCK_SHORT.score,
      value: `${pick.homeScore}–${pick.awayScore}`,
      status: pick.scoreStatus,
      points: pick.scorePointsAwarded
    });
  }
  if (pick.scorerPicks.length > 0) {
    lines.push({
      label: PREDICTION_BLOCK_SHORT.scorers,
      value: formatScorerPicksSummary(pick.scorerPicks),
      status: pick.scorersStatus,
      points: pick.scorersPointsAwarded
    });
  }

  return lines;
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

function StatusLine({
  label,
  value,
  status,
  points
}: {
  label: string;
  value: string;
  status: string;
  points: number;
}) {
  const badge = resultBadge(status);
  return (
    <div className="predictions-type-line">
      <span className="predictions-type-line-label">{label}</span>
      <span className="predictions-type-line-value">{value}</span>
      <span className={`predictions-result-badge ${badge.className}`}>
        {badge.label}
        {points > 0 ? ` · +${points}` : ""}
      </span>
    </div>
  );
}

function CompactPickLines({ pick }: { pick: PredictionPickSummary }) {
  const lines = formatPickSummary(pick);
  if (!lines.length) {
    return <p className="predictions-overview-empty predictions-overview-empty--inline">No picks</p>;
  }
  return (
    <div className="predictions-type-lines predictions-type-lines--unified">
      {lines.map((line) => (
        <StatusLine key={line.label} {...line} />
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
  friends: ConnectionPredictionSummary[];
};

const PICKS_TIME_TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" }
] as const;

type PicksTimeTabId = (typeof PICKS_TIME_TABS)[number]["id"];

type FixturePickMeta = {
  sortKey: string;
  status: FixtureOption["status"];
};

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

function sortMatchGroups(
  groups: UnifiedMatchGroup[],
  fixtureMeta: Map<string, FixturePickMeta>,
  tab: PicksTimeTabId
) {
  const direction = tab === "upcoming" ? 1 : -1;
  return [...groups].sort((a, b) => {
    const byKickoff = matchSortKey(a.mine, fixtureMeta).localeCompare(matchSortKey(b.mine, fixtureMeta));
    if (byKickoff !== 0) return direction * byKickoff;
    return b.mine.updatedAt.localeCompare(a.mine.updatedAt);
  });
}

const MIN_FRIEND_COLUMNS = 3;

type FriendTableColumn = {
  key: string;
  label: string;
  userId: string | null;
  username?: string;
};

function buildFriendColumns(
  connectionsPredictions: ConnectionPredictionSummary[],
  friendsNameFilter: string
): FriendTableColumn[] {
  const peers = new Map<string, FriendTableColumn>();

  for (const pick of connectionsPredictions) {
    if (!peerMatchesNameFilter(pick, friendsNameFilter)) continue;
    if (peers.has(pick.userId)) continue;
    peers.set(pick.userId, {
      key: pick.userId,
      userId: pick.userId,
      username: pick.username,
      label: pick.displayName?.trim() || pick.username
    });
  }

  const columns = Array.from(peers.values()).sort((a, b) => a.label.localeCompare(b.label));
  const targetCount = Math.max(MIN_FRIEND_COLUMNS, columns.length);

  while (columns.length < targetCount) {
    const index = columns.length + 1;
    columns.push({
      key: `placeholder-${index}`,
      userId: null,
      label: `Friend ${index}`
    });
  }

  return columns;
}

function friendPickForColumn(
  friends: ConnectionPredictionSummary[],
  column: FriendTableColumn
): ConnectionPredictionSummary | null {
  if (!column.userId) return null;
  return friends.find((pick) => pick.userId === column.userId) ?? null;
}

function TablePickCell({ pick, placeholder = "—" }: { pick: PredictionPickSummary | null; placeholder?: string }) {
  if (!pick) {
    return <span className="predictions-picks-placeholder">{placeholder}</span>;
  }
  return <CompactPickLines pick={pick} />;
}

export function PredictionsPicksSection({
  data,
  fixtures = [],
  activeFixtureKey = null,
  viewerDisplayName = null,
  onEditPick,
  onPickNavigate
}: {
  data: PredictionsOverviewData;
  fixtures?: FixtureOption[];
  activeFixtureKey?: string | null;
  viewerDisplayName?: string | null;
  onEditPick?: (fixtureKey: string) => void;
  onPickNavigate?: (fixtureKey: string) => void;
}) {
  const [friendsNameFilter, setFriendsNameFilter] = useState("");
  const [picksTab, setPicksTab] = useState<PicksTimeTabId>("upcoming");

  useEffect(() => {
    setFriendsNameFilter("");
  }, [activeFixtureKey]);

  const { myPredictions, connectionsPredictions } = data;

  const fixtureMeta = useMemo(() => {
    const map = new Map<string, FixturePickMeta>();
    for (const fixture of fixtures) {
      map.set(fixture.key, { sortKey: fixture.sortKey, status: fixture.status });
    }
    return map;
  }, [fixtures]);

  const matchGroups = useMemo(() => {
    const groups: UnifiedMatchGroup[] = myPredictions.map((mine) => ({
      fixtureKey: mine.fixtureKey,
      fixtureLabel: mine.fixtureLabel,
      mine,
      friends: connectionsPredictions.filter(
        (pick) =>
          pick.fixtureKey === mine.fixtureKey && peerMatchesNameFilter(pick, friendsNameFilter)
      )
    }));

    return groups;
  }, [connectionsPredictions, friendsNameFilter, myPredictions]);

  const upcomingGroups = useMemo(
    () =>
      sortMatchGroups(
        matchGroups.filter((group) => !matchIsPast(group.mine, fixtureMeta)),
        fixtureMeta,
        "upcoming"
      ),
    [fixtureMeta, matchGroups]
  );

  const pastGroups = useMemo(
    () =>
      sortMatchGroups(
        matchGroups.filter((group) => matchIsPast(group.mine, fixtureMeta)),
        fixtureMeta,
        "past"
      ),
    [fixtureMeta, matchGroups]
  );

  const visibleGroups = picksTab === "upcoming" ? upcomingGroups : pastGroups;
  const friendColumns = useMemo(
    () => buildFriendColumns(connectionsPredictions, friendsNameFilter),
    [connectionsPredictions, friendsNameFilter]
  );
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

      {myPredictions.length === 0 ? (
        <p className="predictions-overview-empty">No picks yet — choose a match above.</p>
      ) : visibleGroups.length === 0 ? (
        <p className="predictions-overview-empty">
          {picksTab === "upcoming"
            ? "No upcoming picks — switch to Past to see settled matches."
            : "No past picks yet."}
        </p>
      ) : (
        <div className="predictions-picks-table-wrap" role="tabpanel">
          <table className="predictions-results-table predictions-results-table--compact predictions-picks-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>You</th>
                {friendColumns.map((column) => (
                  <th key={column.key}>
                    <span className="predictions-picks-col-label">{column.label}</span>
                    {column.username ? (
                      <span className="predictions-picks-col-meta">@{column.username}</span>
                    ) : (
                      <span className="predictions-picks-col-meta predictions-picks-col-meta--placeholder">
                        Open slot
                      </span>
                    )}
                  </th>
                ))}
                <th className="predictions-picks-actions-head"> </th>
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((group) => {
                const isActive = activeFixtureKey === group.fixtureKey;
                const sharePayload = pickToSharePayload(group.mine, viewerDisplayName);
                return (
                  <tr
                    key={group.fixtureKey}
                    className={isActive ? "predictions-picks-row--active" : undefined}
                  >
                    <td className="predictions-picks-match-cell">
                      <button
                        className="predictions-picks-match-link"
                        type="button"
                        onClick={() => onPickNavigate?.(group.fixtureKey)}
                      >
                        {group.fixtureLabel}
                      </button>
                    </td>
                    <td className="predictions-results-cell">
                      <TablePickCell pick={group.mine} />
                    </td>
                    {friendColumns.map((column) => (
                      <td className="predictions-results-cell" key={`${group.fixtureKey}-${column.key}`}>
                        <TablePickCell pick={friendPickForColumn(group.friends, column)} />
                      </td>
                    ))}
                    <td className="predictions-picks-actions-cell">
                      <PredictionShareButtons
                        className="prediction-share--compact"
                        payload={sharePayload}
                      />
                      {onEditPick ? (
                        <button
                          className="text-button predictions-overview-edit"
                          type="button"
                          onClick={() => {
                            dismissSessionCheckpoint();
                            onEditPick(group.fixtureKey);
                          }}
                        >
                          Edit
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {myPredictions.length > 0 && friendPickCount === 0 && connectionsPredictions.length > 0 ? (
        <p className="predictions-overview-empty predictions-unified-filter-empty">
          No friends match that filter on your {picksTab} matches.
        </p>
      ) : null}
    </section>
  );
}
