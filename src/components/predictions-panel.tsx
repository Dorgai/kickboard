"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { FixturePredictionsForm } from "@/components/fixture-predictions-form";
import { PredictionsOverview } from "@/components/predictions-overview";
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
  const [overviewRefresh, setOverviewRefresh] = useState(0);

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
        <PredictionsOverview fixtureKey={selectedKey} refreshToken={overviewRefresh} />

        <p className="community-panel-lead">
          Predictions are <strong>free-to-play skill games</strong> — virtual points only, not betting or
          real-money stakes (see <code>docs/predictions-legal.md</code>). For each match you can pick a{" "}
          <strong>winner or draw</strong>, an <strong>exact score</strong>, and <strong>goal scorers</strong>{" "}
          — each settled separately for points.
        </p>

        {fixtures.length > 0 && selected ? (
          <div className="predictions-match-row">
            <FixtureMatchPicker
              ariaLabel="Select a match for your prediction"
              fixtures={fixtures}
              selectedKey={selectedKey}
              timeline
              onSelect={setSelectedKey}
            />

            <div className="predictions-match-detail">
              <FixturePredictionsForm
                awayTeam={selected.awayTeam}
                fixtureKey={selected.key}
                homeTeam={selected.homeTeam}
                onSaved={() => setOverviewRefresh((token) => token + 1)}
              />
            </div>
          </div>
        ) : (
          <div className="predictions-coming-soon data-card surface-muted">
            <h3>Exact score picks</h3>
            <p>Fixture list is loading from the tournament feed.</p>
          </div>
        )}

        <p className="community-panel-lead predictions-settle-note">
          Results and balances above update when matches finish and picks are settled (API-Football live
          data). Until then, each category shows <strong>Pending</strong>.
        </p>
      </div>
    </AuthGate>
  );
}
