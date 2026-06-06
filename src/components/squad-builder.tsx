"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FixturePredictionPick } from "@/components/fixture-prediction-pick";
import { SquadPitch, type SquadPitchHandle } from "@/components/squad-pitch";
import { SquadTeamBench } from "@/components/squad-player-pool";
import {
  countFilledBySide,
  defaultMatchFormations,
  defaultMatchLineupWithFormations,
  alignLineupSlotCoordinates,
  applyBenchSelectionToSideFormation,
  applyFormationChangeForSide,
  normalizeLineupTeamLabels,
  type BenchPlayerPick,
  parseStoredFormations,
  SLOTS_PER_TEAM,
  type MatchFormations,
  type SquadFormation,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { playerIdsMatch } from "@/lib/squads/drag-player";
import { teamsMatch } from "@/lib/squads/team-names";

type LoadedSquad = {
  id: string;
  name: string;
  formation: string;
  formations?: MatchFormations;
  lineup: SquadLineupSlot[];
};

type SquadBuilderProps = {
  fixtureKey: string;
  fixtureLabel: string;
  homeTeam: string;
  awayTeam: string;
  activeSquadId: string | null;
  /** Rendered centered directly above the pitch (Coach Board match header). */
  pitchHeader?: ReactNode;
  onSaved: (squadId: string) => void | Promise<void>;
};

function autoSquadName(fixtureLabel: string) {
  return `${fixtureLabel.split("—")[0]?.trim() ?? "Match board"}`.slice(0, 60);
}

export function SquadBuilder({
  fixtureKey,
  fixtureLabel,
  homeTeam,
  awayTeam,
  activeSquadId,
  pitchHeader,
  onSaved
}: SquadBuilderProps) {
  const [formations, setFormations] = useState<MatchFormations>(defaultMatchFormations);
  const [lineup, setLineup] = useState<SquadLineupSlot[]>(() =>
    defaultMatchLineupWithFormations(defaultMatchFormations())
  );
  const [squadId, setSquadId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [homePlayers, setHomePlayers] = useState<SquadPoolPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<SquadPoolPlayer[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [homeSelectedIds, setHomeSelectedIds] = useState<Set<number>>(() => new Set());
  const [awaySelectedIds, setAwaySelectedIds] = useState<Set<number>>(() => new Set());
  const pitchDropRef = useRef<SquadPitchHandle>(null);

  const applyLineup = useCallback(
    (next: SquadLineupSlot[] | ((prev: SquadLineupSlot[]) => SquadLineupSlot[])) => {
      setLineup((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        return alignLineupSlotCoordinates(resolved, formations);
      });
    },
    [formations]
  );

  const removeFromPitch = useCallback((playerId: number | string) => {
    setLineup((current) =>
      alignLineupSlotCoordinates(
        current.map((slot) =>
          playerIdsMatch(slot.playerId, playerId)
            ? { ...slot, label: "", playerId: undefined, teamName: undefined, jerseyNumber: undefined }
            : slot
        ),
        formations
      )
    );
    const numericId = typeof playerId === "number" ? playerId : Number(playerId);
    setHomeSelectedIds((current) => {
      if (!Number.isFinite(numericId) || !current.has(numericId)) return current;
      const next = new Set(current);
      next.delete(numericId);
      return next;
    });
    setAwaySelectedIds((current) => {
      if (!Number.isFinite(numericId) || !current.has(numericId)) return current;
      const next = new Set(current);
      next.delete(numericId);
      return next;
    });
    setSelectedSlot(null);
  }, [formations]);

  const benchPicksForSide = useCallback(
    (
      selectedIds: ReadonlySet<number>,
      players: SquadPoolPlayer[],
      teamName: string
    ): BenchPlayerPick[] => {
      const picks: BenchPlayerPick[] = [];
      for (const playerId of selectedIds) {
        const player = players.find((entry) => entry.playerId === playerId);
        if (!player) continue;
        picks.push({
          playerId: player.playerId,
          name: player.name,
          role: player.role,
          teamName,
          jerseyNumber: player.jerseyNumber ?? undefined
        });
      }
      return picks;
    },
    []
  );

  const toggleHomeSelection = useCallback((playerId: number) => {
    setHomeSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) {
        next.delete(playerId);
        return next;
      }
      if (next.size >= SLOTS_PER_TEAM) return current;
      next.add(playerId);
      return next;
    });
  }, []);

  const toggleAwaySelection = useCallback((playerId: number) => {
    setAwaySelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) {
        next.delete(playerId);
        return next;
      }
      if (next.size >= SLOTS_PER_TEAM) return current;
      next.add(playerId);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setNotice(null);
      setError(null);
      setSelectedSlot(null);
      setHomeSelectedIds(new Set());
      setAwaySelectedIds(new Set());
      setPoolLoading(true);

      try {
        const poolParams = new URLSearchParams({ homeTeam, awayTeam, fixtureKey });
        const poolRes = await fetch(`/api/squads/player-pool?${poolParams}`);
        if (!cancelled) {
          if (poolRes.ok) {
            const poolPayload = (await poolRes.json()) as {
              players?: SquadPoolPlayer[];
              homePlayers?: SquadPoolPlayer[];
              awayPlayers?: SquadPoolPlayer[];
              seasonName: string;
              matchLabel: string;
              source?: string;
            };
            const all = poolPayload.players ?? [];
            const mergedHome = [
              ...(poolPayload.homePlayers ?? []),
              ...all.filter((player) => teamsMatch(player.teamName, homeTeam))
            ].filter(
              (player, index, list) =>
                list.findIndex((entry) => entry.playerId === player.playerId) === index
            );
            const mergedAway = [
              ...(poolPayload.awayPlayers ?? []),
              ...all.filter((player) => teamsMatch(player.teamName, awayTeam))
            ].filter(
              (player, index, list) =>
                list.findIndex((entry) => entry.playerId === player.playerId) === index
            );
            setHomePlayers(mergedHome);
            setAwayPlayers(mergedAway);
            setPoolError(null);
          } else {
            const poolFail = (await poolRes.json()) as { error?: string };
            setPoolError(poolFail.error ?? "Unable to load player pool.");
          }
          setPoolLoading(false);
        }

        if (activeSquadId) {
          const squadRes = await fetch(`/api/squads/${activeSquadId}`, { cache: "no-store" });
          if (!cancelled && squadRes.ok) {
            const payload = (await squadRes.json()) as { squad?: LoadedSquad };
            const squad = payload.squad;
            if (squad?.lineup?.length) {
              setSquadId(squad.id);
              const loadedFormations =
                squad.formations ?? parseStoredFormations(squad.formation ?? "4-3-3");
              setFormations(loadedFormations);
              setLineup(
                alignLineupSlotCoordinates(
                  normalizeLineupTeamLabels(squad.lineup, homeTeam, awayTeam),
                  loadedFormations
                )
              );
              if (!cancelled) setLoadState("ready");
              return;
            }
          }
          if (!cancelled) {
            setError("Could not load that saved board.");
          }
        } else {
          setSquadId(null);
          const fresh = defaultMatchFormations();
          setFormations(fresh);
          setLineup(defaultMatchLineupWithFormations(fresh));
        }

        if (!cancelled) setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setPoolLoading(false);
          setPoolError("Unable to load squad data.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeSquadId, awayTeam, fixtureKey, homeTeam]);

  const changeHomeFormation = useCallback(
    (next: SquadFormation) => {
      setFormations((currentFormations) => {
        const nextFormations = { ...currentFormations, home: next };
        setLineup((current) => {
          const benchPicks = benchPicksForSide(homeSelectedIds, homePlayers, homeTeam);
          const merged =
            benchPicks.length > 0
              ? applyBenchSelectionToSideFormation("home", next, current, benchPicks)
              : applyFormationChangeForSide("home", next, current);
          return alignLineupSlotCoordinates(
            normalizeLineupTeamLabels(merged, homeTeam, awayTeam),
            nextFormations
          );
        });
        return nextFormations;
      });
      setHomeSelectedIds(new Set());
      setSelectedSlot(null);
    },
    [awayTeam, benchPicksForSide, homePlayers, homeSelectedIds, homeTeam]
  );

  const changeAwayFormation = useCallback(
    (next: SquadFormation) => {
      setFormations((currentFormations) => {
        const nextFormations = { ...currentFormations, away: next };
        setLineup((current) => {
          const benchPicks = benchPicksForSide(awaySelectedIds, awayPlayers, awayTeam);
          const merged =
            benchPicks.length > 0
              ? applyBenchSelectionToSideFormation("away", next, current, benchPicks)
              : applyFormationChangeForSide("away", next, current);
          return alignLineupSlotCoordinates(
            normalizeLineupTeamLabels(merged, homeTeam, awayTeam),
            nextFormations
          );
        });
        return nextFormations;
      });
      setAwaySelectedIds(new Set());
      setSelectedSlot(null);
    },
    [awayPlayers, awaySelectedIds, awayTeam, benchPicksForSide, homeTeam]
  );

  const homeFilled = countFilledBySide(lineup, "home");
  const awayFilled = countFilledBySide(lineup, "away");
  const readyToSave = homeFilled >= SLOTS_PER_TEAM && awayFilled >= SLOTS_PER_TEAM;

  async function saveSquad(event: FormEvent) {
    event.preventDefault();
    if (!readyToSave) {
      setError(`Place ${SLOTS_PER_TEAM} home and ${SLOTS_PER_TEAM} away players on the pitch before saving.`);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const name = autoSquadName(fixtureLabel);
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          squadId: squadId ?? undefined,
          fixtureKey,
          name,
          formation: formations,
          homeFormation: formations.home,
          awayFormation: formations.away,
          lineup
        })
      });
      const payload = (await response.json()) as { error?: string; squadId?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save squad.");
      const savedId = payload.squadId ?? squadId;
      if (savedId) {
        setSquadId(savedId);
        await onSaved(savedId);
      }
      setNotice(payload.message ?? "Squad saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save squad.");
    } finally {
      setBusy(false);
    }
  }

  async function publishSquad() {
    if (!squadId) {
      setError("Save your squad first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/squads/${squadId}/publish`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to publish.");
      setNotice(payload.message ?? "Published to Coach Board.");
      await onSaved(squadId);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish.");
    } finally {
      setBusy(false);
    }
  }

  const resetToFormation = useCallback(() => {
    setLineup(defaultMatchLineupWithFormations(formations));
    setHomeSelectedIds(new Set());
    setAwaySelectedIds(new Set());
    setSelectedSlot(null);
  }, [formations]);

  return (
    <form className="squad-builder" onSubmit={saveSquad}>
      {loadState === "loading" ? <p className="inline-status">Loading your squad…</p> : null}

      <div className="squad-builder-layout squad-builder-layout--stacked">
        <div className="squad-builder-pitch-stack">
          {pitchHeader}
          <div className="squad-builder-pitch-stage">
            <SquadPitch
              ref={pitchDropRef}
              awayTeam={awayTeam}
              homeTeam={homeTeam}
              lineup={lineup}
              selectedSlot={selectedSlot}
              onLineupChange={applyLineup}
              onRemovePlayer={removeFromPitch}
              onSelectSlot={setSelectedSlot}
            />
          </div>
          <div className="squad-builder-benches" aria-label="Home and away benches">
            <SquadTeamBench
              awayTeam={awayTeam}
              error={poolError}
              formation={formations.home}
              homeTeam={homeTeam}
              lineup={lineup}
              loading={poolLoading}
              pitchDropRef={pitchDropRef}
              players={homePlayers}
              selectedPlayerIds={homeSelectedIds}
              side="home"
              teamName={homeTeam}
              onFormationChange={changeHomeFormation}
              onRemoveFromPitch={removeFromPitch}
              onTogglePlayerSelect={toggleHomeSelection}
            />
            <SquadTeamBench
              awayTeam={awayTeam}
              error={poolError}
              formation={formations.away}
              homeTeam={homeTeam}
              lineup={lineup}
              loading={poolLoading}
              pitchDropRef={pitchDropRef}
              players={awayPlayers}
              selectedPlayerIds={awaySelectedIds}
              side="away"
              teamName={awayTeam}
              onFormationChange={changeAwayFormation}
              onRemoveFromPitch={removeFromPitch}
              onTogglePlayerSelect={toggleAwaySelection}
            />
          </div>
          <div className="squad-builder-predictions">
            <FixturePredictionPick awayTeam={awayTeam} fixtureKey={fixtureKey} homeTeam={homeTeam} />
          </div>
        </div>
      </div>

      <div className="squad-builder-actions">
        <button className="button primary" disabled={busy || !readyToSave} type="submit">
          {busy ? "Saving…" : squadId ? "Update board" : "Save board"}
        </button>
        <button className="button secondary" disabled={busy || !squadId} type="button" onClick={publishSquad}>
          Publish to Coach Board
        </button>
        <button className="button secondary" disabled={busy} type="button" onClick={resetToFormation}>
          Clear pitch
        </button>
      </div>

      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </form>
  );
}
