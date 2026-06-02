"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TeamLabel } from "@/components/team-label";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { teamsMatch } from "@/lib/squads/team-names";
import {
  groupScorerPicks,
  MAX_SCORER_PICKS,
  outcomeLabel,
  outcomeShort,
  type FixtureOutcome,
  type FixturePredictionRecord,
  type ScorerPick
} from "@/lib/fixture-predictions/types";

type FixturePredictionsFormProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
  coachBoard?: boolean;
  onSaved?: () => void;
};

export function FixturePredictionsForm({
  fixtureKey,
  homeTeam,
  awayTeam,
  compact = false,
  coachBoard = false,
  onSaved
}: FixturePredictionsFormProps) {
  const [predictedOutcome, setPredictedOutcome] = useState<FixtureOutcome | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [scorerPicks, setScorerPicks] = useState<ScorerPick[]>([]);
  const [players, setPlayers] = useState<SquadPoolPlayer[]>([]);
  const [scorerSearch, setScorerSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [poolLoading, setPoolLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/fixture-predictions?${params}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { prediction?: FixturePredictionRecord | null };
        const prediction = payload.prediction;
        if (prediction) {
          setPredictedOutcome(prediction.predictedOutcome);
          setHomeScore(prediction.homeScore !== null ? String(prediction.homeScore) : "");
          setAwayScore(prediction.awayScore !== null ? String(prediction.awayScore) : "");
          setScorerPicks(prediction.scorerPicks);
        } else {
          setPredictedOutcome(null);
          setHomeScore("");
          setAwayScore("");
          setScorerPicks([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fixtureKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadPool() {
      setPoolLoading(true);
      try {
        const params = new URLSearchParams({ homeTeam, awayTeam });
        const response = await fetch(`/api/squads/player-pool?${params}`);
        if (!cancelled && response.ok) {
          const payload = (await response.json()) as {
            players?: SquadPoolPlayer[];
            homePlayers?: SquadPoolPlayer[];
            awayPlayers?: SquadPoolPlayer[];
          };
          const combined = [
            ...(payload.homePlayers ?? []),
            ...(payload.awayPlayers ?? []),
            ...(payload.players ?? [])
          ];
          const byId = new Map<number, SquadPoolPlayer>();
          for (const player of combined) {
            if (!byId.has(player.playerId)) byId.set(player.playerId, player);
          }
          setPlayers(Array.from(byId.values()));
        }
      } finally {
        if (!cancelled) setPoolLoading(false);
      }
    }
    void loadPool();
    return () => {
      cancelled = true;
    };
  }, [awayTeam, homeTeam]);

  const filteredPlayers = useMemo(() => {
    const query = scorerSearch.trim().toLowerCase();
    return players.filter((player) => {
      if (!query) return true;
      return (
        player.name.toLowerCase().includes(query) ||
        player.teamName.toLowerCase().includes(query)
      );
    });
  }, [players, scorerSearch]);

  function scorerCount(playerId: number) {
    return scorerPicks.filter((pick) => pick.playerId === playerId).length;
  }

  function addScorerGoal(player: SquadPoolPlayer) {
    const teamSide = teamsMatch(player.teamName, homeTeam) ? "home" : "away";
    setScorerPicks((current) => {
      if (current.length >= MAX_SCORER_PICKS) return current;
      return [
        ...current,
        {
          playerId: player.playerId,
          playerName: player.name,
          teamSide
        }
      ];
    });
  }

  function addScorerGoalFromPick(pick: ScorerPick) {
    setScorerPicks((current) => {
      if (current.length >= MAX_SCORER_PICKS) return current;
      return [...current, pick];
    });
  }

  function removeOneScorerGoal(playerId: number) {
    setScorerPicks((current) => {
      const index = current.findIndex((pick) => pick.playerId === playerId);
      if (index === -1) return current;
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }

  const groupedScorerPicks = useMemo(() => groupScorerPicks(scorerPicks), [scorerPicks]);

  async function savePick(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const hasScore = homeScore !== "" || awayScore !== "";
      const response = await fetch("/api/fixture-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureKey,
          predictedOutcome,
          homeScore: hasScore ? Number(homeScore) : null,
          awayScore: hasScore ? Number(awayScore) : null,
          ...(compact ? {} : { scorerPicks })
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save picks.");
      setNotice("Saved");
      onSaved?.();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save picks.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`fixture-predictions-form${compact ? " fixture-predictions-form--compact" : ""}${coachBoard ? " fixture-predictions-form--coach-board" : ""}`}
      onSubmit={savePick}
    >
      <section className="fixture-prediction-section">
        <h4 className="fixture-prediction-section-title">1 · Winner or draw</h4>
        <div className="fixture-prediction-choices" role="group" aria-label="Match outcome">
          {(["home", "draw", "away"] as const).map((value) => (
            <button
              key={value}
              className={`fixture-prediction-choice${predictedOutcome === value ? " fixture-prediction-choice--active" : ""}`}
              type="button"
              onClick={() => setPredictedOutcome(value)}
            >
              <span className="fixture-prediction-choice-label">
                {value === "home" ? <TeamLabel name={homeTeam} size="xs" /> : null}
                {value === "away" ? <TeamLabel name={awayTeam} size="xs" /> : null}
                {value === "draw" ? "Draw" : outcomeShort(value)}
              </span>
            </button>
          ))}
          <button
            className="fixture-prediction-choice fixture-prediction-choice--clear"
            type="button"
            onClick={() => setPredictedOutcome(null)}
          >
            Clear
          </button>
        </div>
        {predictedOutcome ? (
          <p className="fixture-prediction-section-note">{outcomeLabel(predictedOutcome, homeTeam, awayTeam)}</p>
        ) : null}
      </section>

      <section className="fixture-prediction-section">
        <h4 className="fixture-prediction-section-title">2 · Exact score</h4>
        <div className="fixture-prediction-choices fixture-prediction-choices--score" role="group" aria-label="Predicted score">
          <label className="fixture-prediction-choice fixture-prediction-choice--score">
            <span className="fixture-prediction-choice-label">
              <TeamLabel name={homeTeam} size="xs" />
            </span>
            <input
              aria-label={`${homeTeam} goals`}
              className="fixture-prediction-score-input"
              inputMode="numeric"
              max={20}
              min={0}
              placeholder="—"
              type="number"
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
            />
          </label>
          <span aria-hidden className="fixture-prediction-score-separator">
            :
          </span>
          <label className="fixture-prediction-choice fixture-prediction-choice--score">
            <span className="fixture-prediction-choice-label">
              <TeamLabel name={awayTeam} size="xs" />
            </span>
            <input
              aria-label={`${awayTeam} goals`}
              className="fixture-prediction-score-input"
              inputMode="numeric"
              max={20}
              min={0}
              placeholder="—"
              type="number"
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
            />
          </label>
        </div>
      </section>

      {!compact ? (
        <section className="fixture-prediction-section">
          <h4 className="fixture-prediction-section-title">3 · Goal scorers</h4>
          <p className="fixture-prediction-section-note">
            Pick up to {MAX_SCORER_PICKS} goals (tap a player to add; same player can score more than
            once).
          </p>
          {groupedScorerPicks.length > 0 ? (
            <ul className="fixture-scorer-selected">
              {groupedScorerPicks.map(({ pick, goals }) => (
                <li key={pick.playerId}>
                  <div className="fixture-scorer-chip fixture-scorer-chip--selected">
                    <span className="fixture-scorer-chip-name">
                      {pick.playerName}
                      {goals > 1 ? (
                        <span className="fixture-scorer-chip-count"> ×{goals}</span>
                      ) : null}
                    </span>
                    <span className="fixture-scorer-chip-side">
                      {pick.teamSide === "home" ? homeTeam : awayTeam}
                    </span>
                    <span className="fixture-scorer-chip-actions">
                      <button
                        aria-label={`Remove one goal for ${pick.playerName}`}
                        className="fixture-scorer-step"
                        disabled={busy}
                        type="button"
                        onClick={() => removeOneScorerGoal(pick.playerId)}
                      >
                        −
                      </button>
                      <button
                        aria-label={`Add one goal for ${pick.playerName}`}
                        className="fixture-scorer-step"
                        disabled={busy || scorerPicks.length >= MAX_SCORER_PICKS}
                        type="button"
                        onClick={() => addScorerGoalFromPick(pick)}
                      >
                        +
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            aria-label="Search scorers"
            className="feed-control-input"
            placeholder="Search players"
            value={scorerSearch}
            onChange={(event) => setScorerSearch(event.target.value)}
          />
          {poolLoading ? <p className="inline-status">Loading players…</p> : null}
          <ul className="fixture-scorer-pool-list">
            {filteredPlayers.slice(0, 40).map((player) => {
              const goals = scorerCount(player.playerId);
              return (
                <li key={player.playerId}>
                  <button
                    className={`fixture-scorer-chip${goals > 0 ? " fixture-scorer-chip--selected" : ""}`}
                    disabled={scorerPicks.length >= MAX_SCORER_PICKS}
                    type="button"
                    onClick={() => addScorerGoal(player)}
                  >
                    <span className="fixture-scorer-chip-name">
                      {player.name}
                      {goals > 0 ? (
                        <span className="fixture-scorer-chip-count"> ×{goals}</span>
                      ) : null}
                    </span>
                    <span className="fixture-scorer-chip-side">{player.teamName}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <button className="button primary fixture-prediction-save" disabled={busy || loading} type="submit">
        {busy ? "Saving…" : "Save predictions"}
      </button>

      {notice ? <span className="fixture-prediction-notice">{notice}</span> : null}
      {error ? <span className="fixture-prediction-error">{error}</span> : null}
    </form>
  );
}
