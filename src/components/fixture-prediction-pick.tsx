"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type FixturePredictionPickProps = {
  fixtureKey: string;
  fixtureLabel: string;
  compact?: boolean;
};

export function FixturePredictionPick({
  fixtureKey,
  fixtureLabel,
  compact = false
}: FixturePredictionPickProps) {
  const [homeScore, setHomeScore] = useState("1");
  const [awayScore, setAwayScore] = useState("0");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/fixture-predictions?${params}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as {
          prediction?: { homeScore: number; awayScore: number } | null;
        };
        if (payload.prediction) {
          setHomeScore(String(payload.prediction.homeScore));
          setAwayScore(String(payload.prediction.awayScore));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fixtureKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePick(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/fixture-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureKey,
          homeScore: Number(homeScore),
          awayScore: Number(awayScore)
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save pick.");
      setNotice(payload.message ?? "Pick saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save pick.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`fixture-prediction-pick${compact ? " fixture-prediction-pick--compact" : ""}`}
      onSubmit={savePick}
    >
      <div className="fixture-prediction-pick-header">
        <h3>{compact ? "Your score pick" : "Predict the score"}</h3>
        {!compact ? (
          <p className="community-panel-lead">
            Free-to-play pick for <strong>{fixtureLabel}</strong>. Connected friends see this on the
            same match.
          </p>
        ) : null}
      </div>

      {loading ? <p className="inline-status">Loading your pick…</p> : null}

      <div className="fixture-prediction-scores">
        <label className="feed-control-field fixture-prediction-score-field">
          Home
          <input
            className="feed-control-input"
            inputMode="numeric"
            max={20}
            min={0}
            type="number"
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
          />
        </label>
        <span className="fixture-prediction-separator">:</span>
        <label className="feed-control-field fixture-prediction-score-field">
          Away
          <input
            className="feed-control-input"
            inputMode="numeric"
            max={20}
            min={0}
            type="number"
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy || loading} type="submit">
          {busy ? "Saving…" : "Save pick"}
        </button>
      </div>

      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </form>
  );
}
