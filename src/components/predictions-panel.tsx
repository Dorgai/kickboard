"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthGate } from "@/components/auth-gate";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { PanelHelpRow } from "@/components/help-tooltip";
import { FixturePredictionsForm } from "@/components/fixture-predictions-form";
import { TournamentPredictionsForm } from "@/components/tournament-predictions-form";
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
import {
  NAVIGATE_PREDICTIONS_EVENT,
  type NavigatePredictionsDetail
} from "@/lib/session-checkpoint/navigate";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";

export const PREDICTION_SUB_TAB_IDS = ["tournament", "match"] as const;
export type PredictionSubTabId = (typeof PREDICTION_SUB_TAB_IDS)[number];

const PREDICTION_SUB_TABS = [
  { id: "tournament" as const, label: "Tournament picks", shortLabel: "Tournament" },
  { id: "match" as const, label: "Match picks", shortLabel: "Matches" }
] as const;

function readPredictionSubTab(): PredictionSubTabId {
  if (typeof window === "undefined") return "match";
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (hash === "predictions-tournament" || hash === "tournament-picks") return "tournament";
  if (hash === "predictions-match") return "match";
  const param = new URLSearchParams(window.location.search).get("predictionsTab")?.trim();
  if (param === "tournament" || param === "match") return param;
  if (new URLSearchParams(window.location.search).get("predictionsFixture")?.trim()) {
    return "match";
  }
  return "match";
}

function hashForPredictionSubTab(subTab: PredictionSubTabId) {
  return subTab === "tournament" ? "predictions-tournament" : "predictions-match";
}

type PredictionsPanelProps = {
  groups?: WorldCupGroupInput[];
};

export function PredictionsPanel({ groups = [] }: PredictionsPanelProps) {
  const { data: session } = useSession();
  const touchLayout = useNarrowViewport();
  const fixtures = useFixtureOptions(groups);
  const [subTab, setSubTab] = useState<PredictionSubTabId>("match");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [overviewRefresh, setOverviewRefresh] = useState(0);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const scrollToOutcomeAfterSelect = useRef(false);

  useEffect(() => {
    setSubTab(readPredictionSubTab());
  }, []);

  const selectSubTab = useCallback((next: PredictionSubTabId) => {
    setSubTab(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("predictionsTab", next);
    url.hash = hashForPredictionSubTab(next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

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
      setSubTab("match");
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace(/^#/, "");
        if (hash !== "predictions-match" && hash !== "predictions") {
          window.location.hash = "predictions-match";
        }
      }
      return;
    }
    setSelectedKey((current) =>
      current && fixtures.some((fixture) => fixture.key === current) ? current : fixtures[0].key
    );
  }, [fixtures]);

  const handleFixtureSelect = useCallback((key: string) => {
    setSelectedKey(key);
  }, []);

  const handleEditPick = useCallback(
    (key: string) => {
      const exists = fixtures.some((fixture) => fixture.key === key);
      if (!exists) return;
      scrollToOutcomeAfterSelect.current = true;
      setSubTab("match");
      setSelectedKey(key);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("predictionsFixture", key);
        url.searchParams.set("predictionsTab", "match");
        url.hash = "predictions-match";
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      window.requestAnimationFrame(() => scrollToPredictionsEditor());
    },
    [fixtures]
  );

  useEffect(() => {
    if (!selectedKey || !scrollToOutcomeAfterSelect.current || subTab !== "match") return;
    scrollToOutcomeAfterSelect.current = false;
    const frame = window.requestAnimationFrame(() => scrollToPredictionOutcomeOnMobile());
    return () => window.cancelAnimationFrame(frame);
  }, [selectedKey, subTab]);

  useEffect(() => {
    function onNavigatePredictions(event: Event) {
      const detail = (event as CustomEvent<NavigatePredictionsDetail>).detail;
      const key = detail?.fixtureKey?.trim();
      if (!key) return;
      handleEditPick(key);
    }

    window.addEventListener(NAVIGATE_PREDICTIONS_EVENT, onNavigatePredictions);
    return () => window.removeEventListener(NAVIGATE_PREDICTIONS_EVENT, onNavigatePredictions);
  }, [handleEditPick]);

  const viewerDisplayName = session?.user?.name ?? null;
  const selected = fixtures.find((fixture) => fixture.key === selectedKey) ?? null;

  const subTabButtons = PREDICTION_SUB_TABS.map((tab) => ({
    id: tab.id,
    label: touchLayout ? tab.shortLabel : tab.label
  }));

  return (
    <AuthGate featureLabel="Predictions">
      <div className="predictions-panel">
        <FeedTabBar
          ariaLabel="Prediction type"
          className="predictions-sub-tabs"
          tabs={subTabButtons}
          value={subTab}
          onChange={(id) => selectSubTab(id as PredictionSubTabId)}
        />

        {subTab === "tournament" ? (
          <div className="predictions-sub-panel" id="predictions-tournament" role="tabpanel">
            <TournamentPredictionsForm
              groups={groups}
              onSaved={() => {
                setOverviewRefresh((token) => token + 1);
                setActivityRefresh((token) => token + 1);
              }}
            />
          </div>
        ) : (
          <div className="predictions-sub-panel" id="predictions-match" role="tabpanel">
            {fixtures.length > 0 && selected ? (
              <div className="predictions-match-row">
                <FixtureMatchPicker
                  ariaLabel="Select a match for your prediction"
                  fixtures={fixtures}
                  rail={touchLayout}
                  selectedKey={selectedKey}
                  timeline={!touchLayout}
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

            <PanelHelpRow
              className="panel-help-row--block predictions-settle-help"
              help={
                <>
                  Points update after each match finishes. Until then, picks show as{" "}
                  <strong>Pending</strong>.
                </>
              }
              helpLabel="How points settle"
              title="Scoring"
              titleClassName="predictions-settle-help-title"
            />
          </div>
        )}
      </div>
    </AuthGate>
  );
}
