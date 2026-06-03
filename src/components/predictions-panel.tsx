"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthGate } from "@/components/auth-gate";
import { FixturePredictionsForm } from "@/components/fixture-predictions-form";
import { PredictionsOverview } from "@/components/predictions-overview";
import { UserPickActivityPanel } from "@/components/user-pick-activity-panel";
import {
  FixtureMatchPicker,
  useFixtureOptions,
  type WorldCupGroupInput
} from "@/components/fixture-match-picker";
import {
  scrollToPredictionOutcomeOnMobile,
  scrollToPredictionsEditor
} from "@/lib/scroll-to-prediction-outcome";

type PredictionsPanelProps = {
  groups?: WorldCupGroupInput[];
};

export function PredictionsPanel({ groups = [] }: PredictionsPanelProps) {
  const { data: session } = useSession();
  const fixtures = useFixtureOptions(groups);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [overviewRefresh, setOverviewRefresh] = useState(0);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const scrollToOutcomeAfterSelect = useRef(false);

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

  const handleFixtureSelect = useCallback((key: string) => {
    scrollToOutcomeAfterSelect.current = true;
    setSelectedKey(key);
  }, []);

  const handleEditPick = useCallback(
    (key: string) => {
      const exists = fixtures.some((fixture) => fixture.key === key);
      if (!exists) return;
      setSelectedKey(key);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("predictionsFixture", key);
        url.hash = "predictions";
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      window.requestAnimationFrame(() => scrollToPredictionsEditor());
    },
    [fixtures]
  );

  useEffect(() => {
    if (!selectedKey || !scrollToOutcomeAfterSelect.current) return;
    scrollToOutcomeAfterSelect.current = false;
    const frame = window.requestAnimationFrame(() => scrollToPredictionOutcomeOnMobile());
    return () => window.cancelAnimationFrame(frame);
  }, [selectedKey]);

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
              onSelect={handleFixtureSelect}
            />

            <div className="predictions-match-detail">
              <FixturePredictionsForm
                awayTeam={selected.awayTeam}
                fixtureKey={selected.key}
                homeTeam={selected.homeTeam}
                onSaved={() => {
                  setOverviewRefresh((token) => token + 1);
                  setActivityRefresh((token) => token + 1);
                }}
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
          onEditPick={handleEditPick}
        />

        <UserPickActivityPanel refreshToken={activityRefresh} />

        <p className="community-panel-lead predictions-settle-note">
          Points update after each match finishes. Until then, picks show as <strong>Pending</strong>.
        </p>
      </div>
    </AuthGate>
  );
}
