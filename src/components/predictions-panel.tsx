"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const fixtures = useFixtureOptions(groups);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [overviewRefresh, setOverviewRefresh] = useState(0);

  useEffect(() => {
    if (!fixtures.length) {
      setSelectedKey(null);
      return;
    }
    const fromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("predictionsFixture")?.trim()
        : null;
    if (fromQuery && fixtures.some((fixture) => fixture.key === fromQuery)) {
      setSelectedKey(fromQuery);
      if (typeof window !== "undefined" && window.location.hash.replace(/^#/, "") !== "predictions") {
        window.location.hash = "predictions";
      }
      return;
    }
    setSelectedKey((current) =>
      current && fixtures.some((fixture) => fixture.key === current) ? current : fixtures[0].key
    );
  }, [fixtures]);

  const viewerDisplayName = session?.user?.name ?? null;

  const selected = fixtures.find((fixture) => fixture.key === selectedKey) ?? null;

  return (
    <AuthGate featureLabel="Predictions">
      <div className="predictions-panel">
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
            <h3>Pick a match</h3>
            <p>Loading upcoming fixtures from the tournament feed.</p>
          </div>
        )}

        <PredictionsOverview
          fixtureKey={selectedKey}
          refreshToken={overviewRefresh}
          viewerDisplayName={viewerDisplayName}
        />

        <p className="community-panel-lead predictions-settle-note">
          Points update after each match finishes. Until then, picks show as <strong>Pending</strong>.
        </p>
      </div>
    </AuthGate>
  );
}
