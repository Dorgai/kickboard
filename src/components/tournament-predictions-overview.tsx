"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";
import { TOURNAMENT_PREDICTION_BLOCKS } from "@/lib/tournament-predictions/labels";
import type { TournamentPredictionRecord } from "@/lib/tournament-predictions/types";
import {
  tournamentCategoryPoints,
  tournamentCategoryResultStatus,
  tournamentCategoryValue,
  type ConnectionTournamentPredictionSummary,
  type TournamentCategory,
  type TournamentPredictionsOverview
} from "@/lib/tournament-predictions/overview-shared";

export type TournamentPredictionsOverviewData = TournamentPredictionsOverview;

type TournamentTableColumn = {
  key: TournamentCategory | "topScorerBoard";
  label: string;
};

const TOURNAMENT_TABLE_COLUMNS: TournamentTableColumn[] = [
  { key: "champion", label: TOURNAMENT_PREDICTION_BLOCKS.champion },
  { key: "finalists", label: TOURNAMENT_PREDICTION_BLOCKS.finalOpponent },
  { key: "topScorer", label: TOURNAMENT_PREDICTION_BLOCKS.topScorer },
  { key: "topScorerBoard", label: TOURNAMENT_PREDICTION_BLOCKS.topScorerBoard },
  { key: "bestPlayer", label: TOURNAMENT_PREDICTION_BLOCKS.bestPlayer }
];

type TournamentPersonRow = {
  key: string;
  label: string;
  username?: string;
  record: TournamentPredictionRecord | null;
  isViewer?: boolean;
};

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

function columnVisibleForAnyone(
  column: TournamentTableColumn,
  mine: TournamentPredictionRecord | null,
  friends: ConnectionTournamentPredictionSummary[]
) {
  if (tournamentCategoryValue(mine, column.key)) return true;
  return friends.some((friend) => tournamentCategoryValue(friend, column.key));
}

function TournamentPickCell({
  record,
  column
}: {
  record: TournamentPredictionRecord | null;
  column: TournamentTableColumn;
}) {
  const value = tournamentCategoryValue(record, column.key);
  if (!value) {
    return <span className="predictions-picks-placeholder">—</span>;
  }

  const status = tournamentCategoryResultStatus(record, column.key);
  const points =
    column.key === "topScorerBoard" ? 0 : tournamentCategoryPoints(record, column.key as TournamentCategory);
  const badge = resultBadge(status);

  return (
    <div className="predictions-type-lines predictions-type-lines--unified">
      <div className="predictions-type-line">
        <span className="predictions-type-line-value">{value}</span>
        {column.key !== "topScorerBoard" && status !== "pending" ? (
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

export function TournamentPicksSection({
  data,
  onEditPick
}: {
  data: TournamentPredictionsOverviewData;
  onEditPick?: () => void;
}) {
  const [friendsNameFilter, setFriendsNameFilter] = useState("");
  const mobileLayout = useNarrowViewport(720);
  const { myPrediction, connectionsPredictions } = data;

  const filteredFriends = useMemo(
    () => connectionsPredictions.filter((pick) => peerMatchesNameFilter(pick, friendsNameFilter)),
    [connectionsPredictions, friendsNameFilter]
  );

  const visibleColumns = useMemo(
    () =>
      TOURNAMENT_TABLE_COLUMNS.filter((column) =>
        columnVisibleForAnyone(column, myPrediction, filteredFriends)
      ),
    [filteredFriends, myPrediction]
  );

  const personRows = useMemo(() => {
    const rows: TournamentPersonRow[] = [
      {
        key: "you",
        label: "You",
        record: myPrediction,
        isViewer: true
      }
    ];

    const seen = new Set<string>();
    for (const friend of filteredFriends) {
      if (seen.has(friend.userId)) continue;
      seen.add(friend.userId);
      rows.push({
        key: friend.userId,
        label: friend.displayName?.trim() || friend.username,
        username: friend.username,
        record: friend
      });
    }

    return rows.sort((a, b) => {
      if (a.isViewer) return -1;
      if (b.isViewer) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [filteredFriends, myPrediction]);

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
      ) : visibleColumns.length === 0 ? (
        <p className="predictions-overview-empty">No friends match that filter.</p>
      ) : mobileLayout ? (
        <div className="predictions-picks-mobile-stack">
          {personRows.map((person) => (
            <article
              key={person.key}
              className={`predictions-picks-mobile-card${
                person.isViewer ? " predictions-picks-mobile-card--active" : ""
              }`}
            >
              <header className="predictions-picks-mobile-card-header">
                <div className="predictions-picks-mobile-peer-head">
                  <span className="predictions-picks-mobile-peer-label">{person.label}</span>
                  {person.username ? (
                    <span className="predictions-picks-col-meta">@{person.username}</span>
                  ) : null}
                </div>
              </header>
              <dl className="predictions-picks-mobile-categories">
                {visibleColumns.map((column) => (
                  <div className="predictions-picks-mobile-category" key={column.key}>
                    <dt className="predictions-picks-mobile-category-label">{column.label}</dt>
                    <dd className="predictions-picks-mobile-category-value">
                      <TournamentPickCell column={column} record={person.record} />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="predictions-picks-table-wrap">
          <table className="predictions-results-table predictions-results-table--compact predictions-picks-table predictions-picks-table--pivoted">
            <thead>
              <tr>
                <th>Fan</th>
                {visibleColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personRows.map((person) => (
                <tr
                  key={person.key}
                  className={person.isViewer ? "predictions-picks-row--active" : undefined}
                >
                  <td className="predictions-picks-match-cell">
                    <span className="predictions-picks-col-label">{person.label}</span>
                    {person.username ? (
                      <span className="predictions-picks-col-meta">@{person.username}</span>
                    ) : null}
                  </td>
                  {visibleColumns.map((column) => (
                    <td className="predictions-results-cell" key={`${person.key}-${column.key}`}>
                      <TournamentPickCell column={column} record={person.record} />
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
