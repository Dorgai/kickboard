"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { groupMatchesByLetter, inferTeamToGroup } from "@/lib/group-stage";
import { MatchTeamStatsGrid } from "@/components/match-team-stats-grid";
import { MatchEventTimelineLauncher } from "@/components/match-event-timeline-launcher";
import { MatchLineupList, type MatchLineupTeam } from "@/components/match-lineup-list";
import { PlayerStatsPanel } from "@/components/player-stats-panel";
import { CurrentEventTabs } from "@/components/current-event-tabs";
import { MatchTeamsLine, TeamLabel } from "@/components/team-label";
import {
  readLocationHash,
  scrollToLocationHashTarget,
  subscribeLocationHash
} from "@/lib/navigation/location-hash";
import { useLocationHash } from "@/lib/use-location-hash";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";

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

const PAST_EVENT_HASHES = new Set(["bracket", "squads", "players", "analytics"]);
const CURRENT_EVENT_HASHES = new Set([
  "tournament",
  "bracket",
  "coach-board",
  "fan-chat",
  "predictions",
  "community"
]);

export function FeedBrowser() {
  const mobileEventTabs = useNarrowViewport(860);
  const locationHash = useLocationHash();
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
      const hash = readLocationHash();
      if (hash && CURRENT_EVENT_HASHES.has(hash)) {
        setActiveTab("current");
        return;
      }
      if (hash && PAST_EVENT_HASHES.has(hash)) {
        setActiveTab("past");
      }
    }

    syncTabFromHash();
    return subscribeLocationHash(syncTabFromHash);
  }, []);

  useEffect(() => {
    if (activeTab !== "past" || loading) return;
    if (!locationHash || !PAST_EVENT_HASHES.has(locationHash)) return;
    scrollToLocationHashTarget(locationHash);
  }, [activeTab, loading, locationHash, bracketRounds.length, selectedMatchId]);

  useEffect(() => {
    if (activeTab !== "current" || loading) return;
    if (!locationHash || !CURRENT_EVENT_HASHES.has(locationHash)) return;
    scrollToLocationHashTarget(locationHash);
  }, [activeTab, loading, locationHash]);

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
    <div className="feed-browser feed-browser--hero-backdrop">
      <nav
        className="event-tab-bar kickboard-tab-bar feed-event-selector-tabs"
        aria-label="Tournament event selector"
      >
        <button
          className={activeTab === "current" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("current")}
        >
          {mobileEventTabs ? (
            <>
              Current
              <br />
              event
            </>
          ) : (
            "Current event"
          )}
        </button>
        <button
          className={activeTab === "past" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("past")}
        >
          {mobileEventTabs ? (
            <>
              Past
              <br />
              events
            </>
          ) : (
            "Past events"
          )}
        </button>
      </nav>

      {loading ? <p className="inline-status">Loading real feeds...</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}

      {activeTab === "current" ? (
        <CurrentEventTabs currentWorldCup={currentWorldCup} />
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

      <p className="kickboard-hero-credit">
        Background:{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Lamine_Yamal_in_2025_(cropped2).jpg"
          rel="noopener noreferrer"
          target="_blank"
        >
          Lamine Yamal (Spain)
        </a>{" "}
        by{" "}
        <a href="https://commons.wikimedia.org/wiki/User:Biso" rel="noopener noreferrer" target="_blank">
          Biso
        </a>{" "}
        /{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer" target="_blank">
          CC BY 4.0
        </a>
      </p>
    </div>
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
  const groupStageName = "Group Stage";
  const [activeGroupLetter, setActiveGroupLetter] = useState("A");
  const [activeCompetitionStage, setActiveCompetitionStage] = useState("");

  const competitionStageTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string }> = [];
    if (groupBuckets.length) {
      tabs.push({ id: groupStageName, label: groupStageName });
    }
    for (const round of bracketRounds) {
      tabs.push({ id: round.stage, label: round.stage });
    }
    return tabs;
  }, [bracketRounds, groupBuckets.length, groupStageName]);

  useEffect(() => {
    if (groupBuckets.length && !groupBuckets.some((bucket) => bucket.letter === activeGroupLetter)) {
      setActiveGroupLetter(groupBuckets[0].letter);
    }
  }, [activeGroupLetter, groupBuckets]);

  useEffect(() => {
    if (!competitionStageTabs.length) return;
    if (
      !activeCompetitionStage ||
      !competitionStageTabs.some((tab) => tab.id === activeCompetitionStage)
    ) {
      setActiveCompetitionStage(competitionStageTabs[0].id);
    }
  }, [activeCompetitionStage, competitionStageTabs]);

  const isGroupStageView = activeCompetitionStage === groupStageName;
  const activeKnockoutRound = bracketRounds.find((round) => round.stage === activeCompetitionStage);

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

  const activeKnockoutFixtures = useMemo(() => {
    if (!activeKnockoutRound) return [];
    if (activeKnockoutRound.clusters?.length) {
      return activeKnockoutRound.clusters.flatMap((cluster) => cluster.matches);
    }
    return activeKnockoutRound.matches;
  }, [activeKnockoutRound]);

  const activeGroupFixtures = useMemo(
    () => groupBuckets.find((bucket) => bucket.letter === activeGroupLetter)?.matches ?? [],
    [activeGroupLetter, groupBuckets]
  );

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
    if (match?.stage) {
      setActiveCompetitionStage(match.stage);
    }
    if (match?.stage === groupStageName) {
      const letter = teamToGroup.get(match.homeTeam) ?? teamToGroup.get(match.awayTeam);
      if (letter) setActiveGroupLetter(letter);
    }
    setSelectedMatchId(matchId);
    setSelectedPlayerId(null);
  }

  const matchDetailColumn =
    selectedMatch && matchDetail ? (
      <article className="data-card surface-muted match-focus-col match-detail-widget">
        <header className="match-focus-scoreline">
          <p className="eyebrow">{selectedMatch.stage ?? "Match"}</p>
          <MatchTeamsLine
            awayScore={selectedMatch.awayScore}
            awayTeam={selectedMatch.awayTeam}
            homeScore={selectedMatch.homeScore}
            homeTeam={selectedMatch.homeTeam}
            layout="inline"
            size="sm"
          />
          <p className="match-focus-meta">
            {selectedMatch.date}
            {selectedMatch.stadium ? ` · ${selectedMatch.stadium}` : ""}
          </p>
        </header>
        <MatchTeamStatsGrid columns={orderedTeamStats} />
      </article>
    ) : selectedMatch ? (
      <article className="data-card surface-muted match-focus-col match-detail-widget">
        <header className="match-focus-scoreline">
          <p className="eyebrow">{selectedMatch.stage ?? "Match"}</p>
          <MatchTeamsLine
            awayScore={selectedMatch.awayScore}
            awayTeam={selectedMatch.awayTeam}
            homeScore={selectedMatch.homeScore}
            homeTeam={selectedMatch.homeTeam}
            layout="inline"
            size="sm"
          />
          <p className="match-focus-meta">
            {selectedMatch.date}
            {selectedMatch.stadium ? ` · ${selectedMatch.stadium}` : ""}
          </p>
        </header>
        <p className="inline-status">Loading match stats…</p>
      </article>
    ) : null;

  const stageFixturesPanel =
    isGroupStageView && groupBuckets.length ? (
      activeGroupFixtures.length ? (
        <StageFixtureStrip
          fixtures={activeGroupFixtures}
          selectedMatchId={selectedMatchId}
          onSelect={selectMatch}
        />
      ) : (
        <p className="inline-status">No fixtures for this group.</p>
      )
    ) : activeKnockoutRound ? (
      activeKnockoutFixtures.length ? (
        <StageFixtureStrip
          fixtures={activeKnockoutFixtures}
          round={activeKnockoutRound}
          selectedMatchId={selectedMatchId}
          onSelect={selectMatch}
        />
      ) : (
        <p className="inline-status">No fixtures for this stage.</p>
      )
    ) : competitionStageTabs.length ? (
      <p className="inline-status">No fixtures for this stage.</p>
    ) : (
      <p className="inline-status">No stages in this feed.</p>
    );

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
            {competitionStageTabs.length ? (
              <FeedTabBar
                ariaLabel="Competition stages"
                className="bracket-stage-tabs"
                tabs={competitionStageTabs}
                value={activeCompetitionStage}
                onChange={setActiveCompetitionStage}
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
          {isGroupStageView && groupBuckets.length ? (
            <FeedTabBar
              ariaLabel="Group stage groups"
              className="bracket-group-tabs bracket-stage-tabs"
              tabs={groupBuckets.map((bucket) => ({
                id: bucket.letter,
                label: `Group ${bucket.letter}`
              }))}
              value={activeGroupLetter}
              onChange={setActiveGroupLetter}
            />
          ) : null}
        </section>

        <div className="knockout-widgets knockout-widgets--below-strip" id="match-detail-panel">
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

          {!showMatchesList ? (
            <div className="knockout-widgets-row knockout-widgets-row--fixtures-detail">
              <div className="match-stage-fixtures-column data-card surface-muted">{stageFixturesPanel}</div>
              {selectedMatch ? (
                matchDetailColumn
              ) : (
                <article className="data-card surface-flat match-focus-col match-placeholder">
                  <h2>Select a match</h2>
                  <p>Pick a fixture beside this panel to load match details.</p>
                </article>
              )}
            </div>
          ) : null}

          {showMatchesList && selectedMatch ? (
            <div className="knockout-widgets-row knockout-widgets-row--primary">{matchDetailColumn}</div>
          ) : null}

          {selectedMatch && matchDetail ? (
            <div className="knockout-widgets-row knockout-widgets-row--squads-pair">
              <article className="data-card surface-muted match-focus-col match-lineups-column" id="squads">
                <div className="section-heading compact match-lineups-heading">
                  <div>
                    <h3>Lineups</h3>
                    <p className="match-lineups-note">Select a player to view stats beside.</p>
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
                  compact
                  layout={filteredLineups.length === 2 ? "paired" : "stacked"}
                  selectedPlayerId={selectedPlayerId}
                  teams={filteredLineups}
                  onSelectPlayer={setSelectedPlayerId}
                />
              </article>

              <article
                className="data-card surface-muted match-focus-col match-player-stats-column"
                id="players"
              >
                {matchDetail.playerStats.length > 0 ? (
                  <PlayerStatsPanel
                    compact
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
            </div>
          ) : null}
        </div>
      </div>

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

function StageFixtureStrip({
  fixtures,
  onSelect,
  round,
  selectedMatchId
}: {
  fixtures: Match[];
  onSelect: (matchId: number) => void;
  round?: BracketRound;
  selectedMatchId: number | null;
}) {
  return (
    <div className="bracket-stage-panel">
      <div aria-label="Fixtures for selected stage" className="bracket-fixture-strip match-stage-fixtures" role="list">
        {fixtures.map((match) => (
          <BracketMatchButton
            key={match.matchId}
            clusterLabel={round ? knockoutClusterLabel(round, match.matchId) : undefined}
            match={match}
            selectedMatchId={selectedMatchId}
            variant="strip"
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function BracketMatchButton({
  clusterLabel,
  match,
  onSelect,
  selectedMatchId,
  showDate = true,
  teamsLayout = "inline",
  variant = "default"
}: {
  clusterLabel?: string;
  match: Match;
  onSelect: (matchId: number) => void;
  selectedMatchId: number | null;
  showDate?: boolean;
  teamsLayout?: "inline" | "stacked";
  variant?: "default" | "strip";
}) {
  const title = [clusterLabel, match.date, match.stadium].filter(Boolean).join(" · ");
  const selected = selectedMatchId === match.matchId;

  if (variant === "strip") {
    return (
      <button
        className={`match-fixture-btn match-fixture-btn--strip-card${
          clusterLabel ? " match-fixture-btn--with-cluster" : ""
        }${selected ? " selected" : ""}`}
        role="listitem"
        title={title}
        type="button"
        onClick={() => onSelect(match.matchId)}
      >
        {clusterLabel ? <span className="match-fixture-cluster">{clusterLabel}</span> : null}
        <MatchTeamsLine
          awayScore={match.awayScore}
          awayTeam={match.awayTeam}
          homeScore={match.homeScore}
          homeTeam={match.homeTeam}
          layout="inline"
          size="xs"
        />
      </button>
    );
  }

  return (
    <button
      className={`match-fixture-btn match-fixture-btn--compact match-fixture-btn--teams-${teamsLayout}${
        clusterLabel ? " match-fixture-btn--with-cluster" : ""
      }${selected ? " selected" : ""}`}
      title={title}
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

function SummaryTile({
  label,
  value,
  compact = false
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`summary-tile${compact ? " summary-tile--compact" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

