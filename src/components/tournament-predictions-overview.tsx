"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";
import { TOURNAMENT_PREDICTION_BLOCKS } from "@/lib/tournament-predictions/labels";
import type { TournamentPredictionRecord } from "@/lib/tournament-predictions/types";
import {
  tournamentCategoryPoints,
  tournamentCategoryResultStatus,
  tournamentCategoryValue,
  type ConnectionTournamentPredictionSummary,
  type TournamentCategory,
  type TournamentPredictionsOverview,
  type TournamentWalletSummary
} from "@/lib/tournament-predictions/overview";

export type TournamentPredictionsOverviewData = TournamentPredictionsOverview;

type TournamentTableRow = {
  key: TournamentCategory | "topScorerBoard";
  label: string;
};

const TOURNAMENT_TABLE_ROWS: TournamentTableRow[] = [
  { key: "champion", label: TOURNAMENT_PREDICTION_BLOCKS.champion },
  { key: "finalists", label: TOURNAMENT_PREDICTION_BLOCKS.finalOpponent },
  { key: "topScorer", label: TOURNAMENT_PREDICTION_BLOCKS.topScorer },
  { key: "topScorerBoard", label: TOURNAMENT_PREDICTION_BLOCKS.topScorerBoard },
  { key: "bestPlayer", label: TOURNAMENT_PREDICTION_BLOCKS.bestPlayer }
];

const POINTS_BOARD_ROWS: { key: TournamentCategory; label: string }[] = [
  { key: "champion", label: TOURNAMENT_PREDICTION_BLOCKS.champion },
  { key: "finalists", label: "Finalists" },
  { key: "topScorer", label: TOURNAMENT_PREDICTION_BLOCKS.topScorer },
  { key: "bestPlayer", label: TOURNAMENT_PREDICTION_BLOCKS.bestPlayer }
];

function resultBadge(status: string) {
  if (status === "won") return { label: "Won", className: "predictions-result--won" };
  if (status === "lost") return { label: "Lost", className: "predictions-result--lost" };
  if (status === "partial") return { label: "Partial", className: "predictions-result--partial" };
  if (status === "void") return { label: "Void", className: "predictions-result--void" };
  return { label: "Pending", className: "predictions-result--pending" };
}

function peerMatchesNameFilter(pick: ConnectionTournamentPredictionSummary, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const displayName = pick.displayName?.trim().toLowerCase() ?? "";
  const username = pick.username.trim().toLowerCase();
  return displayName.includes(term) || username.includes(term);
}

function rowVisibleForAnyone(
  row: TournamentTableRow,
  mine: TournamentPredictionRecord | null,
  friends: ConnectionTournamentPredictionSummary[]
) {
  if (tournamentCategoryValue(mine, row.key)) return true;
  return friends.some((friend) => tournamentCategoryValue(friend, row.key));
}

function categoryHasPick(record: TournamentPredictionRecord | null, category: TournamentCategory) {
  if (!record) return false;
  if (category === "champion") return Boolean(record.predictedChampion);
  if (category === "finalists") return record.predictedFinalists.length > 0;
  if (category === "topScorer") return Boolean(record.predictedTopScorer);
  return Boolean(record.predictedBestPlayer);
}

function categoryStatusCount(
  record: TournamentPredictionRecord | null,
  category: TournamentCategory,
  status: "won" | "lost" | "pending"
) {
  if (!record || !categoryHasPick(record, category)) return 0;
  const pickStatus = tournamentCategoryResultStatus(record, category);
  if (status === "won") return pickStatus === "won" || pickStatus === "partial" ? 1 : 0;
  if (status === "lost") return pickStatus === "lost" ? 1 : 0;
  return pickStatus !== "won" && pickStatus !== "partial" && pickStatus !== "lost" && pickStatus !== "void"
    ? 1
    : 0;
}

const MIN_FRIEND_COLUMNS = 3;

type FriendTableColumn = {
  key: string;
  label: string;
  userId: string | null;
  username?: string;
};

function buildFriendColumns(
  connectionsPredictions: ConnectionTournamentPredictionSummary[],
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
  friends: ConnectionTournamentPredictionSummary[],
  column: FriendTableColumn
) {
  if (!column.userId) return null;
  return friends.find((pick) => pick.userId === column.userId) ?? null;
}

function TournamentPickCell({
  record,
  row
}: {
  record: TournamentPredictionRecord | null;
  row: TournamentTableRow;
}) {
  const value = tournamentCategoryValue(record, row.key);
  if (!value) {
    return <span className="predictions-picks-placeholder">—</span>;
  }

  const status = tournamentCategoryResultStatus(record, row.key);
  const points =
    row.key === "topScorerBoard" ? 0 : tournamentCategoryPoints(record, row.key as TournamentCategory);
  const badge = resultBadge(status);

  return (
    <div className="predictions-type-lines predictions-type-lines--unified">
      <div className="predictions-type-line">
        <span className="predictions-type-line-value">{value}</span>
        {row.key !== "topScorerBoard" ? (
          <span className={`predictions-result-badge ${badge.className}`}>
            {badge.label}
            {points > 0 ? ` · +${points}` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function useTournamentPredictionsOverview({
  tournamentKey = "WC26",
  refreshToken = 0
}: {
  tournamentKey?: string;
  refreshToken?: number;
} = {}) {
  const [data, setData] = useState<TournamentPredictionsOverviewData | null>(null);
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
        const params = new URLSearchParams({ tournamentKey });
        const response = await fetch(`/api/tournament-predictions/overview?${params}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json()) as TournamentPredictionsOverviewData & { error?: string };
        if (loadGenerationRef.current !== generation) return;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load tournament overview.");
        hasLoadedDataRef.current = true;
        setData(payload);
      } catch (loadError) {
        if (loadGenerationRef.current !== generation) return;
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        if (!hasLoadedDataRef.current) setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load tournament overview.");
      } finally {
        if (loadGenerationRef.current === generation) setLoading(false);
      }
    }

    void loadOverview();
    return () => controller.abort();
  }, [tournamentKey, refreshToken]);

  return { data, loading, error };
}

export function TournamentPointsBoard({
  wallet,
  myPrediction
}: {
  wallet: TournamentWalletSummary;
  myPrediction: TournamentPredictionRecord | null;
}) {
  return (
    <section className="predictions-results-board data-card predictions-points-board">
      <header className="predictions-results-board-header">
        <h3 className="panel-help-row">
          Your points
          <HelpTooltip label="How tournament points settle" size="sm">
            Tournament picks settle when the competition awards are decided. Until then, picks show as{" "}
            <strong>Pending</strong>. Earned <strong>{wallet.pointsWon}</strong> pts so far ·{" "}
            <strong>{wallet.picksPending}</strong> picks still waiting on results.
          </HelpTooltip>
        </h3>
        <p className="predictions-wallet-balance">
          <span className="predictions-wallet-balance-value">{wallet.balance}</span>
          <span className="predictions-wallet-balance-label">points total</span>
        </p>
      </header>
      <table className="predictions-results-table predictions-results-table--compact">
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
          {POINTS_BOARD_ROWS.map(({ key, label }) => {
            const row = wallet.byCategory[key];
            return (
              <tr key={key}>
                <td className="predictions-results-label-cell">{label}</td>
                <td className="predictions-results-cell">
                  <span className="predictions-results-count">
                    {categoryStatusCount(myPrediction, key, "won")}
                  </span>
                </td>
                <td className="predictions-results-cell">
                  <span className="predictions-results-count">
                    {categoryStatusCount(myPrediction, key, "lost")}
                  </span>
                </td>
                <td className="predictions-results-cell">
                  <span className="predictions-results-count">
                    {categoryStatusCount(myPrediction, key, "pending")}
                  </span>
                </td>
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

export function TournamentPicksSection({
  data,
  onEditPick
}: {
  data: TournamentPredictionsOverviewData;
  onEditPick?: () => void;
}) {
  const [friendsNameFilter, setFriendsNameFilter] = useState("");
  const { myPrediction, connectionsPredictions } = data;

  const filteredFriends = useMemo(
    () => connectionsPredictions.filter((pick) => peerMatchesNameFilter(pick, friendsNameFilter)),
    [connectionsPredictions, friendsNameFilter]
  );

  const friendColumns = useMemo(
    () => buildFriendColumns(connectionsPredictions, friendsNameFilter),
    [connectionsPredictions, friendsNameFilter]
  );

  const visibleRows = useMemo(
    () => TOURNAMENT_TABLE_ROWS.filter((row) => rowVisibleForAnyone(row, myPrediction, filteredFriends)),
    [filteredFriends, myPrediction]
  );

  const hasAnyPicks = Boolean(myPrediction) || connectionsPredictions.length > 0;

  return (
    <section
      className="predictions-overview-card predictions-unified-picks"
      id="predictions-tournament-picks"
    >
      <header className="predictions-unified-picks-header">
        <h3 className="predictions-unified-picks-title">Yours &amp; friends&apos; tournament picks</h3>
        <div className="predictions-unified-picks-header-actions">
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
          {onEditPick ? (
            <button className="text-button predictions-overview-edit" type="button" onClick={onEditPick}>
              Edit picks
            </button>
          ) : null}
        </div>
      </header>

      {!hasAnyPicks ? (
        <p className="predictions-overview-empty">No tournament picks yet — add yours above.</p>
      ) : visibleRows.length === 0 ? (
        <p className="predictions-overview-empty">No friends match that filter.</p>
      ) : (
        <div className="predictions-picks-table-wrap">
          <table className="predictions-results-table predictions-results-table--compact predictions-picks-table">
            <thead>
              <tr>
                <th>Pick</th>
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
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key}>
                  <td className="predictions-picks-match-cell">{row.label}</td>
                  <td className="predictions-results-cell">
                    <TournamentPickCell record={myPrediction} row={row} />
                  </td>
                  {friendColumns.map((column) => (
                    <td className="predictions-results-cell" key={`${row.key}-${column.key}`}>
                      <TournamentPickCell record={friendPickForColumn(filteredFriends, column)} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasAnyPicks && filteredFriends.length === 0 && connectionsPredictions.length > 0 ? (
        <p className="predictions-overview-empty predictions-unified-filter-empty">
          No friends match that filter.
        </p>
      ) : null}
    </section>
  );
}
