"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FixturePredictionPick } from "@/components/fixture-prediction-pick";
import { SquadPitch } from "@/components/squad-pitch";
import { SquadPlayerPool } from "@/components/squad-player-pool";
import {
  FORMATIONS,
  defaultLineupWithPositions,
  mergeFormationChange,
  type SquadFormation,
  type SquadLineupSlot
} from "@/lib/squads/lineup";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";

type LoadedSquad = {
  id: string;
  name: string;
  formation: SquadFormation;
  lineup: SquadLineupSlot[];
};

type SquadBuilderProps = {
  fixtureKey: string;
  fixtureLabel: string;
  homeTeam: string;
  awayTeam: string;
  activeSquadId: string | null;
  onSaved: (squadId: string) => void | Promise<void>;
};

function autoSquadName(fixtureLabel: string) {
  return `${fixtureLabel.split("—")[0]?.trim() ?? "My XI"}`.slice(0, 60);
}

export function SquadBuilder({
  fixtureKey,
  fixtureLabel,
  homeTeam,
  awayTeam,
  activeSquadId,
  onSaved
}: SquadBuilderProps) {
  const [formation, setFormation] = useState<SquadFormation>("4-3-3");
  const [lineup, setLineup] = useState<SquadLineupSlot[]>(() => defaultLineupWithPositions("4-3-3"));
  const [squadId, setSquadId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [players, setPlayers] = useState<SquadPoolPlayer[]>([]);
  const [poolLabel, setPoolLabel] = useState<string | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setNotice(null);
      setError(null);
      setSelectedSlot(null);

      try {
        const poolRes = await fetch("/api/squads/player-pool");
        if (!cancelled) {
          if (poolRes.ok) {
            const poolPayload = (await poolRes.json()) as {
              players: SquadPoolPlayer[];
              seasonName: string;
              matchLabel: string;
            };
            setPlayers(poolPayload.players ?? []);
            setPoolLabel(`${poolPayload.seasonName} · ${poolPayload.matchLabel}`);
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
            if (squad?.lineup?.length === 11) {
              setSquadId(squad.id);
              setFormation(squad.formation);
              setLineup(squad.lineup);
              if (!cancelled) setLoadState("ready");
              return;
            }
          }
          if (!cancelled) {
            setError("Could not load that saved board.");
          }
        } else {
          setSquadId(null);
          setFormation("4-3-3");
          setLineup(defaultLineupWithPositions("4-3-3"));
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
  }, [activeSquadId, fixtureLabel]);

  function changeFormation(next: SquadFormation) {
    setFormation(next);
    setLineup((current) => mergeFormationChange(next, current));
    setSelectedSlot(null);
  }

  const filledCount = lineup.filter((slot) => slot.label).length;

  async function saveSquad(event: FormEvent) {
    event.preventDefault();
    if (filledCount < 11) {
      setError("Place all 11 players on the pitch before saving.");
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
        body: JSON.stringify({ squadId: squadId ?? undefined, fixtureKey, name, formation, lineup })
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
    setLineup(defaultLineupWithPositions(formation));
    setSelectedSlot(null);
  }, [formation]);

  return (
    <form className="squad-builder" onSubmit={saveSquad}>
      <header className="squad-builder-toolbar">
        <div className="squad-builder-toolbar-title">
          <h3>Build your XI</h3>
          <p className="squad-builder-progress">
            {filledCount}/11 · {squadId ? "saved board" : "new board"}
          </p>
        </div>
        <label className="squad-builder-formation-field">
          <span>Formation</span>
          <select
            className="feed-control-input squad-builder-formation-select"
            value={formation}
            onChange={(event) => changeFormation(event.target.value as SquadFormation)}
          >
            {FORMATIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loadState === "loading" ? <p className="inline-status">Loading your squad…</p> : null}

      <div className="squad-builder-layout">
        <SquadPlayerPool
          error={poolError}
          lineup={lineup}
          loading={poolLoading}
          players={players}
          sourceLabel={poolLabel}
        />

        <div className="squad-builder-pitch-column">
          <div className="squad-builder-pitch-row">
            <SquadPitch
              lineup={lineup}
              selectedSlot={selectedSlot}
              onLineupChange={setLineup}
              onSelectSlot={setSelectedSlot}
            />
            <FixturePredictionPick
              awayTeam={awayTeam}
              fixtureKey={fixtureKey}
              homeTeam={homeTeam}
              inline
            />
          </div>
        </div>
      </div>

      <div className="squad-builder-actions">
        <button className="button primary" disabled={busy || filledCount < 11} type="submit">
          {busy ? "Saving…" : squadId ? "Update squad" : "Save squad"}
        </button>
        <button className="button secondary" disabled={busy || !squadId} type="button" onClick={publishSquad}>
          Publish to Coach Board
        </button>
        <button className="button secondary" disabled={busy} type="button" onClick={resetToFormation}>
          Reset positions
        </button>
      </div>

      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </form>
  );
}
