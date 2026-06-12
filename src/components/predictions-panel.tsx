"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthGate } from "@/components/auth-gate";
import { useTranslation } from "@/components/locale-provider";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { FixturePredictionsForm } from "@/components/fixture-predictions-form";
import { TournamentPredictionsForm } from "@/components/tournament-predictions-form";
import {
  PredictionsPicksSection,
  PredictionsPointsBoard,
  usePredictionsOverview
} from "@/components/predictions-overview";
import {
  TournamentPicksSection,
  useTournamentPredictionsOverview
} from "@/components/tournament-predictions-overview";
import { UserPickActivityPanel } from "@/components/user-pick-activity-panel";
import { FixtureMatchHeader } from "@/components/fixture-match-header";
import {
  FixtureMatchPicker,
  useFixtureOptions,
  type WorldCupGroupInput
} from "@/components/fixture-match-picker";
import {
  scrollToPredictionOutcomeOnMobile,
  scrollToPredictionsEditor,
  scrollToPredictionsPicks,
  scrollToPredictionsTop
} from "@/lib/scroll-to-prediction-outcome";
import {
  NAVIGATE_PREDICTIONS_EVENT,
  type NavigatePredictionsDetail
} from "@/lib/session-checkpoint/navigate";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";

export const PREDICTION_SUB_TAB_IDS = ["tournament", "match"] as const;
export type PredictionSubTabId = (typeof PREDICTION_SUB_TAB_IDS)[number];

const PREDICTION_SUB_TAB_IDS_LIST = [
  { id: "tournament" as const, labelKey: "predictions.tournamentPicks" as const, shortKey: "predictions.tournamentShort" as const },
  { id: "match" as const, labelKey: "predictions.matchPicks" as const, shortKey: "predictions.matchShort" as const }
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
  const { t } = useTranslation();
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
    const searchParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const fromQuery = searchParams?.get("predictionsFixture")?.trim() ?? null;
    const fromGroup = searchParams?.get("predictionsGroup")?.trim().toUpperCase() ?? null;

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

    if (fromGroup) {
      const groupFixtures = fixtures.filter((fixture) => fixture.group === fromGroup);
      const firstInGroup = groupFixtures[0]?.key ?? null;
      if (firstInGroup) {
        setSelectedKey(firstInGroup);
        setSubTab("match");
        if (typeof window !== "undefined") {
          const hash = window.location.hash.replace(/^#/, "");
          if (hash !== "predictions-match" && hash !== "predictions") {
            window.location.hash = "predictions-match";
          }
        }
        return;
      }
    }
    setSelectedKey((current) =>
      current && fixtures.some((fixture) => fixture.key === current) ? current : fixtures[0].key
    );
  }, [fixtures]);

  const handleFixtureSelect = useCallback((key: string) => {
    setSelectedKey(key);
  }, []);

  const handlePickNavigate = useCallback(
    (key: string) => {
      const exists = fixtures.some((fixture) => fixture.key === key);
      if (!exists) return;
      setSubTab("match");
      setSelectedKey(key);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("predictionsFixture", key);
        url.searchParams.set("predictionsTab", "match");
        url.hash = "predictions-match";
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      window.requestAnimationFrame(() => scrollToPredictionsPicks());
    },
    [fixtures]
  );

  const handleEditPick = useCallback(
    (key: string, options?: { scrollToTop?: boolean }) => {
      const exists = fixtures.some((fixture) => fixture.key === key);
      if (!exists) return;
      scrollToOutcomeAfterSelect.current = !options?.scrollToTop;
      setSubTab("match");
      setSelectedKey(key);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("predictionsFixture", key);
        url.searchParams.set("predictionsTab", "match");
        url.hash = "predictions-match";
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      window.requestAnimationFrame(() => {
        if (options?.scrollToTop) {
          scrollToPredictionsTop();
        } else {
          scrollToPredictionsEditor();
        }
      });
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
      if (key) {
        handleEditPick(key, { scrollToTop: detail?.scrollToTop });
        return;
      }

      const group = detail?.group?.trim().toUpperCase();
      if (!group) return;

      const firstInGroup = fixtures.find((fixture) => fixture.group === group)?.key;
      if (!firstInGroup) return;

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("predictionsGroup", group);
        url.searchParams.delete("predictionsFixture");
        url.searchParams.set("predictionsTab", "match");
        url.hash = "predictions-match";
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }

      handleEditPick(firstInGroup, { scrollToTop: detail?.scrollToTop });
    }

    window.addEventListener(NAVIGATE_PREDICTIONS_EVENT, onNavigatePredictions);
    return () => window.removeEventListener(NAVIGATE_PREDICTIONS_EVENT, onNavigatePredictions);
  }, [fixtures, handleEditPick]);

  const viewerDisplayName = session?.user?.name ?? null;
  const selected = fixtures.find((fixture) => fixture.key === selectedKey) ?? null;
  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError
  } = usePredictionsOverview({
    refreshToken: overviewRefresh
  });

  const {
    data: tournamentOverviewData,
    loading: tournamentOverviewLoading,
    error: tournamentOverviewError
  } = useTournamentPredictionsOverview({
    refreshToken: overviewRefresh
  });

  const scrollToTournamentForm = useCallback(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("tournament-predictions")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const subTabButtons = PREDICTION_SUB_TAB_IDS_LIST.map((tab) => ({
    id: tab.id,
    label: touchLayout ? t(tab.shortKey) : t(tab.labelKey)
  }));

  return (
    <AuthGate featureLabel={t("predictions.featureLabel")}>
      <div className="predictions-panel">
        <div className="kickboard-tab-rail predictions-sub-tabs-rail">
          <FeedTabBar
            ariaLabel={t("predictions.typeAria")}
            className="predictions-sub-tabs kickboard-tab-bar"
            tabs={subTabButtons}
            value={subTab}
            onChange={(id) => selectSubTab(id as PredictionSubTabId)}
          />
        </div>

        {subTab === "tournament" ? (
          <div className="predictions-sub-panel" id="predictions-tournament" role="tabpanel">
            <div className="predictions-tournament-layout">
              <TournamentPredictionsForm
                groups={groups}
                onSaved={() => {
                  setOverviewRefresh((token) => token + 1);
                  setActivityRefresh((token) => token + 1);
                }}
              />
              {tournamentOverviewLoading ? (
                <p className="inline-status predictions-points-loading">{t("predictions.loadingPicks")}</p>
              ) : null}
              {tournamentOverviewError ? (
                <p className="inline-status predictions-points-loading">{tournamentOverviewError}</p>
              ) : null}
              {!tournamentOverviewLoading && !tournamentOverviewError && tournamentOverviewData ? (
                <TournamentPicksSection
                  data={tournamentOverviewData}
                  onEditPick={scrollToTournamentForm}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="predictions-sub-panel" id="predictions-match" role="tabpanel">
            {fixtures.length > 0 && selected ? (
              <div className="predictions-match-layout">
                <div className="predictions-match-timeline">
                  <FixtureMatchPicker
                    ariaLabel={t("predictions.selectMatchAria")}
                    fixtures={fixtures}
                    rail={touchLayout}
                    selectedKey={selectedKey}
                    timeline={!touchLayout}
                    onSelect={handleFixtureSelect}
                  />
                </div>

                <div className="predictions-match-content">
                  <FixtureMatchHeader
                    align="center"
                    awayGoals={selected.awayGoals}
                    awayTeam={selected.awayTeam}
                    date={selected.date}
                    elapsed={selected.elapsed}
                    goalScorers={selected.goalScorers}
                    group={selected.group}
                    homeGoals={selected.homeGoals}
                    homeTeam={selected.homeTeam}
                    status={selected.status}
                    teamsSize="md"
                  />
                  <div className="predictions-match-form-points-row">
                    <FixturePredictionsForm
                      awayTeam={selected.awayTeam}
                      fixtureDate={selected.date}
                      fixtureKey={selected.key}
                      fixtureStatus={selected.status}
                      homeTeam={selected.homeTeam}
                      onSaved={() => {
                        setOverviewRefresh((token) => token + 1);
                        setActivityRefresh((token) => token + 1);
                      }}
                    />
                    {overviewLoading ? (
                      <p className="inline-status predictions-points-loading">{t("predictions.loadingPoints")}</p>
                    ) : null}
                    {overviewError ? (
                      <p className="inline-status predictions-points-loading">{overviewError}</p>
                    ) : null}
                    {!overviewLoading && !overviewError && overviewData ? (
                      <PredictionsPointsBoard
                        myPredictions={overviewData.myPredictions}
                        wallet={overviewData.wallet}
                        onPickClick={handlePickNavigate}
                      />
                    ) : null}
                  </div>

                  {!overviewLoading && !overviewError && overviewData ? (
                    <PredictionsPicksSection
                      activeFixtureKey={selectedKey}
                      data={overviewData}
                      fixtures={fixtures}
                      viewerDisplayName={viewerDisplayName}
                      onEditPick={handleEditPick}
                    />
                  ) : null}

                  <UserPickActivityPanel refreshToken={activityRefresh} />
                </div>
              </div>
            ) : (
              <div className="predictions-coming-soon data-card surface-muted">
                <h3>{t("predictions.pickMatch")}</h3>
                <p>{t("predictions.loadingFixtures")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
