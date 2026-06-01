"use client";

import { useState } from "react";

type FeedStatus = {
  generatedAt: string;
  feeds: {
    historical: {
      connected: boolean;
      name: string;
      mode: string;
      endpoint: string;
    };
    realtime: {
      connected: boolean;
      name: string;
      keyConfigured: boolean;
      workerEnabled: boolean;
      message: string;
    };
    storage: {
      postgres: boolean;
      redis: boolean;
    };
  };
};

type HistoricalStatus = {
  connected: boolean;
  worldCupCompetitionCount?: number;
  worldCups?: Array<{
    name: string;
    season: string;
    gender: string;
  }>;
  error?: string;
};

export function FeedStatusPanel() {
  const [status, setStatus] = useState<FeedStatus | null>(null);
  const [historical, setHistorical] = useState<HistoricalStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkFeeds() {
    setLoading(true);
    try {
      const [statusResponse, historicalResponse] = await Promise.all([
        fetch("/api/feeds/status", { cache: "no-store" }),
        fetch("/api/feeds/historical", { cache: "no-store" })
      ]);

      setStatus((await statusResponse.json()) as FeedStatus);
      setHistorical((await historicalResponse.json()) as HistoricalStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section feed-status-section" id="feeds">
      <div className="section-heading">
        <p className="eyebrow">Data feeds</p>
        <h2>What is actually connected?</h2>
        <p>
          The current live site uses demo data for the product UI. Historical StatsBomb connectivity can
          be checked through the public GitHub feed. Real-time API-Football is not active until credentials
          and a worker service are configured.
        </p>
      </div>
      <div className="feed-status-card">
        <button className="button primary" type="button" onClick={checkFeeds} disabled={loading}>
          {loading ? "Checking feeds..." : "Check feed status"}
        </button>
        {status ? (
          <div className="feed-status-grid">
            <FeedTile
              label="Historical"
              ok={status.feeds.historical.connected}
              detail={`${status.feeds.historical.name} via ${status.feeds.historical.mode}`}
            />
            <FeedTile
              label="Real-time"
              ok={status.feeds.realtime.connected}
              detail={status.feeds.realtime.message}
            />
            <FeedTile
              label="Postgres"
              ok={status.feeds.storage.postgres}
              detail={status.feeds.storage.postgres ? "DATABASE_URL configured" : "DATABASE_URL missing"}
            />
            <FeedTile
              label="Redis"
              ok={status.feeds.storage.redis}
              detail={status.feeds.storage.redis ? "REDIS_URL configured" : "REDIS_URL missing"}
            />
          </div>
        ) : null}
        {historical ? (
          <div className="historical-feed-result">
            <strong>
              StatsBomb World Cup entries:{" "}
              {historical.connected ? historical.worldCupCompetitionCount ?? 0 : "unavailable"}
            </strong>
            {historical.error ? <p>{historical.error}</p> : null}
            {historical.worldCups?.slice(0, 5).map((competition) => (
              <p key={`${competition.name}-${competition.season}-${competition.gender}`}>
                {competition.name} - {competition.season} ({competition.gender})
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FeedTile({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <article className={ok ? "feed-tile ok" : "feed-tile missing"}>
      <span>{ok ? "Connected" : "Not active"}</span>
      <h3>{label}</h3>
      <p>{detail}</p>
    </article>
  );
}
