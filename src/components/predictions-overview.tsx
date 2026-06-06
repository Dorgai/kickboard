"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatScorerPicksSummary,
  outcomeShort,
  type FixtureOutcome,
  type ScorerPick
} from "@/lib/fixture-predictions/types";
import { PREDICTION_BLOCKS, PREDICTION_BLOCK_SHORT } from "@/lib/fixture-predictions/labels";
import { HelpTooltip } from "@/components/help-tooltip";
import { PredictionShareButtons } from "@/components/prediction-share-buttons";
import { parseFixtureKeyTeams } from "@/lib/fixtures/fixture-key";
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

type PredictionsOverviewData = {
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

type PredictionsOverviewProps = {
  fixtureKey?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  refreshToken?: number;
  onEditPick?: (fixtureKey: string) => void;
};

function resultBadge(status: string) {
  if (status === "won") return { label: "Won", className: "predictions-result--won" };
  if (status === "lost") return { label: "Lost", className: "predictions-result--lost" };
  if (status === "partial") return { label: "Partial", className: "predictions-result--partial" };
  if (status === "void") return { label: "Void", className: "predictions-result--void" };
  return { label: "Pending", className: "predictions-result--pending" };
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

function PickCard({
  title,
  pick,
  peer,
  shareDisplayName,
  onEdit
}: {
  title: string;
  pick: PredictionPickSummary;
  peer?: { displayName: string; username: string };
  shareDisplayName?: string | null;
  onEdit?: () => void;
}) {
  const lines = formatPickSummary(pick);
  const sharePayload =
    shareDisplayName !== undefined ? pickToSharePayload(pick, shareDisplayName) : null;
  return (
    <li className="predictions-overview-pick">
      <div className="predictions-overview-pick-main">
        <span className="predictions-overview-pick-label">{title}</span>
        {peer ? (
          <span className="predictions-overview-peer">
            <strong>{peer.displayName}</strong>
            <span className="connections-search-username">@{peer.username}</span>
          </span>
        ) : null}
      </div>
      {lines.length === 0 ? (
        <p className="predictions-overview-empty">No picks saved.</p>
      ) : (
        <div className="predictions-type-lines">
          {lines.map((line) => (
            <StatusLine key={line.label} {...line} />
          ))}
        </div>
      )}
      {onEdit || sharePayload ? (
        <div className="predictions-overview-pick-actions">
          {onEdit ? (
            <button className="button secondary predictions-overview-edit" type="button" onClick={onEdit}>
              Edit picks
            </button>
          ) : null}
          {sharePayload ? (
            <PredictionShareButtons className="prediction-share--compact" payload={sharePayload} />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function overviewCardMinHeight(itemCount: number) {
  if (itemCount <= 0) return "8rem";
  return `${Math.min(32, 8 + itemCount * 3.75)}rem`;
}

function peerMatchesNameFilter(
  pick: ConnectionPredictionSummary,
  query: string
) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const displayName = pick.displayName?.trim().toLowerCase() ?? "";
  const username = pick.username.trim().toLowerCase();
  return displayName.includes(term) || username.includes(term);
}

export function PredictionsOverview({
  fixtureKey,
  homeTeam,
  awayTeam,
  refreshToken = 0,
  viewerDisplayName = null,
  onEditPick
}: PredictionsOverviewProps & { viewerDisplayName?: string | null }) {
  const [data, setData] = useState<PredictionsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendsNameFilter, setFriendsNameFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fixtureKey) params.set("fixtureKey", fixtureKey);
      if (homeTeam) params.set("homeTeam", homeTeam);
      if (awayTeam) params.set("awayTeam", awayTeam);
      const response = await fetch(`/api/predictions/overview?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as PredictionsOverviewData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load overview.");
      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load overview.");
    } finally {
      setLoading(false);
    }
  }, [fixtureKey, homeTeam, awayTeam]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    setFriendsNameFilter("");
  }, [fixtureKey, homeTeam, awayTeam]);

  if (loading) {
    return <p className="inline-status">Loading your predictions summary…</p>;
  }

  if (error) {
    return <p className="inline-status">{error}</p>;
  }

  if (!data) return null;

  const { wallet, myPredictions, connectionsPredictions } = data;
  const connectionsForMatch = fixtureKey
    ? connectionsPredictions
    : connectionsPredictions.slice(0, 8);
  const filteredFriendsPicks = connectionsForMatch.filter((pick) =>
    peerMatchesNameFilter(pick, friendsNameFilter)
  );

  const categories = [
    { key: "outcome" as const, label: PREDICTION_BLOCKS.outcome },
    { key: "score" as const, label: PREDICTION_BLOCKS.score },
    { key: "scorers" as const, label: PREDICTION_BLOCKS.scorers }
  ];

  return (
    <div className="predictions-overview">
      <section className="predictions-results-board data-card">
        <header className="predictions-results-board-header">
          <h3 className="panel-help-row">
            Your points
            <HelpTooltip label="Points summary" size="sm">
              Earned <strong>{wallet.pointsWon}</strong> pts so far · <strong>{wallet.picksPending}</strong>{" "}
              picks still waiting on results
            </HelpTooltip>
          </h3>
          <p className="predictions-wallet-balance">
            <span className="predictions-wallet-balance-value">{wallet.balance}</span>
            <span className="predictions-wallet-balance-label">points total</span>
          </p>
        </header>
        <table className="predictions-results-table">
          <thead>
            <tr>
              <th>Pick</th>
              <th>Won</th>
              <th>Lost</th>
              <th>Pending</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(({ key, label }) => {
              const row = wallet.byCategory[key];
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>{row.won}</td>
                  <td>{row.lost}</td>
                  <td>{row.pending}</td>
                  <td>{row.points > 0 ? `+${row.points}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="predictions-overview-divider" aria-hidden />

      <div className="predictions-overview-grid">
        <section
          className="predictions-overview-card predictions-overview-card--yours"
          style={{ minHeight: overviewCardMinHeight(myPredictions.length) }}
        >
          <header className="predictions-overview-card-header">
            <h3>Your picks</h3>
            <span className="predictions-overview-count">{myPredictions.length}</span>
          </header>
          {myPredictions.length === 0 ? (
            <p className="predictions-overview-empty">No picks yet — choose a match above.</p>
          ) : (
            <ul className="predictions-overview-list">
              {myPredictions.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  shareDisplayName={viewerDisplayName}
                  title={pick.fixtureLabel}
                  onEdit={
                    onEditPick
                      ? () => {
                          dismissSessionCheckpoint();
                          onEditPick(pick.fixtureKey);
                        }
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section
          className="predictions-overview-card predictions-overview-card--friends"
          style={{ minHeight: overviewCardMinHeight(filteredFriendsPicks.length) }}
        >
          <header className="predictions-overview-card-header predictions-overview-card-header--friends">
            <h3>Friends&apos; picks</h3>
            {connectionsForMatch.length > 0 ? (
              <label className="predictions-overview-name-filter">
                <span className="sr-only">Filter friends by name</span>
                <input
                  className="predictions-overview-name-filter-input"
                  placeholder="Name"
                  type="search"
                  value={friendsNameFilter}
                  onChange={(event) => setFriendsNameFilter(event.target.value)}
                />
              </label>
            ) : null}
            <span className="predictions-overview-count">{filteredFriendsPicks.length}</span>
          </header>
          {connectionsForMatch.length === 0 ? (
            <p className="predictions-overview-empty">
              {fixtureKey
                ? "No friends have picked this match yet."
                : "Add friends to see their picks here."}
            </p>
          ) : filteredFriendsPicks.length === 0 ? (
            <p className="predictions-overview-empty">No friends match that name.</p>
          ) : (
            <ul className="predictions-overview-list">
              {filteredFriendsPicks.map((pick) => (
                <PickCard
                  key={`${pick.userId}-${pick.fixtureKey}-${pick.updatedAt}`}
                  pick={pick}
                  peer={{ displayName: pick.displayName, username: pick.username }}
                  title={pick.fixtureLabel}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
