"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { FixturePredictionPick } from "@/components/fixture-prediction-pick";
import {
  FixtureMatchPicker,
  useFixtureOptions,
  type WorldCupGroupInput
} from "@/components/fixture-match-picker";

type PredictionsPanelProps = {
  groups?: WorldCupGroupInput[];
};

export function PredictionsPanel({ groups = [] }: PredictionsPanelProps) {
  const fixtures = useFixtureOptions(groups);
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
          real-money stakes (see <code>docs/predictions-legal.md</code>). Pick a match, then enter your
          score. Connected friends can compare picks on the Coach Board for the same game.
        </p>

        {fixtures.length > 0 && selected ? (
          <div className="predictions-match-row">
            <FixtureMatchPicker
              ariaLabel="Select a match for your prediction"
              fixtures={fixtures}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />

            <div className="predictions-match-detail">
              <FixturePredictionPick
                awayTeam={selected.awayTeam}
                fixtureKey={selected.key}
                homeTeam={selected.homeTeam}
              />
            </div>
          </div>
        ) : (
          <div className="predictions-coming-soon data-card surface-muted">
            <h3>Exact score picks</h3>
            <p>Fixture list is loading from the tournament feed.</p>
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
