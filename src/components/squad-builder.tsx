"use client";

import { FormEvent, useState } from "react";

const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"] as const;

type Slot = { slot: number; label: string; role: string };

function defaultSlots(formation: string): Slot[] {
  const roles: Record<string, string[]> = {
    "4-3-3": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
    "4-4-2": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"],
    "3-5-2": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD"],
    "4-2-3-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD"]
  };
  return (roles[formation] ?? roles["4-3-3"]).map((role, index) => ({
    slot: index + 1,
    label: "",
    role
  }));
}

export function SquadBuilder() {
  const [formation, setFormation] = useState<string>("4-3-3");
  const [name, setName] = useState("My World Cup XI");
  const [slots, setSlots] = useState<Slot[]>(() => defaultSlots("4-3-3"));
  const [lastSquadId, setLastSquadId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function changeFormation(next: string) {
    setFormation(next);
    setSlots(defaultSlots(next));
  }

  function updateSlot(index: number, label: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, label } : slot))
    );
  }

  async function saveSquad(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, formation, lineup: slots })
      });
      const payload = (await response.json()) as { error?: string; squadId?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save squad.");
      setLastSquadId(payload.squadId ?? null);
      setNotice(payload.message ?? "Squad saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save squad.");
    } finally {
      setBusy(false);
    }
  }

  async function publishSquad() {
    if (!lastSquadId) {
      setError("Save your squad first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/squads/${lastSquadId}/publish`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to publish.");
      setNotice(payload.message ?? "Published to Coach Board.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="squad-builder" onSubmit={saveSquad}>
      <header className="section-heading compact">
        <div>
          <h3>Build your XI</h3>
          <p className="community-panel-lead">
            Name your lineup, pick a formation, and enter players. Publish to share a{" "}
            <code>squad_share</code> post (moderated like Fan Chat).
          </p>
        </div>
        <label className="feed-control-field">
          Formation
          <select
            className="feed-control-input"
            value={formation}
            onChange={(event) => changeFormation(event.target.value)}
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

      <div className="squad-builder-grid">
        {slots.map((slot, index) => (
          <label className="squad-builder-slot feed-control-field" key={slot.slot}>
            <span>
              {slot.role} #{slot.slot}
            </span>
            <input
              className="feed-control-input"
              placeholder="Player name"
              value={slot.label}
              onChange={(event) => updateSlot(index, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="squad-builder-actions">
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save squad"}
        </button>
        <button className="button secondary" disabled={busy || !lastSquadId} type="button" onClick={publishSquad}>
          Publish to Coach Board
        </button>
      </div>

      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </form>
  );
}
