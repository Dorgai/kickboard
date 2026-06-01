"use client";

import { useMemo, useState } from "react";
import type { demoLeaderboard, demoMatches, demoSquad, demoTopScorers } from "@/lib/demo-data";

type Match = (typeof demoMatches)[number];
type Scorer = (typeof demoTopScorers)[number];
type Leader = (typeof demoLeaderboard)[number];
type Squad = typeof demoSquad;

type MatchDataPanelProps = {
  matches: Match[];
  topScorers: Scorer[];
  leaderboard: Leader[];
  squad: Squad;
};

type FixtureFilter = "All" | "Upcoming" | "Completed";
type LeaderboardSort = "points" | "accuracy";

export function MatchDataPanel({ matches, topScorers, leaderboard, squad }: MatchDataPanelProps) {
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>("All");
  const [scorerSort, setScorerSort] = useState<"goals" | "rating">("goals");
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>("points");
  const [squadSearch, setSquadSearch] = useState("");

  const filteredMatches = fixtureFilter === "All" ? matches : matches.filter((match) => match.status === fixtureFilter);

  const sortedScorers = useMemo(
    () =>
      [...topScorers].sort((a, b) =>
        scorerSort === "goals" ? b.goals - a.goals : Number(b.rating) - Number(a.rating)
      ),
    [scorerSort, topScorers]
  );

  const sortedLeaderboard = useMemo(
    () =>
      [...leaderboard].sort((a, b) =>
        leaderboardSort === "points"
          ? b.points - a.points
          : Number(b.accuracy.replace("%", "")) - Number(a.accuracy.replace("%", ""))
      ),
    [leaderboard, leaderboardSort]
  );

  const visiblePlayers = squad.players.filter((player) =>
    `${player.name} ${player.team} ${player.slot}`.toLowerCase().includes(squadSearch.toLowerCase())
  );

  return (
    <div className="data-grid">
      <article className="data-card">
        <div className="data-card-header">
          <h3>Fixtures</h3>
          <select value={fixtureFilter} onChange={(event) => setFixtureFilter(event.target.value as FixtureFilter)}>
            <option>All</option>
            <option>Upcoming</option>
            <option>Completed</option>
          </select>
        </div>
        {filteredMatches.map((match) => (
          <div className="fixture-row" key={match.id}>
            <div>
              <strong>
                {match.homeTeam} vs {match.awayTeam}
              </strong>
              <p>{match.venue}</p>
            </div>
            <span>{match.score ? `${match.score} ${match.status}` : `${match.kickoff} ${match.status}`}</span>
          </div>
        ))}
      </article>

      <article className="data-card">
        <div className="data-card-header">
          <h3>Top scorers</h3>
          <select value={scorerSort} onChange={(event) => setScorerSort(event.target.value as "goals" | "rating")}>
            <option value="goals">Goals</option>
            <option value="rating">Rating</option>
          </select>
        </div>
        {sortedScorers.map((player, index) => (
          <div className="table-row" key={player.name}>
            <span>{index + 1}</span>
            <strong>{player.name}</strong>
            <span>{player.team}</span>
            <span>{scorerSort === "goals" ? `${player.goals} goals` : `${player.rating} rating`}</span>
          </div>
        ))}
      </article>

      <article className="data-card">
        <div className="data-card-header">
          <h3>Leaderboard</h3>
          <select value={leaderboardSort} onChange={(event) => setLeaderboardSort(event.target.value as LeaderboardSort)}>
            <option value="points">Points</option>
            <option value="accuracy">Accuracy</option>
          </select>
        </div>
        {sortedLeaderboard.map((user, index) => (
          <div className="table-row" key={user.username}>
            <span>#{index + 1}</span>
            <strong>{user.username}</strong>
            <span>{user.points} pts</span>
            <span>{user.accuracy}</span>
          </div>
        ))}
      </article>

      <article className="data-card squad-data-card">
        <div className="data-card-header">
          <h3>{squad.name}</h3>
          <input
            aria-label="Search squad players"
            placeholder="Search player, team or slot"
            type="search"
            value={squadSearch}
            onChange={(event) => setSquadSearch(event.target.value)}
          />
        </div>
        <p>Formation: {squad.formation}</p>
        <div className="squad-card compact" aria-label="Interactive squad preview">
          {visiblePlayers.map((player) => (
            <div className="squad-player-row" key={`${player.slot}-${player.name}`}>
              <span>{player.slot}</span>
              <strong>{player.name}</strong>
              <small>{player.team}</small>
              <em>{player.rating}</em>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
