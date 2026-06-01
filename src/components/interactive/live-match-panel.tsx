"use client";

import { useMemo, useState } from "react";
import type { demoLiveMatch } from "@/lib/demo-data";

type LiveMatch = typeof demoLiveMatch;

type LiveMatchPanelProps = {
  match: LiveMatch;
};

const tacticalOptions = ["Push higher", "Hold possession", "Counter quickly", "Protect the lead"];

export function LiveMatchPanel({ match }: LiveMatchPanelProps) {
  const [muted, setMuted] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [homePrediction, setHomePrediction] = useState(match.homeTeam.score);
  const [awayPrediction, setAwayPrediction] = useState(match.awayTeam.score);
  const [submittedPrediction, setSubmittedPrediction] = useState<string | null>(null);
  const [selectedTactic, setSelectedTactic] = useState(tacticalOptions[0]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const votePercentages = useMemo(
    () =>
      tacticalOptions.map((option, index) => ({
        option,
        percent: option === selectedTactic ? 42 : [24, 19, 15][index] ?? 15
      })),
    [selectedTactic]
  );

  async function refreshDemoData() {
    await fetch("/api/demo", { cache: "no-store" });
    setLastRefresh(new Date());
  }

  return (
    <div className="live-card" aria-label="Interactive live match preview">
      <div className="live-card-header">
        <span className="live-dot" aria-hidden="true" />
        {match.minute}' {match.status}
      </div>
      <div className="score-row">
        <span>{match.homeTeam.name}</span>
        <strong>
          {match.homeTeam.score} - {match.awayTeam.score}
        </strong>
        <span>{match.awayTeam.name}</span>
      </div>
      <p className="match-venue">{match.venue}</p>

      <div className="live-actions" aria-label="Match controls">
        <button type="button" onClick={() => setPinned((value) => !value)}>
          {pinned ? "Pinned to home" : "Pin match"}
        </button>
        <button type="button" onClick={() => setMuted((value) => !value)}>
          {muted ? "Unmute toasts" : "Mute toasts"}
        </button>
        <button type="button" onClick={refreshDemoData}>
          Refresh demo feed
        </button>
      </div>

      {lastRefresh ? <p className="inline-status">Demo feed refreshed at {lastRefresh.toLocaleTimeString()}.</p> : null}

      <div className="match-stat-grid">
        {match.stats.map((stat) => (
          <div className="match-stat" key={stat.label}>
            <span>{stat.home}</span>
            <strong>{stat.label}</strong>
            <span>{stat.away}</span>
          </div>
        ))}
      </div>

      <form
        className="prediction-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedPrediction(`${match.homeTeam.name} ${homePrediction}-${awayPrediction} ${match.awayTeam.name}`);
        }}
      >
        <strong>Try a score prediction</strong>
        <div>
          <label>
            {match.homeTeam.code}
            <input
              min="0"
              max="20"
              type="number"
              value={homePrediction}
              onChange={(event) => setHomePrediction(Number(event.target.value))}
            />
          </label>
          <label>
            {match.awayTeam.code}
            <input
              min="0"
              max="20"
              type="number"
              value={awayPrediction}
              onChange={(event) => setAwayPrediction(Number(event.target.value))}
            />
          </label>
          <button type="submit">Submit</button>
        </div>
        {submittedPrediction ? <p className="inline-status">Submitted: {submittedPrediction}</p> : null}
      </form>

      <div className="vote-panel">
        <strong>Live tactical vote</strong>
        <div className="vote-options">
          {votePercentages.map((vote) => (
            <button
              className={vote.option === selectedTactic ? "selected" : ""}
              key={vote.option}
              type="button"
              onClick={() => setSelectedTactic(vote.option)}
            >
              <span>{vote.option}</span>
              <em>{vote.percent}%</em>
            </button>
          ))}
        </div>
      </div>

      <div className="timeline">
        {match.events.map((event) => (
          <div className="timeline-item" data-tone={event.tone} key={`${event.minute}-${event.type}`}>
            <span>{event.minute}</span>
            <div>
              <strong>{event.type}</strong>
              <p>{event.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
