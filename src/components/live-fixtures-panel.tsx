"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MatchTeamsLine } from "@/components/team-label";

type LiveFixture = {
  fixtureId: number;
  date: string;
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
  league: string;
  season: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

type RealtimeResponse = {
  connected: boolean;
  provider?: string;
  message?: string;
  fixtures?: LiveFixture[];
  error?: string;
};

type LiveFixturesPanelProps = {
  pollIntervalMs?: number;
};

export function LiveFixturesPanel({ pollIntervalMs = 60_000 }: LiveFixturesPanelProps) {
  const [payload, setPayload] = useState<RealtimeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRealtime() {
      try {
        const response = await fetch("/api/feeds/realtime", { cache: "no-store" });
        const data = (await response.json()) as RealtimeResponse;
        if (!cancelled) {
          setPayload(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPayload({ connected: false, message: "Unable to reach realtime feed." });
          setLoading(false);
        }
      }
    }

    loadRealtime();
    const interval = window.setInterval(loadRealtime, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs]);

  if (loading && !payload) {
    return <p className="inline-status">Checking live scores…</p>;
  }

  if (!payload?.connected) {
    return (
      <section className="data-card surface-muted live-fixtures-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Live scores</p>
            <h2>Coming soon</h2>
            <p>
              {payload?.message ??
                "Live match scores will appear here when API-Football is configured for this environment."}
            </p>
          </div>
        </div>
        <p className="inline-status">
          Connection details, API keys, and worker status are managed in Admin.
        </p>
        <Link className="button secondary" href="/admin/data-sources">
          Open admin dashboard
        </Link>
      </section>
    );
  }

  const fixtures = payload.fixtures ?? [];

  return (
    <section className="data-card surface-muted live-fixtures-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Live scores</p>
          <h2>{payload.provider ?? "Live fixtures"}</h2>
          <p>
            {fixtures.length} live {fixtures.length === 1 ? "match" : "matches"} right now
          </p>
        </div>
      </div>
      {fixtures.length ? (
        <div className="live-fixtures-grid">
          {fixtures.map((fixture) => (
            <article className="live-fixture-card" key={fixture.fixtureId}>
              <p className="live-fixture-league">
                {fixture.league} · {fixture.season}
              </p>
              <MatchTeamsLine
                awayScore={fixture.awayGoals ?? undefined}
                awayTeam={fixture.awayTeam}
                homeScore={fixture.homeGoals ?? undefined}
                homeTeam={fixture.homeTeam}
                layout="stacked"
                size="sm"
              />
              <p className="live-fixture-status" data-live={fixture.status.short === "LIVE" ? "true" : "false"}>
                {fixture.status.long}
                {fixture.status.elapsed != null ? ` · ${fixture.status.elapsed}'` : ""}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="inline-status">No live fixtures at the moment.</p>
      )}
    </section>
  );
}
