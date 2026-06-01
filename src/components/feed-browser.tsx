"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerStatsTable } from "@/components/player-stats-table";
import { MatchTeamsLine, TeamLabel } from "@/components/team-label";

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

type BracketCluster = {
  label: string;
  groups: [string, string];
  matches: Match[];
};

type BracketRound = {
  stage: string;
  matches: Match[];
  clusters?: BracketCluster[];
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

type EventTab = "current" | "past";

export function FeedBrowser() {
  const [activeTab, setActiveTab] = useState<EventTab>("current");
  const [currentWorldCup, setCurrentWorldCup] = useState<CurrentWorldCup | null>(null);
  const [competitions, setCompetitions] = useState<WorldCupCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [lineupSearch, setLineupSearch] = useState("");
  const [showMatchesList, setShowMatchesList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialFeeds() {
      setLoading(true);
      setError(null);
      try {
        const [historicalResponse, currentResponse] = await Promise.all([
          fetch("/api/feeds/historical", { cache: "no-store" }),
          fetch("/api/feeds/current-world-cup", { cache: "no-store" })
        ]);

        if (!historicalResponse.ok) {
          throw new Error("Unable to load competitions");
        }

        const historicalJson = (await historicalResponse.json()) as { worldCups: WorldCupCompetition[] };
        const currentJson = currentResponse.ok ? ((await currentResponse.json()) as CurrentWorldCup) : null;

        if (cancelled) return;

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
      setSelectedPlayerId(null);

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
      setSelectedPlayerId(null);
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
  return (
    <div className="feed-browser">
      <nav className="event-tab-bar" aria-label="Tournament event selector">
        <button
          className={activeTab === "current" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("current")}
        >
          Current event
        </button>
        <button
          className={activeTab === "past" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("past")}
        >
          Past events
        </button>
      </nav>

      <section className="feed-hero">
        <div>
          <p className="eyebrow">Feed-driven data</p>
          {activeTab === "current" ? (
            <>
              <h1>Current event: 2026 FIFA World Cup.</h1>
              <p>
                Current tournament information is read from public tournament pages. Live API-Football
                data remains unavailable until credentials and the worker are configured.
              </p>
            </>
          ) : (
            <>
              <h1>Past events: historical World Cup data.</h1>
              <p>
                Historical matches, squads, player stats, team stats, and knockout trees come from
                StatsBomb Open Data.
              </p>
            </>
          )}
        </div>
      </section>

      {loading ? <p className="inline-status">Loading real feeds...</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}

      {activeTab === "current" ? (
        <CurrentEventPanel currentWorldCup={currentWorldCup} />
      ) : (
        <PastEventsPanel
          bracketRounds={bracketRounds}
          competitions={competitions}
          filteredMatches={filteredMatches}
          lineupSearch={lineupSearch}
          matchDetail={matchDetail}
          matchSearch={matchSearch}
          showMatchesList={showMatchesList}
          selectedCompetition={selectedCompetition}
          selectedMatch={selectedMatch}
          selectedMatchId={selectedMatchId}
          selectedPlayerId={selectedPlayerId}
          setLineupSearch={setLineupSearch}
          setMatchSearch={setMatchSearch}
          setShowMatchesList={setShowMatchesList}
          setSelectedCompetition={setSelectedCompetition}
          setSelectedMatchId={setSelectedMatchId}
          setSelectedPlayerId={setSelectedPlayerId}
        />
      )}
    </div>
  );
}

function CurrentEventPanel({ currentWorldCup }: { currentWorldCup: CurrentWorldCup | null }) {
  return (
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
            <span className="qualified-team-pill" key={team}>
              <TeamLabel name={team} size="xs" />
            </span>
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
                  <TeamLabel name={team} size="xs" />
                </p>
              ))}
              <div className="current-fixture-list">
                {group.fixtures.slice(0, 6).map((fixture) => (
                  <span className="fixture-teams" key={`${group.group}-${fixture.homeTeam}-${fixture.awayTeam}`}>
                    <MatchTeamsLine awayTeam={fixture.awayTeam} homeTeam={fixture.homeTeam} size="xs" />
                    {fixture.date ? ` · ${fixture.date}` : ""}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <section className="bracket-tree-card compact-tree">
        <p className="eyebrow">Current event path</p>
        <h2>Format through the final</h2>
        <div className="bracket-tree">
          {["Group stage", "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"].map((stage) => (
            <div className="bracket-round" key={stage}>
              <h3>{stage}</h3>
              <button type="button">
                <strong>{stage === "Group stage" ? "Groups A-L" : "Qualified teams TBD"}</strong>
                <span>{stage === "Final" ? "July 19, 2026" : "Driven by current event feed"}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

type PastEventsPanelProps = {
  bracketRounds: BracketRound[];
  competitions: WorldCupCompetition[];
  filteredMatches: Match[];
  lineupSearch: string;
  matchDetail: MatchDetail | null;
  matchSearch: string;
  showMatchesList: boolean;
  selectedCompetition: string;
  selectedMatch: Match | undefined;
  selectedMatchId: number | null;
  selectedPlayerId: number | null;
  setLineupSearch: (value: string) => void;
  setMatchSearch: (value: string) => void;
  setShowMatchesList: (value: boolean) => void;
  setSelectedCompetition: (value: string) => void;
  setSelectedMatchId: (value: number) => void;
  setSelectedPlayerId: (value: number | null) => void;
};

function PastEventsPanel({
  bracketRounds,
  competitions,
  filteredMatches,
  lineupSearch,
  matchDetail,
  matchSearch,
  showMatchesList,
  selectedCompetition,
  selectedMatch,
  selectedMatchId,
  selectedPlayerId,
  setLineupSearch,
  setMatchSearch,
  setShowMatchesList,
  setSelectedCompetition,
  setSelectedMatchId,
  setSelectedPlayerId
}: PastEventsPanelProps) {
  const filteredLineups = (matchDetail?.lineups ?? []).map((team) => ({
    ...team,
    players: team.players.filter((player) =>
      `${player.name} ${player.country ?? ""}`.toLowerCase().includes(lineupSearch.toLowerCase())
    )
  }));

  function selectMatch(matchId: number) {
    setSelectedMatchId(matchId);
    setSelectedPlayerId(null);
  }

  return (
    <>
      <section className="feed-control-card surface-muted">
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
        <a className="button secondary" href="/api/feeds/realtime">
          Real-time API status
        </a>
      </section>

      <section className="bracket-tree-card surface-muted">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Knockout tree</p>
            <h2>Route to the final</h2>
            <p>Select a match to view team stats, squads, and lineups.</p>
          </div>
          <button
            className="button secondary"
            type="button"
            aria-pressed={showMatchesList}
            onClick={() => setShowMatchesList(!showMatchesList)}
          >
            {showMatchesList ? "Hide match list" : "Show full match list"}
          </button>
        </div>
        <div className="bracket-tree">
          {bracketRounds.map((round) => (
            <div className="bracket-round" key={round.stage}>
              <h3>{round.stage}</h3>
              {round.clusters?.length ? (
                round.clusters.map((cluster) => (
                  <div className="bracket-cluster" key={cluster.groups.join("-")}>
                    <h4>{cluster.label}</h4>
                    <div className="bracket-cluster-matches">
                      {cluster.matches.map((match) => (
                        <BracketMatchButton
                          key={match.matchId}
                          match={match}
                          selectedMatchId={selectedMatchId}
                          onSelect={selectMatch}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                round.matches.map((match) => (
                  <BracketMatchButton
                    key={match.matchId}
                    match={match}
                    selectedMatchId={selectedMatchId}
                    onSelect={selectMatch}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={`match-explorer${showMatchesList ? "" : " match-explorer--detail-only"}`}>
        {showMatchesList ? (
          <article className="data-card surface-muted match-explorer-list">
            <div className="section-heading compact">
              <div>
                <h2>All matches</h2>
                <p>{filteredMatches.length} in feed</p>
              </div>
              <label className="match-list-search">
                Search
                <input
                  aria-label="Search matches"
                  placeholder="Team or stage"
                  type="search"
                  value={matchSearch}
                  onChange={(event) => setMatchSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="feed-list compact-list">
              {filteredMatches.map((match) => (
                <button
                  className={selectedMatchId === match.matchId ? "selected" : ""}
                  key={match.matchId}
                  type="button"
                  onClick={() => selectMatch(match.matchId)}
                >
                  <MatchTeamsLine
                    awayScore={match.awayScore}
                    awayTeam={match.awayTeam}
                    homeScore={match.homeScore}
                    homeTeam={match.homeTeam}
                    size="sm"
                  />
                  <span>
                    {match.date} · {match.stage ?? "Stage unavailable"}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ) : null}

        <div className="match-explorer-detail">
          {!selectedMatch ? (
            <article className="data-card surface-flat match-placeholder">
              <h2>Select a match</h2>
              <p>Pick a fixture in the knockout tree above to view team stats, squads, and lineups.</p>
            </article>
          ) : (
            <>
              <article className="data-card widget-elevated match-summary-card">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">{selectedMatch.stage ?? "Match"}</p>
                    <h2 className="match-title-line">
                      <MatchTeamsLine
                        awayScore={selectedMatch.awayScore}
                        awayTeam={selectedMatch.awayTeam}
                        homeScore={selectedMatch.homeScore}
                        homeTeam={selectedMatch.homeTeam}
                        layout="stacked"
                        size="md"
                      />
                    </h2>
                    <p>
                      {selectedMatch.date}
                      {selectedMatch.stadium ? ` · ${selectedMatch.stadium}` : ""}
                    </p>
                  </div>
                </div>

                {!matchDetail ? (
                  <p className="inline-status">Loading match data…</p>
                ) : (
                  <div className="match-detail-stack">
                    <section className="match-detail-section">
                      <h3>Team stats</h3>
                      <div className="team-stat-grid compact">
                        {matchDetail.teamStats.map((team) => (
                          <div className="team-stat-card compact" key={team.team}>
                            <h4>
                              <TeamLabel name={team.team} size="sm" />
                            </h4>
                            <div className="stat-chip-grid">
                              <StatChip label="G" value={team.goals} />
                              <StatChip label="Sh" value={team.shots} />
                              <StatChip label="xG" value={team.xg} />
                              <StatChip label="Pass" value={team.passes} />
                              <StatChip
                                label="Acc"
                                value={team.passAccuracy ? `${team.passAccuracy}%` : "n/a"}
                              />
                              <StatChip label="Car" value={team.carries} />
                              <StatChip label="Drib" value={`${team.successfulDribbles}/${team.dribbles}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="match-detail-section">
                      <div className="section-heading compact">
                        <h3>Squads & lineups</h3>
                        <input
                          aria-label="Search lineup"
                          className="lineup-search"
                          placeholder="Filter players"
                          type="search"
                          value={lineupSearch}
                          onChange={(event) => setLineupSearch(event.target.value)}
                        />
                      </div>
                      <div className="lineup-grid compact">
                        {filteredLineups.map((team) => (
                          <div className="lineup-card compact" key={team.teamName}>
                            <h4>
                              <TeamLabel name={team.teamName} size="sm" />
                            </h4>
                            <div className="lineup-list">
                              {team.players.map((player) => (
                                <button
                                  className={
                                    selectedPlayerId === player.playerId ? "lineup-row selected" : "lineup-row"
                                  }
                                  key={`${team.teamName}-${player.playerId}`}
                                  type="button"
                                  onClick={() => setSelectedPlayerId(player.playerId)}
                                >
                                  <span>{player.jerseyNumber ?? "–"}</span>
                                  <TeamLabel countryHint={player.country} name={player.name} size="xs" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {matchDetail.playerStats.length > 0 ? (
                      <PlayerStatsTable
                        players={matchDetail.playerStats}
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={setSelectedPlayerId}
                      />
                    ) : (
                      <p className="inline-status">No player-level event stats for this match.</p>
                    )}
                  </div>
                )}
              </article>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function BracketMatchButton({
  match,
  onSelect,
  selectedMatchId
}: {
  match: Match;
  onSelect: (matchId: number) => void;
  selectedMatchId: number | null;
}) {
  return (
    <button
      className={selectedMatchId === match.matchId ? "selected" : ""}
      type="button"
      onClick={() => onSelect(match.matchId)}
    >
      <MatchTeamsLine
        awayScore={match.awayScore}
        awayTeam={match.awayTeam}
        homeScore={match.homeScore}
        homeTeam={match.homeTeam}
        size="xs"
      />
      <span>{match.date}</span>
    </button>
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

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
