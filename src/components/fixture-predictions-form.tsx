"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast-provider";
import { HelpTooltip } from "@/components/help-tooltip";
import { PredictionShareButtons } from "@/components/prediction-share-buttons";
import type { PredictionSharePayload } from "@/lib/predictions/share";
import { TeamLabel } from "@/components/team-label";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { teamsMatch } from "@/lib/squads/team-names";
import {
  PREDICTION_BLOCKS,
  PREDICTION_HINTS,
  PREDICTION_OUTCOME_OPTION
} from "@/lib/fixture-predictions/labels";
import { notifyPredictionActivity } from "@/lib/fixture-predictions/activity-events";
import { celebratePredictionSubmit } from "@/lib/predictions/submit-celebration";
import { PREDICTION_OUTCOME_SECTION_ID } from "@/lib/scroll-to-prediction-outcome";
import {
  groupScorerPicks,
  MAX_SCORER_PICKS,
  outcomeFromScores,
  outcomeLabel,
  outcomeShort,
  type FixtureOutcome,
  type FixturePredictionRecord,
  type ScorerPick
} from "@/lib/fixture-predictions/types";
import { useClearOnFocusInput } from "@/lib/use-clear-on-focus-input";

type FixturePredictionsFormProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
  coachBoard?: boolean;
  onSaved?: (change?: string) => void;
};

const OUTCOME_OPTIONS: {
  value: FixtureOutcome;
  label: string;
  team?: "home" | "away";
}[] = [
  { value: "home", label: PREDICTION_OUTCOME_OPTION.home, team: "home" },
  { value: "draw", label: PREDICTION_OUTCOME_OPTION.draw },
  { value: "away", label: PREDICTION_OUTCOME_OPTION.away, team: "away" }
];

export function FixturePredictionsForm({
  fixtureKey,
  homeTeam,
  awayTeam,
  compact = false,
  coachBoard = false,
  onSaved
}: FixturePredictionsFormProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [hasSavedPick, setHasSavedPick] = useState(false);
  const [predictedOutcome, setPredictedOutcome] = useState<FixtureOutcome | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [scorerPicks, setScorerPicks] = useState<ScorerPick[]>([]);
  const [players, setPlayers] = useState<SquadPoolPlayer[]>([]);
  const [scorerSearch, setScorerSearch] = useState("");
  const [scorersExpanded, setScorersExpanded] = useState(false);
  const scorerSearchRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
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
          setHasSavedPick(true);
        } else {
          setPredictedOutcome(null);
          setHomeScore("");
          setAwayScore("");
          setScorerPicks([]);
          setHasSavedPick(false);
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
    if (scorersExpanded) {
      scorerSearchRef.current?.focus();
    }
  }, [scorersExpanded]);

  useEffect(() => {
    let cancelled = false;
    async function loadPool() {
      setPoolLoading(true);
      try {
        const params = new URLSearchParams({ homeTeam, awayTeam, fixtureKey });
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

  function clearScores() {
    const derived = outcomeFromScores(homeScore, awayScore);
    setHomeScore("");
    setAwayScore("");
    if (derived && predictedOutcome === derived) {
      setPredictedOutcome(null);
    }
  }

  const groupedScorerPicks = useMemo(() => groupScorerPicks(scorerPicks), [scorerPicks]);

  const homeScoreInput = useClearOnFocusInput(homeScore, setHomeScore);
  const awayScoreInput = useClearOnFocusInput(awayScore, setAwayScore);

  const scoreDerivedOutcome = useMemo(
    () => outcomeFromScores(homeScore, awayScore),
    [awayScore, homeScore]
  );

  useEffect(() => {
    if (scoreDerivedOutcome) {
      setPredictedOutcome(scoreDerivedOutcome);
    }
  }, [scoreDerivedOutcome]);

  const sharePayload = useMemo((): PredictionSharePayload | null => {
    const hasScore = homeScore !== "" && awayScore !== "";
    if (!predictedOutcome && !hasScore && scorerPicks.length === 0) return null;
    return {
      v: 1,
      fixtureKey,
      fixtureLabel: `${homeTeam} vs ${awayTeam}`,
      homeTeam,
      awayTeam,
      predictedOutcome,
      homeScore: hasScore ? Number(homeScore) : null,
      awayScore: hasScore ? Number(awayScore) : null,
      scorerPicks: coachBoard ? [] : scorerPicks,
      displayName: session?.user?.name ?? null
    };
  }, [
    awayScore,
    awayTeam,
    coachBoard,
    fixtureKey,
    homeScore,
    homeTeam,
    predictedOutcome,
    scorerPicks,
    session?.user?.name
  ]);

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
          ...(coachBoard ? {} : { scorerPicks })
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        change?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save picks.");
      const change = payload.change ?? "updated";
      setNotice(payload.message ?? "Saved");
      setHasSavedPick(true);
      showToast({
        message: payload.message ?? "Picks saved.",
        variant: change === "unchanged" ? "info" : "success"
      });
      if (change !== "unchanged") {
        celebratePredictionSubmit(submitRef.current);
      }
      onSaved?.(change);
      notifyPredictionActivity();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save picks.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAllPicks() {
    if (!hasSavedPick) return;
    if (!window.confirm("Remove all picks for this match? Connections will be notified.")) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/fixture-predictions?${params}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string; change?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to remove picks.");
      setPredictedOutcome(null);
      setHomeScore("");
      setAwayScore("");
      setScorerPicks([]);
      setHasSavedPick(false);
      setNotice(payload.message ?? "Removed");
      showToast({
        message: payload.message ?? "Picks removed.",
        variant: "warning"
      });
      onSaved?.(payload.change ?? "deleted");
      notifyPredictionActivity();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove picks.");
      showToast({
        message: removeError instanceof Error ? removeError.message : "Unable to remove picks.",
        variant: "warning"
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`fixture-predictions-form${compact ? " fixture-predictions-form--compact" : ""}${coachBoard ? " fixture-predictions-form--coach-board" : ""}`}
      onSubmit={savePick}
    >
      <fieldset
        className="fixture-prediction-field section-anchor"
        id={coachBoard ? undefined : PREDICTION_OUTCOME_SECTION_ID}
      >
        <legend className="fixture-prediction-field-label fixture-prediction-field-label--with-help">
          {PREDICTION_BLOCKS.outcome}
          <HelpTooltip label="Who wins help" size="sm">
            {PREDICTION_HINTS.outcomeEmpty}
          </HelpTooltip>
        </legend>
        <div className="fixture-prediction-outcome-list" role="radiogroup" aria-label={PREDICTION_BLOCKS.outcome}>
          {OUTCOME_OPTIONS.map((option) => {
            const teamName = option.team === "home" ? homeTeam : option.team === "away" ? awayTeam : null;
            const selected = predictedOutcome === option.value;
            const disabledByScore =
              scoreDerivedOutcome !== null && scoreDerivedOutcome !== option.value;
            return (
              <label
                key={option.value}
                className={`fixture-prediction-outcome-option${selected ? " is-selected" : ""}${
                  disabledByScore ? " is-disabled" : ""
                }`}
              >
                <input
                  checked={selected}
                  className="fixture-prediction-outcome-input"
                  disabled={disabledByScore}
                  name={`fixture-outcome-${fixtureKey}`}
                  type="radio"
                  value={option.value}
                  onChange={() => setPredictedOutcome(option.value)}
                />
                <span className="fixture-prediction-outcome-body">
                  {teamName ? (
                    <TeamLabel layout="stacked" name={teamName} size={compact ? "xs" : "md"} />
                  ) : null}
                  <span className="fixture-prediction-outcome-text">
                    {teamName ? option.label : outcomeShort(option.value)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="fixture-prediction-field-actions">
          {predictedOutcome ? (
            <p className="fixture-prediction-field-summary">
              {outcomeLabel(predictedOutcome, homeTeam, awayTeam)}
            </p>
          ) : null}
          <button
            className="text-button fixture-prediction-clear"
            disabled={!predictedOutcome || scoreDerivedOutcome !== null}
            title={
              scoreDerivedOutcome !== null
                ? "Clear the score to change who wins"
                : undefined
            }
            type="button"
            onClick={() => setPredictedOutcome(null)}
          >
            Clear
          </button>
        </div>
      </fieldset>

      <fieldset className="fixture-prediction-field">
        <legend className="fixture-prediction-field-label fixture-prediction-field-label--with-help">
          {PREDICTION_BLOCKS.score}
          <HelpTooltip label="Final score help" size="sm">
            {PREDICTION_HINTS.scoreOptional}
          </HelpTooltip>
        </legend>
        <div className="fixture-prediction-scoreline" role="group" aria-label={PREDICTION_BLOCKS.score}>
          <div className="fixture-prediction-score-team">
            <TeamLabel
              layout={compact ? "inline" : "stacked"}
              name={homeTeam}
              size={compact ? "xs" : "md"}
            />
            <input
              aria-label={`${homeTeam} goals`}
              className="fixture-prediction-score-field"
              inputMode="numeric"
              max={20}
              min={0}
              placeholder="0"
              type="number"
              value={homeScore}
              onBlur={homeScoreInput.onBlur}
              onChange={(event) => setHomeScore(event.target.value)}
              onFocus={homeScoreInput.onFocus}
            />
          </div>
          <span aria-hidden className="fixture-prediction-score-dash">
            –
          </span>
          <div className="fixture-prediction-score-team">
            <TeamLabel
              layout={compact ? "inline" : "stacked"}
              name={awayTeam}
              size={compact ? "xs" : "md"}
            />
            <input
              aria-label={`${awayTeam} goals`}
              className="fixture-prediction-score-field"
              inputMode="numeric"
              max={20}
              min={0}
              placeholder="0"
              type="number"
              value={awayScore}
              onBlur={awayScoreInput.onBlur}
              onChange={(event) => setAwayScore(event.target.value)}
              onFocus={awayScoreInput.onFocus}
            />
          </div>
        </div>
        <div className="fixture-prediction-field-actions">
          <button
            className="text-button fixture-prediction-clear"
            disabled={!homeScore && !awayScore}
            type="button"
            onClick={clearScores}
          >
            Clear
          </button>
        </div>
      </fieldset>

      {!coachBoard ? (
        <fieldset className="fixture-prediction-field fixture-prediction-field--scorers">
          <legend className="sr-only">{PREDICTION_BLOCKS.scorers}</legend>
          <button
            aria-controls="fixture-scorers-picker"
            aria-expanded={scorersExpanded}
            aria-label={
              scorersExpanded
                ? `${PREDICTION_BLOCKS.scorers} — ${PREDICTION_HINTS.scorersHideList}`
                : `${PREDICTION_BLOCKS.scorers} — ${PREDICTION_HINTS.scorersShowList}`
            }
            className={`fixture-prediction-scorers-toggle${
              scorersExpanded ? "" : " fixture-prediction-scorers-toggle--collapsed"
            }`}
            type="button"
            onClick={() => setScorersExpanded((open) => !open)}
          >
            <span className="fixture-prediction-scorers-toggle-copy">
              <span className="fixture-prediction-scorers-toggle-title fixture-prediction-field-label--with-help">
                {PREDICTION_BLOCKS.scorers}
                <HelpTooltip
                  label="Goal scorers help"
                  size="sm"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {PREDICTION_HINTS.scorersLead}.{" "}
                  {scorersExpanded ? PREDICTION_HINTS.scorersHideList : PREDICTION_HINTS.scorersShowList}
                </HelpTooltip>
              </span>
            </span>
            <span aria-hidden className="fixture-prediction-scorers-chevron" />
          </button>
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
                      <span aria-hidden className="fixture-scorer-chip-goals-value">
                        {goals}
                      </span>
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
          {scorersExpanded ? (
            <div className="fixture-prediction-scorers-panel" id="fixture-scorers-picker">
              <input
                ref={scorerSearchRef}
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
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <div className="fixture-prediction-form-footer">
        <div className="fixture-prediction-form-actions">
          <button
            ref={submitRef}
            className="button primary fixture-prediction-save"
            disabled={busy || loading}
            type="submit"
          >
            {busy ? "Saving…" : PREDICTION_HINTS.saveButton}
          </button>
          {hasSavedPick ? (
            <button
              className="button secondary fixture-prediction-remove"
              disabled={busy || loading}
              type="button"
              onClick={() => void removeAllPicks()}
            >
              Remove all picks
            </button>
          ) : null}
        </div>
        {notice ? <span className="fixture-prediction-notice">{notice}</span> : null}
        {error ? <span className="fixture-prediction-error">{error}</span> : null}
      </div>

      {sharePayload && !loading ? (
        <PredictionShareButtons disabled={busy} payload={sharePayload} />
      ) : null}
    </form>
  );
}
