"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { TeamLabel } from "@/components/team-label";

type FixturePredictionPickProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
  inline?: boolean;
};

export function FixturePredictionPick({
  fixtureKey,
  homeTeam,
  awayTeam,
  inline = false
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
      setNotice("Saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save pick.");
    } finally {
      setBusy(false);
    }
  }

  const isInline = inline;

  return (
    <form
      className={`fixture-prediction-pick${isInline ? " fixture-prediction-pick--inline" : " fixture-prediction-pick--card"}`}
      onSubmit={savePick}
    >
      <span className="fixture-prediction-pick-label">Score pick</span>

      <div className="fixture-prediction-scores">
        <label className="fixture-prediction-team-score">
          <TeamLabel name={homeTeam} size="xs" />
          <input
            aria-label={`${homeTeam} goals`}
            className="feed-control-input fixture-prediction-input"
            inputMode="numeric"
            max={20}
            min={0}
            type="number"
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
          />
        </label>
        <span className="fixture-prediction-separator">:</span>
        <label className="fixture-prediction-team-score">
          <TeamLabel name={awayTeam} size="xs" />
          <input
            aria-label={`${awayTeam} goals`}
            className="feed-control-input fixture-prediction-input"
            inputMode="numeric"
            max={20}
            min={0}
            type="number"
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
          />
        </label>
        <button className="button primary fixture-prediction-save" disabled={busy || loading} type="submit">
          {busy ? "…" : "Save"}
        </button>
      </div>

      {notice ? <span className="fixture-prediction-notice">{notice}</span> : null}
      {error ? <span className="fixture-prediction-error">{error}</span> : null}
    </form>
  );
}
