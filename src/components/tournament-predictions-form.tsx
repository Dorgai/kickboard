"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MAX_TOURNAMENT_SCORER_BOARD_GOALS,
  predictedFinalistsFromPicks
} from "@/lib/tournament-predictions/types";
import type {
  TournamentPlayerPick,
  TournamentPredictionRecord,
  TournamentScorerRankPick,
  TournamentTopScorerBoard,
  TournamentTopScorerBoardSize
} from "@/lib/tournament-predictions/types";
import { teamsMatch } from "@/lib/squads/team-names";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { celebratePredictionSubmit } from "@/lib/predictions/submit-celebration";

type TournamentPredictionsFormProps = {
  groups?: WorldCupGroupInput[];
  onSaved?: () => void;
};

function applyRecordToState(record: TournamentPredictionRecord | null) {
  const board = record?.predictedTopScorerBoard ?? null;
  return {
    champion: record?.predictedChampion ?? null,
    opponent: finalOpponentFromRecord(record),
    topScorer: record?.predictedTopScorer ?? null,
    topScorerBoardEnabled: Boolean(board),
    topScorerBoardSize: board?.size ?? 5,
    topScorerBoardPicks: board?.picks ?? [],
    bestPlayer: record?.predictedBestPlayer ?? null,
    hasSaved: Boolean(record)
  };
}

function topScorerBoardFromForm(input: {
  enabled: boolean;
  size: TournamentTopScorerBoardSize;
  picks: TournamentScorerRankPick[];
}): TournamentTopScorerBoard | null {
  if (!input.enabled || input.picks.length === 0) return null;
  const picks = input.picks
    .filter((pick) => pick.rank >= 1 && pick.rank <= input.size)
    .sort((a, b) => a.rank - b.rank);
  if (!picks.length) return null;
  return { size: input.size, picks };
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

function TopScorerBoardField({
  enabled,
  size,
  picks,
  players,
  poolLoading,
  search,
  activeRank,
  expanded,
  onEnabledChange,
  onSizeChange,
  onSearchChange,
  onToggleExpanded,
  onSelectRank,
  onClearRank,
  onGoalsChange
}: {
  enabled: boolean;
  size: TournamentTopScorerBoardSize;
  picks: TournamentScorerRankPick[];
  players: SquadPoolPlayer[];
  poolLoading: boolean;
  search: string;
  activeRank: number | null;
  expanded: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSizeChange: (size: TournamentTopScorerBoardSize) => void;
  onSearchChange: (value: string) => void;
  onToggleExpanded: (rank: number | null) => void;
  onSelectRank: (rank: number, player: SquadPoolPlayer) => void;
  onClearRank: (rank: number) => void;
  onGoalsChange: (rank: number, goals: number) => void;
}) {
  const pickByRank = useMemo(() => {
    const map = new Map<number, TournamentScorerRankPick>();
    for (const pick of picks) map.set(pick.rank, pick);
    return map;
  }, [picks]);

  const usedPlayerIds = useMemo(() => new Set(picks.map((pick) => pick.playerId)), [picks]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activePick = activeRank ? pickByRank.get(activeRank) : null;
    return players.filter((player) => {
      if (usedPlayerIds.has(player.playerId) && player.playerId !== activePick?.playerId) {
        return false;
      }
      if (!query) return true;
      return (
        player.name.toLowerCase().includes(query) || player.teamName.toLowerCase().includes(query)
      );
    });
  }, [activeRank, pickByRank, players, search, usedPlayerIds]);

  const ranks = useMemo(() => Array.from({ length: size }, (_, index) => index + 1), [size]);

  return (
    <fieldset className="fixture-prediction-field tournament-scorer-board-field">
      <legend className="fixture-prediction-field-label fixture-prediction-field-label--with-help">
        {TOURNAMENT_PREDICTION_BLOCKS.topScorerBoard}
        <HelpTooltip label="Top scorer leaderboard help" size="sm">
          {TOURNAMENT_PREDICTION_HINTS.topScorerBoard}
        </HelpTooltip>
      </legend>

      <label className="tournament-scorer-board-enable">
        <input
          checked={enabled}
          type="checkbox"
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span>{TOURNAMENT_PREDICTION_HINTS.topScorerBoardEnable}</span>
      </label>

      {enabled ? (
        <>
          <div className="tournament-scorer-board-size" role="radiogroup" aria-label="Leaderboard size">
            {([5, 10] as const).map((option) => (
              <label
                key={option}
                className={`fixture-prediction-outcome-option tournament-scorer-board-size-option${
                  size === option ? " is-selected" : ""
                }`}
              >
                <input
                  checked={size === option}
                  className="fixture-prediction-outcome-input"
                  name="tournament-scorer-board-size"
                  type="radio"
                  value={option}
                  onChange={() => onSizeChange(option)}
                />
                <span className="fixture-prediction-outcome-body">
                  {option === 5
                    ? TOURNAMENT_PREDICTION_HINTS.topScorerBoardSize5
                    : TOURNAMENT_PREDICTION_HINTS.topScorerBoardSize10}
                </span>
              </label>
            ))}
          </div>

          <ol className="tournament-scorer-board-ranks">
            {ranks.map((rank) => {
              const pick = pickByRank.get(rank) ?? null;
              const isActive = activeRank === rank && expanded;
              return (
                <li key={rank} className="tournament-scorer-board-rank">
                  <span className="tournament-scorer-board-rank-label">
                    {TOURNAMENT_PREDICTION_HINTS.topScorerBoardRank(rank)}
                  </span>
                  <div className="tournament-scorer-board-rank-body">
                    <button
                      aria-expanded={isActive}
                      className={`fixture-prediction-scorers-toggle tournament-player-pick-trigger tournament-scorer-board-rank-trigger${
                        isActive ? "" : " fixture-prediction-scorers-toggle--collapsed"
                      }`}
                      type="button"
                      onClick={() => onToggleExpanded(isActive ? null : rank)}
                    >
                      <span className="fixture-prediction-scorers-toggle-copy">
                        {pick ? (
                          <span className="tournament-player-pick-value">
                            <span className="tournament-player-pick-name">{pick.playerName}</span>
                            {pick.teamName ? (
                              <span className="tournament-player-pick-meta">{pick.teamName}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="tournament-player-pick-placeholder">
                            {TOURNAMENT_PREDICTION_HINTS.topScorerBoardChoose}
                          </span>
                        )}
                      </span>
                      <span aria-hidden className="fixture-prediction-scorers-chevron" />
                    </button>
                    {pick ? (
                      <div className="tournament-scorer-board-goals">
                        <span className="tournament-scorer-board-goals-label">
                          {TOURNAMENT_PREDICTION_HINTS.topScorerBoardGoals}
                        </span>
                        <span className="fixture-scorer-chip-actions">
                          <button
                            aria-label={`Remove one goal for ${pick.playerName}`}
                            className="fixture-scorer-step"
                            type="button"
                            onClick={() =>
                              onGoalsChange(rank, Math.max(1, pick.predictedGoals - 1))
                            }
                          >
                            −
                          </button>
                          <span className="tournament-scorer-board-goals-value">{pick.predictedGoals}</span>
                          <button
                            aria-label={`Add one goal for ${pick.playerName}`}
                            className="fixture-scorer-step"
                            disabled={pick.predictedGoals >= MAX_TOURNAMENT_SCORER_BOARD_GOALS}
                            type="button"
                            onClick={() =>
                              onGoalsChange(
                                rank,
                                Math.min(MAX_TOURNAMENT_SCORER_BOARD_GOALS, pick.predictedGoals + 1)
                              )
                            }
                          >
                            +
                          </button>
                        </span>
                        <button
                          className="text-button fixture-prediction-clear tournament-player-pick-clear"
                          type="button"
                          onClick={() => onClearRank(rank)}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {expanded && activeRank ? (
            <div className="fixture-prediction-scorers-panel tournament-scorer-board-panel">
              <input
                aria-label="Search players for scorer leaderboard"
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
                        pickByRank.get(activeRank)?.playerId === player.playerId
                          ? " fixture-scorer-chip--selected"
                          : ""
                      }`}
                      type="button"
                      onClick={() => onSelectRank(activeRank, player)}
                    >
                      <span className="fixture-scorer-chip-name">{player.name}</span>
                      <span className="fixture-scorer-chip-side">{player.teamName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
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
  const [topScorerBoardEnabled, setTopScorerBoardEnabled] = useState(false);
  const [topScorerBoardSize, setTopScorerBoardSize] = useState<TournamentTopScorerBoardSize>(5);
  const [topScorerBoardPicks, setTopScorerBoardPicks] = useState<TournamentScorerRankPick[]>([]);
  const [bestPlayer, setBestPlayer] = useState<TournamentPlayerPick | null>(null);
  const [hasSavedPick, setHasSavedPick] = useState(false);

  const [players, setPlayers] = useState<SquadPoolPlayer[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [topScorerSearch, setTopScorerSearch] = useState("");
  const [topScorerBoardSearch, setTopScorerBoardSearch] = useState("");
  const [bestPlayerSearch, setBestPlayerSearch] = useState("");
  const [topScorerExpanded, setTopScorerExpanded] = useState(false);
  const [topScorerBoardActiveRank, setTopScorerBoardActiveRank] = useState<number | null>(null);
  const [topScorerBoardExpanded, setTopScorerBoardExpanded] = useState(false);
  const [bestPlayerExpanded, setBestPlayerExpanded] = useState(false);

  const submitRef = useRef<HTMLButtonElement>(null);
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
        setTopScorerBoardEnabled(next.topScorerBoardEnabled);
        setTopScorerBoardSize(next.topScorerBoardSize);
        setTopScorerBoardPicks(next.topScorerBoardPicks);
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

  function setTopScorerBoardEnabledState(enabled: boolean) {
    setTopScorerBoardEnabled(enabled);
    if (!enabled) {
      setTopScorerBoardPicks([]);
      setTopScorerBoardActiveRank(null);
      setTopScorerBoardExpanded(false);
    }
  }

  function setTopScorerBoardSizeState(size: TournamentTopScorerBoardSize) {
    setTopScorerBoardSize(size);
    setTopScorerBoardPicks((current) => current.filter((pick) => pick.rank <= size));
    setTopScorerBoardActiveRank((current) => (current && current > size ? null : current));
  }

  function selectTopScorerBoardPlayer(rank: number, player: SquadPoolPlayer) {
    setTopScorerBoardPicks((current) => {
      const withoutRank = current.filter((pick) => pick.rank !== rank && pick.playerId !== player.playerId);
      const existing = current.find((pick) => pick.rank === rank);
      return [
        ...withoutRank,
        {
          rank,
          playerId: player.playerId,
          playerName: player.name,
          teamName: player.teamName,
          predictedGoals: existing?.predictedGoals ?? 1
        }
      ].sort((a, b) => a.rank - b.rank);
    });
    setTopScorerBoardExpanded(false);
    setTopScorerBoardActiveRank(null);
  }

  function clearTopScorerBoardRank(rank: number) {
    setTopScorerBoardPicks((current) => current.filter((pick) => pick.rank !== rank));
    setTopScorerBoardActiveRank((current) => (current === rank ? null : current));
  }

  function setTopScorerBoardGoals(rank: number, goals: number) {
    setTopScorerBoardPicks((current) =>
      current.map((pick) => (pick.rank === rank ? { ...pick, predictedGoals: goals } : pick))
    );
  }

  function toggleTopScorerBoardExpanded(rank: number | null) {
    if (rank === null) {
      setTopScorerBoardExpanded(false);
      setTopScorerBoardActiveRank(null);
      return;
    }
    setTopScorerBoardActiveRank(rank);
    setTopScorerBoardExpanded(true);
    setTopScorerExpanded(false);
    setBestPlayerExpanded(false);
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
          predictedTopScorerBoard: topScorerBoardFromForm({
            enabled: topScorerBoardEnabled,
            size: topScorerBoardSize,
            picks: topScorerBoardPicks
          }),
          predictedBestPlayer: bestPlayer
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        change?: string;
        prediction?: TournamentPredictionRecord | null;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save tournament picks.");
      if (payload.prediction) {
        const next = applyRecordToState(payload.prediction);
        setChampion(next.champion);
        setOpponent(next.opponent);
        setTopScorer(next.topScorer);
        setTopScorerBoardEnabled(next.topScorerBoardEnabled);
        setTopScorerBoardSize(next.topScorerBoardSize);
        setTopScorerBoardPicks(next.topScorerBoardPicks);
        setBestPlayer(next.bestPlayer);
        setHasSavedPick(next.hasSaved);
      } else {
        setHasSavedPick(false);
      }
      const change = payload.change ?? "updated";
      setNotice(payload.message ?? "Saved");
      showToast({
        message: payload.message ?? "Tournament picks saved.",
        variant: change === "unchanged" ? "info" : "success"
      });
      if (change !== "unchanged") {
        celebratePredictionSubmit(submitRef.current);
      }
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
      setTopScorerBoardEnabled(false);
      setTopScorerBoardSize(5);
      setTopScorerBoardPicks([]);
      setTopScorerBoardActiveRank(null);
      setTopScorerBoardExpanded(false);
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
            Lock in your World Cup winner, final opponent, Golden Boot, optional top scorer
            leaderboard, and best player before the knockout stage. Points settle when the tournament
            ends.
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
          onToggleExpanded={() => {
            setTopScorerExpanded((open) => !open);
            setTopScorerBoardExpanded(false);
            setTopScorerBoardActiveRank(null);
            setBestPlayerExpanded(false);
          }}
        />

        <TopScorerBoardField
          activeRank={topScorerBoardActiveRank}
          enabled={topScorerBoardEnabled}
          expanded={topScorerBoardExpanded}
          picks={topScorerBoardPicks}
          players={players}
          poolLoading={poolLoading}
          search={topScorerBoardSearch}
          size={topScorerBoardSize}
          onClearRank={clearTopScorerBoardRank}
          onEnabledChange={setTopScorerBoardEnabledState}
          onGoalsChange={setTopScorerBoardGoals}
          onSearchChange={setTopScorerBoardSearch}
          onSelectRank={selectTopScorerBoardPlayer}
          onSizeChange={setTopScorerBoardSizeState}
          onToggleExpanded={toggleTopScorerBoardExpanded}
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
          onToggleExpanded={() => {
            setBestPlayerExpanded((open) => !open);
            setTopScorerExpanded(false);
            setTopScorerBoardExpanded(false);
            setTopScorerBoardActiveRank(null);
          }}
        />

        <div className="fixture-prediction-form-footer">
          <div className="fixture-prediction-form-actions">
            <button
              ref={submitRef}
              className="button primary fixture-prediction-save"
              disabled={busy || loading}
              type="submit"
            >
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
