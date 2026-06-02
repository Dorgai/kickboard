"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

type LatestSquad = {
  id: string;
  name: string;
  formation: SquadFormation;
  lineup: SquadLineupSlot[];
};

type SquadBuilderProps = {
  fixtureKey: string;
  fixtureLabel: string;
};

export function SquadBuilder({ fixtureKey, fixtureLabel }: SquadBuilderProps) {
  const [formation, setFormation] = useState<SquadFormation>("4-3-3");
  const [name, setName] = useState("My World Cup XI");
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
      setSquadId(null);
      setNotice(null);
      setError(null);
      setFormation("4-3-3");
      setLineup(defaultLineupWithPositions("4-3-3"));
      try {
        const params = new URLSearchParams({ fixtureKey });
        const [squadsRes, poolRes] = await Promise.all([
          fetch(`/api/squads?${params}`),
          fetch("/api/squads/player-pool")
        ]);

        if (!cancelled && squadsRes.ok) {
          const squadsPayload = (await squadsRes.json()) as { latest?: LatestSquad | null };
          const latest = squadsPayload.latest;
          if (latest?.lineup?.length === 11) {
            setSquadId(latest.id);
            setName(latest.name);
            setFormation(latest.formation);
            setLineup(latest.lineup);
          } else {
            setName(`${fixtureLabel.split("—")[0]?.trim() ?? "My XI"}`);
          }
        }

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
  }, [fixtureKey, fixtureLabel]);

  function changeFormation(next: SquadFormation) {
    setFormation(next);
    setLineup((current) => mergeFormationChange(next, current));
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
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squadId: squadId ?? undefined, fixtureKey, name, formation, lineup })
      });
      const payload = (await response.json()) as { error?: string; squadId?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save squad.");
      setSquadId(payload.squadId ?? squadId);
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
      <header className="section-heading compact">
        <div>
          <h3>Build your XI</h3>
          <p className="community-panel-lead">
            Drag players onto the pitch for <strong>{fixtureLabel}</strong>. Your saved squad for this
            match loads automatically when you switch fixtures.
          </p>
        </div>
        <label className="feed-control-field">
          Formation
          <select
            className="feed-control-input"
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

      <label className="feed-control-field">
        Squad name
        <input
          className="feed-control-input"
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      {loadState === "loading" ? <p className="inline-status">Loading your squad…</p> : null}

      <div className="squad-builder-layout">
        <SquadPlayerPool
          error={poolError}
          lineup={lineup}
          loading={poolLoading}
          players={players}
          sourceLabel={poolLabel}
        />
        <SquadPitch
          lineup={lineup}
          selectedSlot={selectedSlot}
          onLineupChange={setLineup}
          onSelectSlot={setSelectedSlot}
        />
      </div>

      <p className="squad-builder-progress">
        {filledCount}/11 players placed
        {squadId ? ` · editing squad ${squadId.slice(0, 8)}…` : ""}
      </p>

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
