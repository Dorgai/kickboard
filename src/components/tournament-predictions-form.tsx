"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { HelpTooltip, PanelHelpRow } from "@/components/help-tooltip";
import { TeamLabel } from "@/components/team-label";
import { useToast } from "@/components/toast-provider";
import {
  TOURNAMENT_PREDICTION_BLOCKS,
  TOURNAMENT_PREDICTION_HINTS
} from "@/lib/tournament-predictions/labels";
import { teamsFromWorldCupGroups, type WorldCupGroupInput } from "@/lib/tournament-predictions/teams";
import {
  DEFAULT_TOURNAMENT_KEY,
  finalOpponentFromRecord,
  predictedFinalistsFromPicks
} from "@/lib/tournament-predictions/types";
import type { TournamentPlayerPick, TournamentPredictionRecord } from "@/lib/tournament-predictions/types";
import { teamsMatch } from "@/lib/squads/team-names";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";

type TournamentPredictionsFormProps = {
  groups?: WorldCupGroupInput[];
  onSaved?: () => void;
};

function applyRecordToState(record: TournamentPredictionRecord | null) {
  return {
    champion: record?.predictedChampion ?? null,
    opponent: finalOpponentFromRecord(record),
    topScorer: record?.predictedTopScorer ?? null,
    bestPlayer: record?.predictedBestPlayer ?? null,
    hasSaved: Boolean(record)
  };
}

function TeamPickGrid({
  teams,
  selected,
  name,
  onSelect
}: {
  teams: string[];
  selected: string | null;
  name: string;
  onSelect: (team: string | null) => void;
}) {
  return (
    <div className="tournament-team-pick-grid" role="radiogroup" aria-label={name}>
      {teams.map((team) => {
        const isSelected = selected === team;
        return (
          <label
            key={team}
            className={`fixture-prediction-outcome-option tournament-team-pick-option${
              isSelected ? " is-selected" : ""
            }`}
          >
            <input
              checked={isSelected}
              className="fixture-prediction-outcome-input"
              name={name}
              type="radio"
              value={team}
              onChange={() => onSelect(team)}
            />
            <span className="fixture-prediction-outcome-body">
              <TeamLabel layout="stacked" name={team} size="xs" />
            </span>
          </label>
        );
      })}
    </div>
  );
}

function SinglePlayerPickField({
  blockLabel,
  help,
  selected,
  players,
  poolLoading,
  search,
  onSearchChange,
  expanded,
  onToggleExpanded,
  onSelect,
  onClear
}: {
  blockLabel: string;
  help: string;
  selected: TournamentPlayerPick | null;
  players: SquadPoolPlayer[];
  poolLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelect: (player: SquadPoolPlayer) => void;
  onClear: () => void;
}) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => {
      if (!query) return true;
      return (
        player.name.toLowerCase().includes(query) || player.teamName.toLowerCase().includes(query)
      );
    });
  }, [players, search]);

  return (
    <fieldset className="fixture-prediction-field tournament-player-pick-field">
      <legend className="fixture-prediction-field-label fixture-prediction-field-label--with-help">
        {blockLabel}
        <HelpTooltip label={`${blockLabel} help`} size="sm">
          {help}
        </HelpTooltip>
      </legend>
      <div className="tournament-player-pick-control">
        <button
          aria-expanded={expanded}
          aria-label={
            selected
              ? `${blockLabel}: ${selected.playerName}${
                  selected.teamName ? `, ${selected.teamName}` : ""
                }. ${expanded ? "Close player list" : "Change player"}`
              : `${blockLabel}: choose player`
          }
          className={`fixture-prediction-scorers-toggle tournament-player-pick-trigger${
            expanded ? "" : " fixture-prediction-scorers-toggle--collapsed"
          }`}
          type="button"
          onClick={onToggleExpanded}
        >
          <span className="fixture-prediction-scorers-toggle-copy">
            {selected ? (
              <span className="tournament-player-pick-value">
                <span className="tournament-player-pick-name">{selected.playerName}</span>
                {selected.teamName ? (
                  <span className="tournament-player-pick-meta">{selected.teamName}</span>
                ) : null}
              </span>
            ) : (
              <span className="tournament-player-pick-placeholder">Choose player</span>
            )}
          </span>
          <span aria-hidden className="fixture-prediction-scorers-chevron" />
        </button>
        {selected ? (
          <button
            className="text-button fixture-prediction-clear tournament-player-pick-clear"
            type="button"
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="fixture-prediction-scorers-panel">
          <input
            aria-label={`Search players for ${blockLabel}`}
            className="feed-control-input"
            placeholder="Search players"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {poolLoading ? <p className="inline-status">Loading players…</p> : null}
          <ul className="fixture-scorer-pool-list">
            {filtered.slice(0, 48).map((player) => (
              <li key={player.playerId}>
                <button
                  className={`fixture-scorer-chip${
                    selected?.playerId === player.playerId ? " fixture-scorer-chip--selected" : ""
                  }`}
                  type="button"
                  onClick={() => onSelect(player)}
                >
                  <span className="fixture-scorer-chip-name">{player.name}</span>
                  <span className="fixture-scorer-chip-side">{player.teamName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </fieldset>
  );
}

export function TournamentPredictionsForm({ groups = [], onSaved }: TournamentPredictionsFormProps) {
  const { showToast } = useToast();
  const teams = useMemo(() => teamsFromWorldCupGroups(groups), [groups]);

  const [champion, setChampion] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [topScorer, setTopScorer] = useState<TournamentPlayerPick | null>(null);
  const [bestPlayer, setBestPlayer] = useState<TournamentPlayerPick | null>(null);
  const [hasSavedPick, setHasSavedPick] = useState(false);

  const [players, setPlayers] = useState<SquadPoolPlayer[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [topScorerSearch, setTopScorerSearch] = useState("");
  const [bestPlayerSearch, setBestPlayerSearch] = useState("");
  const [topScorerExpanded, setTopScorerExpanded] = useState(false);
  const [bestPlayerExpanded, setBestPlayerExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tournamentKey: DEFAULT_TOURNAMENT_KEY });
      const response = await fetch(`/api/tournament-predictions?${params}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { prediction?: TournamentPredictionRecord | null };
        const next = applyRecordToState(payload.prediction ?? null);
        setChampion(next.champion);
        setOpponent(next.opponent);
        setTopScorer(next.topScorer);
        setBestPlayer(next.bestPlayer);
        setHasSavedPick(next.hasSaved);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadPool() {
      setPoolLoading(true);
      try {
        const response = await fetch("/api/squads/player-pool", { cache: "force-cache" });
        if (!cancelled && response.ok) {
          const payload = (await response.json()) as { players?: SquadPoolPlayer[] };
          const byId = new Map<number, SquadPoolPlayer>();
          for (const player of payload.players ?? []) {
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
  }, []);

  const opponentTeams = useMemo(() => {
    if (!champion) return teams;
    return teams.filter((team) => !teamsMatch(team, champion));
  }, [champion, teams]);

  const finalists = useMemo(
    () => predictedFinalistsFromPicks(champion, opponent),
    [champion, opponent]
  );

  function selectChampion(team: string | null) {
    setChampion(team);
    if (!team) {
      setOpponent(null);
      return;
    }
    setOpponent((current) => (current && teamsMatch(current, team) ? null : current));
  }

  async function savePick(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/tournament-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentKey: DEFAULT_TOURNAMENT_KEY,
          predictedChampion: champion,
          predictedFinalists: finalists,
          predictedTopScorer: topScorer,
          predictedBestPlayer: bestPlayer
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        prediction?: TournamentPredictionRecord | null;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save tournament picks.");
      if (payload.prediction) {
        const next = applyRecordToState(payload.prediction);
        setChampion(next.champion);
        setOpponent(next.opponent);
        setTopScorer(next.topScorer);
        setBestPlayer(next.bestPlayer);
        setHasSavedPick(next.hasSaved);
      } else {
        setHasSavedPick(false);
      }
      setNotice(payload.message ?? "Saved");
      showToast({ message: payload.message ?? "Tournament picks saved.", variant: "success" });
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save tournament picks.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAllPicks() {
    if (!hasSavedPick) return;
    if (!window.confirm("Remove all tournament picks?")) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tournamentKey: DEFAULT_TOURNAMENT_KEY });
      const response = await fetch(`/api/tournament-predictions?${params}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to remove picks.");
      setChampion(null);
      setOpponent(null);
      setTopScorer(null);
      setBestPlayer(null);
      setHasSavedPick(false);
      setNotice(payload.message ?? "Removed");
      showToast({ message: payload.message ?? "Tournament picks removed.", variant: "warning" });
      onSaved?.();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove picks.");
    } finally {
      setBusy(false);
    }
  }

  if (!teams.length) {
    return (
      <div className="tournament-predictions-section data-card surface-muted">
        <p className="inline-status">Loading tournament teams…</p>
      </div>
    );
  }

  return (
    <section className="tournament-predictions-section" id="tournament-predictions">
      <PanelHelpRow
        className="panel-help-row--block tournament-predictions-heading"
        help={
          <>
            Lock in your World Cup winner, final opponent, Golden Boot, and best player before the
            knockout stage. Points settle when the tournament ends.
          </>
        }
        helpLabel="About tournament picks"
        title="Tournament picks"
        titleClassName="tournament-predictions-title"
      />

      <form className="fixture-predictions-form tournament-predictions-form" onSubmit={savePick}>
        <fieldset className="fixture-prediction-field tournament-champion-field">
          <legend className="fixture-prediction-field-label fixture-prediction-field-label--with-help">
            {TOURNAMENT_PREDICTION_BLOCKS.champion}
            <HelpTooltip label="Champion help" size="sm">
              {TOURNAMENT_PREDICTION_HINTS.champion}
            </HelpTooltip>
          </legend>
          <TeamPickGrid
            name="tournament-champion"
            selected={champion}
            teams={teams}
            onSelect={selectChampion}
          />
          {champion ? (
            <button className="text-button fixture-prediction-clear" type="button" onClick={() => selectChampion(null)}>
              Clear
            </button>
          ) : null}
        </fieldset>

        <fieldset
          aria-disabled={!champion}
          className="fixture-prediction-field tournament-opponent-field"
        >
          <legend className="fixture-prediction-field-label fixture-prediction-field-label--with-help">
            {TOURNAMENT_PREDICTION_BLOCKS.finalOpponent}
            <HelpTooltip label="Final opponent help" size="sm">
              {TOURNAMENT_PREDICTION_HINTS.finalOpponent}
            </HelpTooltip>
          </legend>
          {champion ? (
            <>
              <TeamPickGrid
                name="tournament-final-opponent"
                selected={opponent}
                teams={opponentTeams}
                onSelect={setOpponent}
              />
              {opponent ? (
                <button
                  className="text-button fixture-prediction-clear"
                  type="button"
                  onClick={() => setOpponent(null)}
                >
                  Clear
                </button>
              ) : null}
            </>
          ) : (
            <p className="tournament-opponent-prereq">{TOURNAMENT_PREDICTION_HINTS.finalOpponentPrereq}</p>
          )}
        </fieldset>

        <SinglePlayerPickField
          blockLabel={TOURNAMENT_PREDICTION_BLOCKS.topScorer}
          expanded={topScorerExpanded}
          help={TOURNAMENT_PREDICTION_HINTS.topScorer}
          players={players}
          poolLoading={poolLoading}
          search={topScorerSearch}
          selected={topScorer}
          onClear={() => setTopScorer(null)}
          onSearchChange={setTopScorerSearch}
          onSelect={(player) => {
            setTopScorer({
              playerId: player.playerId,
              playerName: player.name,
              teamName: player.teamName
            });
            setTopScorerExpanded(false);
          }}
          onToggleExpanded={() => setTopScorerExpanded((open) => !open)}
        />

        <SinglePlayerPickField
          blockLabel={TOURNAMENT_PREDICTION_BLOCKS.bestPlayer}
          expanded={bestPlayerExpanded}
          help={TOURNAMENT_PREDICTION_HINTS.bestPlayer}
          players={players}
          poolLoading={poolLoading}
          search={bestPlayerSearch}
          selected={bestPlayer}
          onClear={() => setBestPlayer(null)}
          onSearchChange={setBestPlayerSearch}
          onSelect={(player) => {
            setBestPlayer({
              playerId: player.playerId,
              playerName: player.name,
              teamName: player.teamName
            });
            setBestPlayerExpanded(false);
          }}
          onToggleExpanded={() => setBestPlayerExpanded((open) => !open)}
        />

        <div className="fixture-prediction-form-footer">
          <div className="fixture-prediction-form-actions">
            <button className="button primary fixture-prediction-save" disabled={busy || loading} type="submit">
              {busy ? "Saving…" : TOURNAMENT_PREDICTION_HINTS.saveButton}
            </button>
            {hasSavedPick ? (
              <button
                className="button secondary fixture-prediction-remove"
                disabled={busy || loading}
                type="button"
                onClick={() => void removeAllPicks()}
              >
                Remove all tournament picks
              </button>
            ) : null}
          </div>
          {notice ? <span className="fixture-prediction-notice">{notice}</span> : null}
          {error ? <span className="fixture-prediction-error">{error}</span> : null}
        </div>
      </form>
    </section>
  );
}
