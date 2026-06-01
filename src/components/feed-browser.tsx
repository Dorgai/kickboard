"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { LiveFixturesPanel } from "@/components/live-fixtures-panel";
import { groupMatchesByLetter, inferTeamToGroup } from "@/lib/group-stage";
import { MatchTeamStatsGrid } from "@/components/match-team-stats-grid";
import { MatchEventTimelineLauncher } from "@/components/match-event-timeline-launcher";
import { MatchLineupList, type MatchLineupTeam } from "@/components/match-lineup-list";
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

type LineupTeam = MatchLineupTeam;

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
      return matchesSearch;
    });
  }, [matchSearch, matches]);

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

      {activeTab === "current" ? (
        <section className="feed-hero">
          <div>
            <h1>Current event: 2026 FIFA World Cup.</h1>
            <p>
              Tournament summary and groups come from public pages. Live scores appear when
              API-Football and the worker are configured.
            </p>
          </div>
        </section>
      ) : null}

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
          matches={matches}
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
                <TeamLabel name={team} size="xs" />
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
  matches: Match[];
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
  competitionId: number;
  seasonId: number;
  competitionLabel: string;
};

function PastEventsPanel({
  bracketRounds,
  competitions,
  filteredMatches,
  groupStageMatches,
  matches,
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
  setSelectedPlayerId,
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

  const activeKnockoutRound = bracketRounds.find((round) => round.stage === activeKnockoutStage);

  const filteredLineups = useMemo(() => {
    const teams: LineupTeam[] = (matchDetail?.lineups ?? []).map((team) => {
      const players = team.players.filter((player) =>
        `${player.name} ${player.country ?? ""}`.toLowerCase().includes(lineupSearch.toLowerCase())
      );
      const countryHint = players.find((player) => player.country)?.country ?? null;
      return { ...team, players, countryHint };
    });

    if (!selectedMatch) return teams;

    const home = teams.find((team) => team.teamName === selectedMatch.homeTeam);
    const away = teams.find((team) => team.teamName === selectedMatch.awayTeam);
    const rest = teams.filter(
      (team) => team.teamName !== selectedMatch.homeTeam && team.teamName !== selectedMatch.awayTeam
    );

    return [home, away, ...rest].filter((team): team is LineupTeam => Boolean(team));
  }, [lineupSearch, matchDetail?.lineups, selectedMatch]);

  const railFixtureMode = useMemo((): "group" | "knockout" | null => {
    if (selectedMatch?.stage === "Group Stage") return "group";
    if (bracketRounds.length > 0) return "knockout";
    if (groupBuckets.length > 0) return "group";
    return null;
  }, [bracketRounds.length, groupBuckets.length, selectedMatch?.stage]);

  const railFixtures = useMemo(() => {
    if (railFixtureMode === "group") {
      const letter =
        selectedMatch?.stage === "Group Stage"
          ? (teamToGroup.get(selectedMatch.homeTeam) ?? teamToGroup.get(selectedMatch.awayTeam))
          : activeGroupLetter;
      if (!letter) return [];
      return groupBuckets.find((bucket) => bucket.letter === letter)?.matches ?? [];
    }
    if (railFixtureMode === "knockout") {
      const stageKey =
        selectedMatch?.stage && selectedMatch.stage !== "Group Stage"
          ? activeKnockoutStage || selectedMatch.stage
          : activeKnockoutStage;
      const round = bracketRounds.find((round) => round.stage === stageKey);
      if (!round) return [];
      return round.clusters?.length
        ? round.clusters.flatMap((cluster) => cluster.matches)
        : round.matches;
    }
    return [];
  }, [
    activeGroupLetter,
    activeKnockoutStage,
    bracketRounds,
    groupBuckets,
    railFixtureMode,
    selectedMatch,
    teamToGroup
  ]);

  const selectedClusterLabel = useMemo(() => {
    if (!selectedMatch?.stage || selectedMatch.stage === "Group Stage") return null;
    const round = bracketRounds.find((round) => round.stage === selectedMatch.stage);
    const cluster = round?.clusters?.find((entry) =>
      entry.matches.some((match) => match.matchId === selectedMatch.matchId)
    );
    return cluster?.label ?? null;
  }, [bracketRounds, selectedMatch]);

  const orderedTeamStats = useMemo(() => {
    if (!matchDetail || !selectedMatch) return matchDetail?.teamStats ?? [];
    const home = matchDetail.teamStats.find((team) => team.team === selectedMatch.homeTeam);
    const away = matchDetail.teamStats.find((team) => team.team === selectedMatch.awayTeam);
    const rest = matchDetail.teamStats.filter(
      (team) => team.team !== selectedMatch.homeTeam && team.team !== selectedMatch.awayTeam
    );
    return [home, away, ...rest].filter((team): team is NonNullable<typeof home> => Boolean(team));
  }, [matchDetail, selectedMatch]);

  function selectMatch(matchId: number) {
    const match = matches.find((entry) => entry.matchId === matchId);
    if (match?.stage && match.stage !== "Group Stage") {
      setActiveKnockoutStage(match.stage);
    }
    if (match?.stage === "Group Stage") {
      const letter = teamToGroup.get(match.homeTeam) ?? teamToGroup.get(match.awayTeam);
      if (letter) setActiveGroupLetter(letter);
    }
    setSelectedMatchId(matchId);
    setSelectedPlayerId(null);
  }

  return (
    <>
      <div className="knockout-workspace" id="group-stage">
        <section className="bracket-tree-card surface-muted" id="bracket">
          <div className="bracket-controls-row feed-control-toolbar">
            <label className="bracket-competition-picker feed-control-field">
              Tournament
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
            {bracketRounds.length ? (
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
            ) : null}
            <button
              className="button secondary bracket-controls-action"
              type="button"
              aria-pressed={showMatchesList}
              onClick={() => setShowMatchesList(!showMatchesList)}
            >
              {showMatchesList ? "Hide match list" : "Show full match list"}
            </button>
          </div>
          {bracketRounds.length ? (
            <>
              {!selectedMatch && activeKnockoutRound ? (
                <div className="bracket-stage-panel">
                  <div className="bracket-fixture-grid">
                    {activeKnockoutRound.matches.map((match) => (
                      <BracketMatchButton
                        key={match.matchId}
                        clusterLabel={knockoutClusterLabel(activeKnockoutRound, match.matchId)}
                        match={match}
                        selectedMatchId={selectedMatchId}
                        showDate={false}
                        teamsLayout="stacked"
                        onSelect={selectMatch}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="inline-status">No knockout rounds in this feed.</p>
          )}
        </section>

        <div className="knockout-widgets" id="match-detail-panel">
          {showMatchesList ? (
            <article className="data-card surface-muted match-explorer-list match-explorer-list--full-page">
              <div className="match-explorer-list-header section-heading compact">
                <div>
                  <h2>All matches</h2>
                  <p>{filteredMatches.length} in feed</p>
                </div>
                <label className="match-list-search feed-control-field">
                  Search
                  <input
                    aria-label="Search matches"
                    className="feed-control-input"
                    placeholder="Team or stage"
                    type="search"
                    value={matchSearch}
                    onChange={(event) => setMatchSearch(event.target.value)}
                  />
                </label>
              </div>
              <div className="feed-list compact-list match-list-grid match-list-grid--full-page">
                {filteredMatches.map((match) => (
                  <button
                    className={`match-fixture-btn match-fixture-btn--teams-stacked${
                      selectedMatchId === match.matchId ? " selected" : ""
                    }`}
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
                      size="xs"
                    />
                    <span>
                      {match.date} · {match.stage ?? "Stage unavailable"}
                    </span>
                  </button>
                ))}
              </div>
            </article>
          ) : null}

          {!selectedMatch && !showMatchesList ? (
            <div className="knockout-widgets-row knockout-widgets-row--primary">
              <article className="data-card surface-flat match-placeholder">
                <h2>Select a match</h2>
                <p>Pick a fixture in the stage panel to load match details beside it.</p>
              </article>
            </div>
          ) : null}

          {railFixtureMode ? (
            <div
              className={`knockout-widgets-row knockout-widgets-row--match-split${
                selectedMatch && matchDetail ? " knockout-widgets-row--with-squads" : ""
              }`}
            >
              <article className="data-card surface-muted match-focus-col match-fixtures-widget">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Fixtures</p>
                    <h2>{railFixtureMode === "group" ? "Group stage" : "Knockout stage"}</h2>
                    {selectedClusterLabel && selectedMatch && selectedMatch.stage === activeKnockoutStage ? (
                      <p className="match-stage-cluster">{selectedClusterLabel}</p>
                    ) : null}
                  </div>
                </div>
                {railFixtureMode === "group" && groupBuckets.length ? (
                  <FeedTabBar
                    ariaLabel="Group stage groups"
                    className="match-stage-tabs"
                    tabs={groupBuckets.map((bucket) => ({
                      id: bucket.letter,
                      label: `Group ${bucket.letter}`
                    }))}
                    value={activeGroupLetter}
                    onChange={setActiveGroupLetter}
                  />
                ) : null}
                {railFixtureMode === "knockout" && bracketRounds.length ? (
                  <FeedTabBar
                    ariaLabel="Knockout stage"
                    className="match-stage-tabs"
                    tabs={bracketRounds.map((round) => ({
                      id: round.stage,
                      label: round.stage
                    }))}
                    value={activeKnockoutStage}
                    onChange={setActiveKnockoutStage}
                  />
                ) : null}
                <p className="match-stage-rail-caption">Select a match</p>
                <div className="bracket-fixture-grid match-stage-fixtures">
                  {railFixtures.map((match) => (
                    <BracketMatchButton
                      key={match.matchId}
                      clusterLabel={
                        railFixtureMode === "knockout"
                          ? knockoutClusterLabel(
                              bracketRounds.find((round) => round.stage === activeKnockoutStage),
                              match.matchId
                            )
                          : undefined
                      }
                      match={match}
                      selectedMatchId={selectedMatchId}
                      teamsLayout="stacked"
                      onSelect={selectMatch}
                    />
                  ))}
                </div>
              </article>

              <article className="data-card surface-muted match-focus-col match-detail-widget">
                {!selectedMatch ? (
                  <div className="match-detail-widget-empty">
                    <h2>Match details</h2>
                    <p className="inline-status">
                      Choose a fixture beside this panel to load team stats, player data, and lineups.
                    </p>
                  </div>
                ) : (
                  <>
                    <header className="match-focus-scoreline">
                      <p className="eyebrow">{selectedMatch.stage ?? "Match"}</p>
                      <MatchTeamsLine
                        awayScore={selectedMatch.awayScore}
                        awayTeam={selectedMatch.awayTeam}
                        homeScore={selectedMatch.homeScore}
                        homeTeam={selectedMatch.homeTeam}
                        layout="stacked"
                        size="md"
                      />
                      <p className="match-focus-meta">
                        {selectedMatch.date}
                        {selectedMatch.stadium ? ` · ${selectedMatch.stadium}` : ""}
                      </p>
                    </header>

                    {!matchDetail ? (
                      <p className="inline-status">Loading team stats…</p>
                    ) : (
                      <MatchTeamStatsGrid columns={orderedTeamStats} />
                    )}
                  </>
                )}
              </article>

              {selectedMatch && matchDetail ? (
                <>
                  <article className="data-card surface-muted match-focus-col match-player-stats-column" id="players">
                    {matchDetail.playerStats.length > 0 ? (
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
                      <p className="inline-status">No player stats for this match.</p>
                    )}
                    <MatchEventTimelineLauncher matchId={selectedMatch.matchId} />
                  </article>

                  <article className="data-card surface-muted match-focus-col match-lineups-column" id="squads">
                    <div className="section-heading compact match-lineups-heading">
                      <div>
                        <h3>Lineups</h3>
                        <p className="match-lineups-note">
                          Grouped by role, then defence, midfield, and attack
                        </p>
                      </div>
                      <input
                        aria-label="Search lineup"
                        className="lineup-search feed-control-input"
                        placeholder="Filter"
                        type="search"
                        value={lineupSearch}
                        onChange={(event) => setLineupSearch(event.target.value)}
                      />
                    </div>
                    <MatchLineupList
                      layout={filteredLineups.length === 2 ? "paired" : "stacked"}
                      selectedPlayerId={selectedPlayerId}
                      teams={filteredLineups}
                      onSelectPlayer={setSelectedPlayerId}
                    />
                  </article>
                </>
              ) : null}
            </div>
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

function knockoutClusterLabel(round: BracketRound | undefined, matchId: number) {
  if (!round?.clusters?.length) return undefined;
  const cluster = round.clusters.find((entry) => entry.matches.some((match) => match.matchId === matchId));
  return cluster?.label;
}

function BracketMatchButton({
  clusterLabel,
  match,
  onSelect,
  selectedMatchId,
  showDate = true,
  teamsLayout = "inline"
}: {
  clusterLabel?: string;
  match: Match;
  onSelect: (matchId: number) => void;
  selectedMatchId: number | null;
  showDate?: boolean;
  teamsLayout?: "inline" | "stacked";
}) {
  return (
    <button
      className={`match-fixture-btn match-fixture-btn--compact match-fixture-btn--teams-${teamsLayout}${
        clusterLabel ? " match-fixture-btn--with-cluster" : ""
      }${selectedMatchId === match.matchId ? " selected" : ""}`}
      title={[clusterLabel, match.date, match.stadium].filter(Boolean).join(" · ")}
      type="button"
      onClick={() => onSelect(match.matchId)}
    >
      <span className="match-fixture-main">
        {clusterLabel ? <span className="match-fixture-cluster">{clusterLabel}</span> : null}
        <MatchTeamsLine
          awayScore={match.awayScore}
          awayTeam={match.awayTeam}
          homeScore={match.homeScore}
          homeTeam={match.homeTeam}
          layout={teamsLayout}
          size="xs"
        />
      </span>
      {showDate ? <span className="match-fixture-date">{match.date}</span> : null}
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

