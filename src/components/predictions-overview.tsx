"use client";

import { useCallback, useEffect, useState } from "react";

type PredictionPickSummary = {
  id: string;
  fixtureKey: string;
  fixtureLabel: string;
  homeScore: number;
  awayScore: number;
  resultStatus: string;
  pointsAwarded: number;
  updatedAt: string;
};

type ConnectionPredictionSummary = {
  userId: string;
  username: string;
  displayName: string;
  fixtureKey: string;
  fixtureLabel: string;
  homeScore: number;
  awayScore: number;
  resultStatus: string;
  pointsAwarded: number;
  updatedAt: string;
};

type PredictionsOverviewData = {
  wallet: {
    balance: number;
    pointsWon: number;
    pointsLost: number;
    picksWon: number;
    picksLost: number;
    picksPending: number;
  };
  myPredictions: PredictionPickSummary[];
  connectionsPredictions: ConnectionPredictionSummary[];
};

type PredictionsOverviewProps = {
  fixtureKey?: string | null;
  refreshToken?: number;
};

function resultBadge(status: string) {
  if (status === "won") return { label: "Won", className: "predictions-result--won" };
  if (status === "lost") return { label: "Lost", className: "predictions-result--lost" };
  if (status === "partial") return { label: "Partial", className: "predictions-result--partial" };
  return { label: "Pending", className: "predictions-result--pending" };
}

function PickRow({
  label,
  score,
  meta
}: {
  label: string;
  score: string;
  meta?: React.ReactNode;
}) {
  return (
    <li className="predictions-overview-pick">
      <div className="predictions-overview-pick-main">
        <span className="predictions-overview-pick-label">{label}</span>
        <strong className="predictions-overview-pick-score">{score}</strong>
      </div>
      {meta ? <div className="predictions-overview-pick-meta">{meta}</div> : null}
    </li>
  );
}

export function PredictionsOverview({ fixtureKey, refreshToken = 0 }: PredictionsOverviewProps) {
  const [data, setData] = useState<PredictionsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fixtureKey) params.set("fixtureKey", fixtureKey);
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
  }, [fixtureKey]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

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

  return (
    <div className="predictions-overview">
      <div className="predictions-overview-grid">
        <section className="predictions-overview-card">
          <header className="predictions-overview-card-header">
            <h3>My predictions</h3>
            <span className="predictions-overview-count">{myPredictions.length}</span>
          </header>
          {myPredictions.length === 0 ? (
            <p className="predictions-overview-empty">No score picks saved yet.</p>
          ) : (
            <ul className="predictions-overview-list">
              {myPredictions.map((pick) => {
                const badge = resultBadge(pick.resultStatus);
                return (
                  <PickRow
                    key={pick.id}
                    label={pick.fixtureLabel}
                    score={`${pick.homeScore}–${pick.awayScore}`}
                    meta={
                      <span className={`predictions-result-badge ${badge.className}`}>
                        {badge.label}
                        {pick.pointsAwarded > 0 ? ` · +${pick.pointsAwarded}` : ""}
                      </span>
                    }
                  />
                );
              })}
            </ul>
          )}
        </section>

        <section className="predictions-overview-card">
          <header className="predictions-overview-card-header">
            <h3>Connections&apos; predictions</h3>
            <span className="predictions-overview-count">{connectionsForMatch.length}</span>
          </header>
          {connectionsForMatch.length === 0 ? (
            <p className="predictions-overview-empty">
              {fixtureKey
                ? "No connected fans have picked this match yet."
                : "Connect with fans to see their picks here."}
            </p>
          ) : (
            <ul className="predictions-overview-list">
              {connectionsForMatch.map((pick) => (
                <PickRow
                  key={`${pick.userId}-${pick.fixtureKey}-${pick.updatedAt}`}
                  label={pick.fixtureLabel}
                  score={`${pick.homeScore}–${pick.awayScore}`}
                  meta={
                    <span className="predictions-overview-peer">
                      <strong>{pick.displayName}</strong>
                      <span className="connections-search-username">@{pick.username}</span>
                    </span>
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section className="predictions-overview-card predictions-overview-card--wallet">
          <header className="predictions-overview-card-header">
            <h3>Balance</h3>
          </header>
          <p className="predictions-wallet-balance">
            <span className="predictions-wallet-balance-value">{wallet.balance}</span>
            <span className="predictions-wallet-balance-label">points</span>
          </p>
          <dl className="predictions-wallet-stats">
            <div>
              <dt>Won</dt>
              <dd>
                {wallet.pointsWon > 0 ? `+${wallet.pointsWon} pts` : `${wallet.picksWon} picks`}
              </dd>
            </div>
            <div>
              <dt>Lost</dt>
              <dd>{wallet.picksLost > 0 ? `${wallet.picksLost} picks` : "—"}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>{wallet.picksPending}</dd>
            </div>
          </dl>
          <p className="predictions-wallet-note">Virtual points only — not cash. Settles after matches.</p>
        </section>
      </div>
    </div>
  );
}
