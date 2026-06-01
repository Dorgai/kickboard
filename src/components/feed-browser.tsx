"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { LiveFixturesPanel } from "@/components/live-fixtures-panel";
import { groupMatchesByLetter, inferTeamToGroup } from "@/lib/group-stage";
import { MatchEventTimeline } from "@/components/match-event-timeline";
import { PlayerStatsPanel } from "@/components/player-stats-panel";
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
type StageFilter = "all" | "group" | "knockout";

const PAST_EVENT_HASHES = new Set(["bracket", "squads", "players", "community", "analytics"]);

function hashTarget(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return value || null;
}

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
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function syncTabFromHash() {
      const hash = hashTarget();
      if (hash && PAST_EVENT_HASHES.has(hash)) {
        setActiveTab("past");
      }
    }

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  useEffect(() => {
    if (activeTab !== "past" || loading) return;
    const hash = hashTarget();
    if (!hash || !PAST_EVENT_HASHES.has(hash)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, loading, bracketRounds.length, selectedMatchId]);

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

  const filteredMatches = useMemo(() => {
    const query = matchSearch.toLowerCase();
    return matches.filter((match) => {
      const matchesSearch = `${match.homeTeam} ${match.awayTeam} ${match.stage ?? ""}`
        .toLowerCase()
        .includes(query);
      if (!matchesSearch) return false;
      if (stageFilter === "group") return match.stage === "Group Stage";
      if (stageFilter === "knockout") return Boolean(match.stage && match.stage !== "Group Stage");
      return true;
    });
  }, [matchSearch, matches, stageFilter]);

  const groupStageMatches = useMemo(
    () => matches.filter((match) => match.stage === "Group Stage"),
    [matches]
  );

  const selectedCompetitionParts = useMemo(() => {
    const [competitionId, seasonId] = selectedCompetition.split(":").map((value) => Number(value));
    return { competitionId, seasonId };
  }, [selectedCompetition]);

  const selectedCompetitionLabel = useMemo(() => {
    const entry = competitions.find(
      (competition) =>
        `${competition.competitionId}:${competition.seasonId}` === selectedCompetition
    );
    return entry ? `${entry.name} ${entry.season}` : "This tournament";
  }, [competitions, selectedCompetition]);

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
                Tournament summary and groups come from public pages. Live scores appear when
                API-Football and the worker are configured.
              </p>
            </>
          ) : (
            <>
              <h1>Past events: historical World Cup data.</h1>
              <p>
                Historical matches, event timelines, squads, player stats, team stats, and knockout
                trees come from StatsBomb Open Data.
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
          groupStageMatches={groupStageMatches}
          stageFilter={stageFilter}
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
          setStageFilter={setStageFilter}
          competitionId={selectedCompetitionParts.competitionId}
          seasonId={selectedCompetitionParts.seasonId}
          competitionLabel={selectedCompetitionLabel}
        />
      )}
    </div>
  );
}

const CURRENT_KNOCKOUT_STAGES = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Final"
] as const;

function CurrentEventPanel({ currentWorldCup }: { currentWorldCup: CurrentWorldCup | null }) {
  const qualifiedCount = currentWorldCup?.qualifiedTeams.length ?? 0;
  const groups = currentWorldCup?.groups ?? [];
  const [activeGroupLetter, setActiveGroupLetter] = useState(groups[0]?.group ?? "A");
  const [activeKnockoutStage, setActiveKnockoutStage] = useState<string>(CURRENT_KNOCKOUT_STAGES[0]);

  useEffect(() => {
    if (groups.length && !groups.some((group) => group.group === activeGroupLetter)) {
      setActiveGroupLetter(groups[0].group);
    }
  }, [activeGroupLetter, groups]);

  const activeGroup = groups.find((group) => group.group === activeGroupLetter);

  return (
    <section className="current-world-cup-card">
      <LiveFixturesPanel />

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

      {qualifiedCount > 0 ? (
        <details className="qualified-team-disclosure">
          <summary>
            {qualifiedCount} qualified {qualifiedCount === 1 ? "nation" : "nations"}
          </summary>
          <div className="qualified-team-list qualified-team-list--compact">
            {currentWorldCup!.qualifiedTeams.map((team) => (
              <span className="qualified-team-chip" key={team}>
                {team}
              </span>
            ))}
          </div>
        </details>
      ) : (
        <p className="inline-status">Qualified-team table was not available from the public source.</p>
      )}

      <section className="bracket-tree-card surface-muted current-event-bracket" id="bracket">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Tournament path</p>
            <h2>Route to the final</h2>
            <p>Use tabs to browse groups and knockout stages. Knockout pairings appear when live data connects.</p>
          </div>
        </div>

        <div className="bracket-tabbed-section">
          <h3 className="bracket-tabbed-heading">Group stage</h3>
          {groups.length ? (
            <>
              <FeedTabBar
                ariaLabel="Group stage groups"
                className="bracket-stage-tabs"
                tabs={groups.map((group) => ({
                  id: group.group,
                  label: `Group ${group.group}`
                }))}
                value={activeGroupLetter}
                onChange={setActiveGroupLetter}
              />
              {activeGroup ? (
                <div className="bracket-cluster">
                  <div className="bracket-cluster-teams">
                    {activeGroup.teams.map((team) => (
                      <div className="bracket-team-slot" key={`${activeGroup.group}-${team}`}>
                        <TeamLabel name={team} size="xs" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <button className="bracket-tbd-slot" disabled type="button">
              <strong>Groups A–L</strong>
              <span>Loading from public feed</span>
            </button>
          )}
        </div>

        <div className="bracket-tabbed-section">
          <h3 className="bracket-tabbed-heading">Knockout</h3>
          <FeedTabBar
            ariaLabel="Knockout stages"
            className="bracket-stage-tabs"
            tabs={CURRENT_KNOCKOUT_STAGES.map((stage) => ({ id: stage, label: stage }))}
            value={activeKnockoutStage}
            onChange={setActiveKnockoutStage}
          />
          <button className="bracket-tbd-slot" disabled type="button">
            <strong>Pairings TBD</strong>
            <span>
              {activeKnockoutStage === "Final" ? "July 19, 2026" : "Live feed pending"} · {activeKnockoutStage}
            </span>
          </button>
        </div>
      </section>
    </section>
  );
}

type PastEventsPanelProps = {
  bracketRounds: BracketRound[];
  competitions: WorldCupCompetition[];
  filteredMatches: Match[];
  groupStageMatches: Match[];
  lineupSearch: string;
  matchDetail: MatchDetail | null;
  matchSearch: string;
  showMatchesList: boolean;
  stageFilter: StageFilter;
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
  setStageFilter: (value: StageFilter) => void;
  competitionId: number;
  seasonId: number;
  competitionLabel: string;
};

function PastEventsPanel({
  bracketRounds,
  competitions,
  filteredMatches,
  groupStageMatches,
  lineupSearch,
  matchDetail,
  matchSearch,
  showMatchesList,
  stageFilter,
  selectedCompetition,
  selectedMatch,
  selectedMatchId,
  selectedPlayerId,
  setLineupSearch,
  setMatchSearch,
  setShowMatchesList,
  setSelectedCompetition,
  setSelectedMatchId,
  setSelectedPlayerId,
  setStageFilter,
  competitionId,
  seasonId,
  competitionLabel
}: PastEventsPanelProps) {
  const teamToGroup = useMemo(() => inferTeamToGroup(groupStageMatches), [groupStageMatches]);
  const groupBuckets = useMemo(
    () => groupMatchesByLetter(groupStageMatches, teamToGroup),
    [groupStageMatches, teamToGroup]
  );
  const [activeGroupLetter, setActiveGroupLetter] = useState("A");
  const [activeKnockoutStage, setActiveKnockoutStage] = useState("");

  useEffect(() => {
    if (groupBuckets.length && !groupBuckets.some((bucket) => bucket.letter === activeGroupLetter)) {
      setActiveGroupLetter(groupBuckets[0].letter);
    }
  }, [activeGroupLetter, groupBuckets]);

  useEffect(() => {
    if (
      bracketRounds.length &&
      (!activeKnockoutStage || !bracketRounds.some((round) => round.stage === activeKnockoutStage))
    ) {
      setActiveKnockoutStage(bracketRounds[0].stage);
    }
  }, [activeKnockoutStage, bracketRounds]);

  const activeGroupMatches =
    groupBuckets.find((bucket) => bucket.letter === activeGroupLetter)?.matches ?? [];
  const activeKnockoutRound = bracketRounds.find((round) => round.stage === activeKnockoutStage);

  const filteredLineups = (matchDetail?.lineups ?? []).map((team) => ({
    ...team,
    players: team.players.filter((player) =>
      `${player.name} ${player.country ?? ""}`.toLowerCase().includes(lineupSearch.toLowerCase())
    )
  }));

  function selectMatch(matchId: number) {
    setSelectedMatchId(matchId);
    setSelectedPlayerId(null);
    window.requestAnimationFrame(() => {
      document.getElementById("match-detail-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
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
        <div className="stage-filter-bar" role="group" aria-label="Match stage filter">
          {(
            [
              ["all", "All stages"],
              ["group", "Group stage"],
              ["knockout", "Knockout"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={stageFilter === value ? "active" : ""}
              type="button"
              onClick={() => setStageFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {groupBuckets.length ? (
        <section className="data-card surface-muted group-stage-explorer" id="group-stage">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Group stage</p>
              <h2>Group stage results</h2>
              <p>
                {groupStageMatches.length} matches · pick a group tab, then a fixture for detail below.
              </p>
            </div>
          </div>
          <FeedTabBar
            ariaLabel="Group stage groups"
            className="group-stage-tabs"
            tabs={groupBuckets.map((bucket) => ({
              id: bucket.letter,
              label: `Group ${bucket.letter}`
            }))}
            value={activeGroupLetter}
            onChange={setActiveGroupLetter}
          />
          <div className="group-stage-match-list">
            {activeGroupMatches.map((match) => (
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
                  layout="stacked"
                  size="sm"
                />
                <span>
                  {match.date} · {match.stage ?? "Group Stage"}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="knockout-workspace">
        <section className="bracket-tree-card surface-muted" id="bracket">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Knockout tree</p>
              <h2>Route to the final</h2>
              <p>Select a match — stats, squads, and player data appear in the panels below.</p>
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
          {bracketRounds.length ? (
            <>
              <FeedTabBar
                ariaLabel="Knockout stages"
                className="bracket-stage-tabs"
                tabs={bracketRounds.map((round) => ({
                  id: round.stage,
                  label: round.stage
                }))}
                value={activeKnockoutStage}
                onChange={setActiveKnockoutStage}
              />
              {activeKnockoutRound ? (
                <div className="bracket-stage-panel">
                  {activeKnockoutRound.clusters?.length ? (
                    activeKnockoutRound.clusters.map((cluster) => (
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
                    <div className="bracket-cluster-matches">
                      {activeKnockoutRound.matches.map((match) => (
                        <BracketMatchButton
                          key={match.matchId}
                          match={match}
                          selectedMatchId={selectedMatchId}
                          onSelect={selectMatch}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p className="inline-status">No knockout rounds in this feed.</p>
          )}
        </section>

        <div className="knockout-widgets" id="match-detail-panel">
          <div
            className={`knockout-widgets-row knockout-widgets-row--primary${
              showMatchesList ? " knockout-widgets-row--with-list" : ""
            }`}
          >
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
                <div className="feed-list compact-list match-list-grid">
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

            {!selectedMatch ? (
              <article className="data-card surface-flat match-placeholder">
                <h2>Select a match</h2>
                <p>Pick a fixture in the knockout tree to view team stats, squads, and lineups below.</p>
              </article>
            ) : (
              <article className="data-card widget-elevated match-summary-card">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">{selectedMatch.stage ?? "Match"}</p>
                    <div className="match-title-line">
                      <MatchTeamsLine
                        awayScore={selectedMatch.awayScore}
                        awayTeam={selectedMatch.awayTeam}
                        homeScore={selectedMatch.homeScore}
                        homeTeam={selectedMatch.homeTeam}
                        layout="stacked"
                        size="md"
                      />
                    </div>
                    <p>
                      {selectedMatch.date}
                      {selectedMatch.stadium ? ` · ${selectedMatch.stadium}` : ""}
                    </p>
                  </div>
                </div>
                {!matchDetail ? <p className="inline-status">Loading match data…</p> : null}
              </article>
            )}
          </div>

          {selectedMatch && matchDetail ? (
            <>
              <div className="knockout-widgets-row knockout-widgets-row--match-data">
                <section className="data-card surface-muted match-detail-section">
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

                <section className="data-card surface-muted match-detail-section" id="squads">
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
                              <TeamLabel countryHint={player.country} name={player.name} size="sm" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="knockout-widgets-row knockout-widgets-row--timeline">
                <article className="data-card surface-muted match-event-timeline-card">
                  <MatchEventTimeline matchId={selectedMatch.matchId} />
                </article>
              </div>

              <div className="knockout-widgets-row knockout-widgets-row--players" id="players">
                {matchDetail.playerStats.length > 0 && selectedMatch ? (
                  <PlayerStatsPanel
                    competitionId={competitionId}
                    competitionLabel={competitionLabel}
                    matchMeta={{
                      matchId: selectedMatch.matchId,
                      date: selectedMatch.date,
                      stage: selectedMatch.stage,
                      homeTeam: selectedMatch.homeTeam,
                      awayTeam: selectedMatch.awayTeam,
                      homeScore: selectedMatch.homeScore,
                      awayScore: selectedMatch.awayScore,
                      stadium: selectedMatch.stadium
                    }}
                    players={matchDetail.playerStats}
                    seasonId={seasonId}
                    selectedPlayerId={selectedPlayerId}
                    onSelectPlayer={setSelectedPlayerId}
                  />
                ) : (
                  <p className="inline-status data-card surface-flat">No player-level event stats for this match.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <section className="data-card surface-flat section-anchor" id="community">
        <h2>Community</h2>
        <p>Coach Board, squads sharing, and social widgets are planned for a later phase.</p>
      </section>
      <section className="data-card surface-flat section-anchor" id="analytics">
        <h2>Analytics</h2>
        <p>Pro heat maps and guided analytics will build on the match and player stats shown above.</p>
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
        layout="stacked"
        size="sm"
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
