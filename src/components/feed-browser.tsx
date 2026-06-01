"use client";

import { useEffect, useMemo, useState } from "react";

type WorldCupCompetition = {
  competitionId: number;
  seasonId: number;
  name: string;
  gender: string;
  season: string;
  matchDataAvailable: string | null;
};

type Match = {
  matchId: number;
  date: string;
  kickoff: string | null;
  stage: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  stadium: string | null;
  status: string | null;
};

type EventSummary = {
  id: string;
  minute: number;
  second: number;
  type: string;
  team: string | null;
  player: string | null;
};

type FeedStatus = {
  feeds: {
    historical: {
      connected: boolean;
    };
    realtime: {
      connected: boolean;
      message: string;
    };
    storage: {
      postgres: boolean;
      redis: boolean;
    };
  };
};

export function FeedBrowser() {
  const [status, setStatus] = useState<FeedStatus | null>(null);
  const [competitions, setCompetitions] = useState<WorldCupCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [matchSearch, setMatchSearch] = useState("");
  const [eventType, setEventType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialFeeds() {
      setLoading(true);
      setError(null);
      try {
        const [statusResponse, historicalResponse] = await Promise.all([
          fetch("/api/feeds/status", { cache: "no-store" }),
          fetch("/api/feeds/historical", { cache: "no-store" })
        ]);

        if (!statusResponse.ok || !historicalResponse.ok) {
          throw new Error("Unable to load feed status or competitions");
        }

        const statusJson = (await statusResponse.json()) as FeedStatus;
        const historicalJson = (await historicalResponse.json()) as {
          worldCups: WorldCupCompetition[];
        };

        if (cancelled) return;

        setStatus(statusJson);
        setCompetitions(historicalJson.worldCups);
        const firstCompetition = historicalJson.worldCups[0];
        if (firstCompetition) {
          setSelectedCompetition(`${firstCompetition.competitionId}:${firstCompetition.seasonId}`);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown feed load error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialFeeds();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompetition) return;
    const [competitionId, seasonId] = selectedCompetition.split(":");
    let cancelled = false;

    async function loadMatches() {
      setError(null);
      setMatches([]);
      setEvents([]);
      setSelectedMatchId(null);

      try {
        const response = await fetch(
          `/api/feeds/historical/matches?competitionId=${competitionId}&seasonId=${seasonId}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Unable to load StatsBomb matches");
        }

        const data = (await response.json()) as { matches: Match[] };
        if (cancelled) return;
        setMatches(data.matches);
        setSelectedMatchId(data.matches[0]?.matchId ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown match load error");
        }
      }
    }

    loadMatches();

    return () => {
      cancelled = true;
    };
  }, [selectedCompetition]);

  useEffect(() => {
    if (!selectedMatchId) return;
    let cancelled = false;

    async function loadEvents() {
      setEvents([]);
      setError(null);

      try {
        const response = await fetch(`/api/feeds/historical/events?matchId=${selectedMatchId}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Unable to load StatsBomb events");
        }

        const data = (await response.json()) as { events: EventSummary[] };
        if (!cancelled) {
          setEvents(data.events);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown event load error");
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [selectedMatchId]);

  const filteredMatches = useMemo(
    () =>
      matches.filter((match) =>
        `${match.homeTeam} ${match.awayTeam} ${match.stage ?? ""}`
          .toLowerCase()
          .includes(matchSearch.toLowerCase())
      ),
    [matchSearch, matches]
  );

  const eventTypes = useMemo(() => ["All", ...Array.from(new Set(events.map((event) => event.type))).sort()], [events]);
  const filteredEvents = eventType === "All" ? events : events.filter((event) => event.type === eventType);
  const selectedMatch = matches.find((match) => match.matchId === selectedMatchId);

  return (
    <div className="feed-browser">
      <section className="feed-hero">
        <div>
          <p className="eyebrow">Feed-driven data</p>
          <h1>Kickboard now reads from real football data feeds.</h1>
          <p>
            Historical data comes from StatsBomb Open Data. Real-time data is intentionally unavailable
            until API-Football credentials and the worker are configured; the app does not fabricate live scores.
          </p>
        </div>
        <div className="feed-status-grid">
          <FeedStatusTile label="StatsBomb" ok={Boolean(status?.feeds.historical.connected)} />
          <FeedStatusTile label="API-Football" ok={Boolean(status?.feeds.realtime.connected)} />
          <FeedStatusTile label="Postgres" ok={Boolean(status?.feeds.storage.postgres)} />
          <FeedStatusTile label="Redis" ok={Boolean(status?.feeds.storage.redis)} />
        </div>
      </section>

      {loading ? <p className="inline-status">Loading feed status...</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}

      <section className="feed-control-card">
        <label>
          World Cup feed
          <select value={selectedCompetition} onChange={(event) => setSelectedCompetition(event.target.value)}>
            {competitions.map((competition) => (
              <option
                key={`${competition.competitionId}:${competition.seasonId}`}
                value={`${competition.competitionId}:${competition.seasonId}`}
              >
                {competition.name} {competition.season} ({competition.gender})
              </option>
            ))}
          </select>
        </label>
        <label>
          Search matches
          <input
            placeholder="Team or stage"
            type="search"
            value={matchSearch}
            onChange={(event) => setMatchSearch(event.target.value)}
          />
        </label>
        <a className="button secondary" href="/api/feeds/realtime">
          Real-time API status
        </a>
      </section>

      <section className="feed-content-grid">
        <article className="data-card">
          <h2>StatsBomb matches</h2>
          <p>{filteredMatches.length} matches from the selected feed.</p>
          <div className="feed-list">
            {filteredMatches.map((match) => (
              <button
                className={selectedMatchId === match.matchId ? "selected" : ""}
                key={match.matchId}
                type="button"
                onClick={() => setSelectedMatchId(match.matchId)}
              >
                <strong>
                  {match.homeTeam} {match.homeScore}-{match.awayScore} {match.awayTeam}
                </strong>
                <span>
                  {match.date} - {match.stage ?? "Stage unavailable"}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="data-card">
          <h2>Match events</h2>
          {selectedMatch ? (
            <p>
              {selectedMatch.homeTeam} vs {selectedMatch.awayTeam} - {events.length} events loaded.
            </p>
          ) : (
            <p>Select a match to load events.</p>
          )}
          <label>
            Event type
            <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
              {eventTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <div className="event-list">
            {filteredEvents.slice(0, 40).map((event) => (
              <div className="event-row" key={event.id}>
                <span>
                  {event.minute}:{String(event.second).padStart(2, "0")}
                </span>
                <strong>{event.type}</strong>
                <span>{event.player ?? event.team ?? "No player"}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="feed-control-card">
        <h2>Implementation status</h2>
        <p>
          Real public historical feed browsing is implemented. Real-time is implemented as a provider
          endpoint that only returns data when API-Football is configured. Auth, paid subscriptions,
          social posting, wallet settlement, image generation, and moderation workflows still require
          backend services and credentials before they can operate with real users.
        </p>
      </section>
    </div>
  );
}

function FeedStatusTile({ label, ok }: { label: string; ok: boolean }) {
  return (
    <article className={ok ? "feed-tile ok" : "feed-tile missing"}>
      <span>{ok ? "Connected" : "Not active"}</span>
      <h3>{label}</h3>
    </article>
  );
}
