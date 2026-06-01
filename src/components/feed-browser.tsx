"use client";

import { useEffect, useMemo, useState } from "react";

type WorldCupCompetition = {
  competitionId: number;
  seasonId: number;
  name: string;
  gender: string;
  season: string;
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
};

type LineupTeam = {
  teamName: string;
  players: Array<{
    playerId: number;
    name: string;
    jerseyNumber: number | null;
    country: string | null;
  }>;
};

type TeamStat = {
  team: string;
  passes: number;
  completedPasses: number;
  passAccuracy: number | null;
  shots: number;
  goals: number;
  xg: number;
  carries: number;
  dribbles: number;
  successfulDribbles: number;
};

type PlayerStat = {
  playerId: number | null;
  player: string;
  team: string;
  passes: number;
  passAccuracy: number | null;
  shots: number;
  goals: number;
  assists: number;
  xg: number;
  carries: number;
  dribbles: number;
};

type MatchDetail = {
  lineups: LineupTeam[];
  teamStats: TeamStat[];
  playerStats: PlayerStat[];
};

type BracketRound = {
  stage: string;
  matches: Match[];
};

type CurrentWorldCup = {
  connected: boolean;
  source: string;
  title: string;
  summary: {
    hostCountries: string | null;
    dates: string | null;
    teams: string | null;
    venueCount: string | null;
  };
  qualifiedTeams: string[];
  groups: Array<{
    group: string;
    source: string;
    teams: string[];
    fixtures: Array<{
      homeTeam: string;
      awayTeam: string;
      date: string | null;
    }>;
  }>;
  note: string;
};

type FeedStatus = {
  feeds: {
    historical: { connected: boolean };
    realtime: { connected: boolean; message: string };
    storage: { postgres: boolean; redis: boolean };
  };
};

export function FeedBrowser() {
  const [status, setStatus] = useState<FeedStatus | null>(null);
  const [currentWorldCup, setCurrentWorldCup] = useState<CurrentWorldCup | null>(null);
  const [competitions, setCompetitions] = useState<WorldCupCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialFeeds() {
      setLoading(true);
      setError(null);
      try {
        const [statusResponse, historicalResponse, currentResponse] = await Promise.all([
          fetch("/api/feeds/status", { cache: "no-store" }),
          fetch("/api/feeds/historical", { cache: "no-store" }),
          fetch("/api/feeds/current-world-cup", { cache: "no-store" })
        ]);

        if (!statusResponse.ok || !historicalResponse.ok) {
          throw new Error("Unable to load feed status or competitions");
        }

        const statusJson = (await statusResponse.json()) as FeedStatus;
        const historicalJson = (await historicalResponse.json()) as { worldCups: WorldCupCompetition[] };
        const currentJson = currentResponse.ok ? ((await currentResponse.json()) as CurrentWorldCup) : null;

        if (cancelled) return;

        setStatus(statusJson);
        setCurrentWorldCup(currentJson);
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
        if (!cancelled) setLoading(false);
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

    async function loadCompetitionData() {
      setError(null);
      setMatches([]);
      setBracketRounds([]);
      setMatchDetail(null);
      setSelectedMatchId(null);

      try {
        const [matchesResponse, bracketResponse] = await Promise.all([
          fetch(`/api/feeds/historical/matches?competitionId=${competitionId}&seasonId=${seasonId}`, {
            cache: "no-store"
          }),
          fetch(`/api/feeds/historical/bracket?competitionId=${competitionId}&seasonId=${seasonId}`, {
            cache: "no-store"
          })
        ]);

        if (!matchesResponse.ok || !bracketResponse.ok) {
          throw new Error("Unable to load StatsBomb matches or bracket");
        }

        const matchesData = (await matchesResponse.json()) as { matches: Match[] };
        const bracketData = (await bracketResponse.json()) as { rounds: BracketRound[] };

        if (cancelled) return;
        setMatches(matchesData.matches);
        setBracketRounds(bracketData.rounds);
        setSelectedMatchId(matchesData.matches[0]?.matchId ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown match load error");
        }
      }
    }

    loadCompetitionData();
    return () => {
      cancelled = true;
    };
  }, [selectedCompetition]);

  useEffect(() => {
    if (!selectedMatchId) return;
    let cancelled = false;

    async function loadMatchDetail() {
      setMatchDetail(null);
      setError(null);

      try {
        const response = await fetch(`/api/feeds/historical/match-detail?matchId=${selectedMatchId}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Unable to load StatsBomb match stats and squads");
        }

        const data = (await response.json()) as MatchDetail;
        if (!cancelled) setMatchDetail(data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown match detail load error");
        }
      }
    }

    loadMatchDetail();
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

  const selectedMatch = matches.find((match) => match.matchId === selectedMatchId);
  const filteredPlayerStats = (matchDetail?.playerStats ?? []).filter((player) =>
    `${player.player} ${player.team}`.toLowerCase().includes(playerSearch.toLowerCase())
  );

  return (
    <div className="feed-browser">
      <section className="feed-hero">
        <div>
          <p className="eyebrow">Feed-driven data</p>
          <h1>Kickboard reads real World Cup feeds, stats, squads and brackets.</h1>
          <p>
            Historical match, lineup and player-stat data comes from StatsBomb Open Data. Current World Cup
            info is read from public sources. API-Football real-time stays inactive until credentials and
            the worker are configured.
          </p>
        </div>
        <div className="feed-status-grid">
          <FeedStatusTile label="StatsBomb" ok={Boolean(status?.feeds.historical.connected)} />
          <FeedStatusTile label="API-Football" ok={Boolean(status?.feeds.realtime.connected)} />
          <FeedStatusTile label="Postgres" ok={Boolean(status?.feeds.storage.postgres)} />
          <FeedStatusTile label="Redis" ok={Boolean(status?.feeds.storage.redis)} />
        </div>
      </section>

      {loading ? <p className="inline-status">Loading real feeds...</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}

      <section className="current-world-cup-card">
        <div>
          <p className="eyebrow">Current World Cup public feed</p>
          <h2>{currentWorldCup?.title ?? "2026 FIFA World Cup"}</h2>
          <p>{currentWorldCup?.note ?? "Current tournament source is loading or unavailable."}</p>
        </div>
        <div className="current-summary-grid">
          <SummaryTile label="Hosts" value={currentWorldCup?.summary.hostCountries ?? "Unavailable"} />
          <SummaryTile label="Dates" value={currentWorldCup?.summary.dates ?? "Unavailable"} />
          <SummaryTile label="Teams" value={currentWorldCup?.summary.teams ?? "Unavailable"} />
          <SummaryTile label="Venues" value={currentWorldCup?.summary.venueCount ?? "Unavailable"} />
        </div>
        {currentWorldCup?.qualifiedTeams.length ? (
          <div className="qualified-team-list">
            {currentWorldCup.qualifiedTeams.slice(0, 48).map((team) => (
              <span key={team}>{team}</span>
            ))}
          </div>
        ) : (
          <p className="inline-status">Qualified-team table was not available from the public source.</p>
        )}
        {currentWorldCup?.groups?.length ? (
          <div className="current-group-grid">
            {currentWorldCup.groups.map((group) => (
              <article className="current-group-card" key={group.group}>
                <h3>Group {group.group}</h3>
                {group.teams.map((team) => (
                  <p key={`${group.group}-${team}`}>
                    <strong>{team}</strong>
                  </p>
                ))}
                <div className="current-fixture-list">
                  {group.fixtures.slice(0, 6).map((fixture) => (
                    <span key={`${group.group}-${fixture.homeTeam}-${fixture.awayTeam}`}>
                      {fixture.homeTeam} vs {fixture.awayTeam}
                      {fixture.date ? ` - ${fixture.date}` : ""}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="feed-control-card">
        <label>
          Historical World Cup
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

      <section className="bracket-tree-card">
        <p className="eyebrow">Knockout tree</p>
        <h2>Horizontal route to the final</h2>
        <div className="bracket-tree">
          {bracketRounds.map((round) => (
            <div className="bracket-round" key={round.stage}>
              <h3>{round.stage}</h3>
              {round.matches.map((match) => (
                <button key={match.matchId} type="button" onClick={() => setSelectedMatchId(match.matchId)}>
                  <strong>
                    {match.homeTeam} {match.homeScore}-{match.awayScore} {match.awayTeam}
                  </strong>
                  <span>{match.date}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="feed-content-grid">
        <article className="data-card">
          <h2>Matches</h2>
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
          <h2>Team stats</h2>
          {selectedMatch ? (
            <p>
              {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
            </p>
          ) : null}
          <div className="team-stat-grid">
            {(matchDetail?.teamStats ?? []).map((team) => (
              <div className="team-stat-card" key={team.team}>
                <h3>{team.team}</h3>
                <StatLine label="Goals" value={team.goals} />
                <StatLine label="Shots" value={team.shots} />
                <StatLine label="xG" value={team.xg} />
                <StatLine label="Passes" value={team.passes} />
                <StatLine label="Pass accuracy" value={team.passAccuracy ? `${team.passAccuracy}%` : "n/a"} />
                <StatLine label="Carries" value={team.carries} />
                <StatLine label="Dribbles" value={`${team.successfulDribbles}/${team.dribbles}`} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="feed-content-grid wide">
        <article className="data-card">
          <h2>Squads and lineups</h2>
          <div className="lineup-grid">
            {(matchDetail?.lineups ?? []).map((team) => (
              <div className="lineup-card" key={team.teamName}>
                <h3>{team.teamName}</h3>
                {team.players.map((player) => (
                  <div className="lineup-row" key={`${team.teamName}-${player.playerId}`}>
                    <span>{player.jerseyNumber ?? "-"}</span>
                    <strong>{player.name}</strong>
                    <small>{player.country ?? ""}</small>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>

        <article className="data-card">
          <div className="data-card-header">
            <h2>Player stats</h2>
            <input
              aria-label="Search player stats"
              placeholder="Search player or team"
              type="search"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
            />
          </div>
          <div className="player-stat-table">
            <div className="player-stat-row heading">
              <span>Player</span>
              <span>Team</span>
              <span>G</span>
              <span>A</span>
              <span>Sh</span>
              <span>xG</span>
              <span>Pass</span>
            </div>
            {filteredPlayerStats.slice(0, 80).map((player) => (
              <div className="player-stat-row" key={`${player.team}-${player.player}-${player.playerId}`}>
                <strong>{player.player}</strong>
                <span>{player.team}</span>
                <span>{player.goals}</span>
                <span>{player.assists}</span>
                <span>{player.shots}</span>
                <span>{player.xg}</span>
                <span>{player.passAccuracy ? `${player.passAccuracy}%` : "n/a"}</span>
              </div>
            ))}
          </div>
        </article>
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}
