"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { FixturePredictionPick } from "@/components/fixture-prediction-pick";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";

type WorldCupGroup = {
  group: string;
  fixtures: Array<{
    homeTeam: string;
    awayTeam: string;
    date: string | null;
  }>;
};

type PredictionsPanelProps = {
  groups?: WorldCupGroup[];
};

export function PredictionsPanel({ groups = [] }: PredictionsPanelProps) {
  const fixtures = useMemo(() => buildFixtureOptionsFromWorldCup(groups, []), [groups]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!fixtures.length) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((current) =>
      current && fixtures.some((fixture) => fixture.key === current) ? current : fixtures[0].key
    );
  }, [fixtures]);

  const selected = fixtures.find((fixture) => fixture.key === selectedKey) ?? null;

  return (
    <AuthGate featureLabel="Predictions">
      <div className="predictions-panel">
        <p className="community-panel-lead">
          Predictions are <strong>free-to-play skill games</strong> — virtual points only, not betting or
          real-money stakes (see <code>docs/predictions-legal.md</code>). Connected friends can compare
          score picks on the Coach Board for the same match.
        </p>

        {fixtures.length > 0 && selected ? (
          <div className="predictions-fixture-picker">
            <label className="feed-control-field">
              Match
              <select
                className="feed-control-input"
                value={selectedKey ?? ""}
                onChange={(event) => setSelectedKey(event.target.value)}
              >
                {fixtures.map((fixture) => (
                  <option key={fixture.key} value={fixture.key}>
                    {fixture.label}
                  </option>
                ))}
              </select>
            </label>
            <FixturePredictionPick
              awayTeam={selected.awayTeam}
              fixtureKey={selected.key}
              homeTeam={selected.homeTeam}
            />
          </div>
        ) : (
          <div className="predictions-coming-soon data-card surface-muted">
            <h3>Exact score picks</h3>
            <p>Select a match on the Coach Board or wait for the fixture list to load here.</p>
          </div>
        )}

        <div className="predictions-coming-soon data-card surface-muted">
          <h3>Points & MOTM — coming next</h3>
          <p>
            The database already has <code>predictions</code> and <code>wallet_ledger</code> tables. The
            worker will settle points after matches when API-Football live data is connected.
          </p>
          <ul className="predictions-spec-list">
            <li>Lock picks before kickoff</li>
            <li>Points credited via wallet ledger (no cash value)</li>
            <li>Leaderboard widget per <code>docs/widget-contract.md</code></li>
          </ul>
        </div>
      </div>
    </AuthGate>
  );
}
