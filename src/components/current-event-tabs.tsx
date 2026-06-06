"use client";

import { useCallback, useEffect, useState } from "react";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";
import { CommunityConnectionsPanel } from "@/components/community-connections-panel";
import { FeedTabBar } from "@/components/feed-tab-bar";
import {
  navigateToHome,
  readLocationHash,
  scrollToLocationHashTarget,
  subscribeLocationHash,
  writeLocationHash
} from "@/lib/navigation/location-hash";
import { scrollToPredictionsTop } from "@/lib/scroll-to-prediction-outcome";
import {
  NAVIGATE_PREDICTIONS_EVENT,
  type NavigatePredictionsDetail
} from "@/lib/session-checkpoint/navigate";
import { MatchCoachBoardRow } from "@/components/match-coach-board-row";
import { PredictionsPanel } from "@/components/predictions-panel";
import {
  TournamentGroupSchedule,
  TournamentKnockoutSchedule
} from "@/components/tournament-schedule-actions";

export const CURRENT_EVENT_TAB_IDS = [
  "tournament",
  "predictions",
  "coach-board",
  "community"
] as const;
export type CurrentEventTabId = (typeof CURRENT_EVENT_TAB_IDS)[number];

const CURRENT_EVENT_TABS = [
  { id: "tournament" as const, label: "Tournament" },
  { id: "predictions" as const, label: "Predictions" },
  { id: "coach-board" as const, label: "Coach Board" },
  { id: "community" as const, label: "Community" }
] as const;

/** Shown in the section tab dock — Community lives in the header menu. */
const CURRENT_EVENT_DOCK_TABS = CURRENT_EVENT_TABS.filter((tab) => tab.id !== "community");

function dockTabLabel(tab: (typeof CURRENT_EVENT_DOCK_TABS)[number], mobile: boolean) {
  if (mobile && tab.id === "coach-board") {
    return (
      <>
        Coach
        <br />
        Board
      </>
    );
  }
  return tab.label;
}

const CURRENT_KNOCKOUT_STAGES = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Final"
] as const;

const TOURNAMENT_PHASE_TABS = [
  { id: "group-stage", label: "Group stage" },
  { id: "knockout", label: "Knockout" }
] as const;

type TournamentPhaseId = (typeof TOURNAMENT_PHASE_TABS)[number]["id"];

type CurrentWorldCup = {
  title: string;
  note: string;
  summary: {
    hostCountries: string | null;
    dates: string | null;
    teams: string | null;
    venueCount: string | null;
  };
  groups: Array<{
    group: string;
    teams: string[];
    fixtures: Array<{
      homeTeam: string;
      awayTeam: string;
      date: string | null;
    }>;
  }>;
};

function parseHash(hash: string): CurrentEventTabId {
  if (hash === "community") {
    return "community";
  }
  if (hash === "tournament" || hash === "bracket") {
    return "tournament";
  }
  if (hash === "coach-board") {
    return "coach-board";
  }
  if (
    hash === "predictions" ||
    hash === "predictions-tournament" ||
    hash === "predictions-match" ||
    hash === "tournament-picks"
  ) {
    return "predictions";
  }
  return "predictions";
}

function setHashForTab(tab: CurrentEventTabId) {
  writeLocationHash(tab === "tournament" ? "tournament" : tab);
}

export function CurrentEventTabs({
  currentWorldCup
}: {
  currentWorldCup: CurrentWorldCup | null;
}) {
  const groups = currentWorldCup?.groups ?? [];
  const [activeTab, setActiveTab] = useState<CurrentEventTabId>("predictions");
  const [activeTournamentPhase, setActiveTournamentPhase] = useState<TournamentPhaseId>("group-stage");
  const [activeGroupLetter, setActiveGroupLetter] = useState(groups[0]?.group ?? "A");
  const [activeKnockoutStage, setActiveKnockoutStage] = useState<string>(CURRENT_KNOCKOUT_STAGES[0]);
  const mobileDock = useNarrowViewport(861);

  const applyHash = useCallback(() => {
    const hash = readLocationHash();
    if (hash === "fan-chat") {
      return;
    }
    setActiveTab(parseHash(hash));
    scrollToLocationHashTarget(hash);
  }, []);

  useEffect(() => {
    applyHash();
    if (!readLocationHash()) {
      navigateToHome({ replace: true });
    }
    return subscribeLocationHash(applyHash);
  }, [applyHash]);

  useEffect(() => {
    function onNavigatePredictions(event: Event) {
      const detail = (event as CustomEvent<NavigatePredictionsDetail>).detail;
      setActiveTab("predictions");
      if (detail?.scrollToTop) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => scrollToPredictionsTop());
        });
      }
    }

    window.addEventListener(NAVIGATE_PREDICTIONS_EVENT, onNavigatePredictions);
    return () => window.removeEventListener(NAVIGATE_PREDICTIONS_EVENT, onNavigatePredictions);
  }, []);

  useEffect(() => {
    if (groups.length && !groups.some((group) => group.group === activeGroupLetter)) {
      setActiveGroupLetter(groups[0].group);
    }
  }, [activeGroupLetter, groups]);

  const activeGroup = groups.find((group) => group.group === activeGroupLetter);

  function selectTab(tab: CurrentEventTabId) {
    setActiveTab(tab);
    setHashForTab(tab);
  }

  return (
    <section className="current-event-tabs-layout">
      <div className="kickboard-mobile-dock-event">
        <nav
          className="event-tab-bar current-event-section-tabs kickboard-tab-bar"
          aria-label="Current event sections"
        >
          {CURRENT_EVENT_DOCK_TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              type="button"
              onClick={() => selectTab(tab.id)}
            >
              {dockTabLabel(tab, mobileDock)}
            </button>
          ))}
        </nav>
      </div>

      <div className="current-event-tab-panel" role="tabpanel">
        {activeTab === "tournament" ? (
          <section className="bracket-tree-card surface-muted current-event-bracket" id="tournament">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Tournament path</p>
                <h2>Route to the final</h2>
                <p>Switch between group stage and knockout, then pick a group or round.</p>
              </div>
            </div>

            <div className="kickboard-tab-rail tournament-phase-tabs-rail">
              <FeedTabBar
                ariaLabel="Tournament stage"
                className="tournament-phase-tabs kickboard-tab-bar"
                tabs={TOURNAMENT_PHASE_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
                value={activeTournamentPhase}
                onChange={(id) => setActiveTournamentPhase(id as TournamentPhaseId)}
              />
            </div>

            {activeTournamentPhase === "group-stage" ? (
              <div className="bracket-tabbed-section tournament-phase-panel" id="group-stage" role="tabpanel">
                {groups.length ? (
                  <>
                    <FeedTabBar
                      ariaLabel="Group stage groups"
                      className="bracket-stage-tabs"
                      tabs={groups.map((group) => ({
                        id: group.group,
                        label: `Group ${group.group}`
                      }))}
                      value={activeGroupLetter}
                      onChange={setActiveGroupLetter}
                    />
                    {activeGroup ? <TournamentGroupSchedule group={activeGroup} /> : null}
                  </>
                ) : (
                  <button className="bracket-tbd-slot" disabled type="button">
                    <strong>Groups A–L</strong>
                    <span>Loading from public feed</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="bracket-tabbed-section tournament-phase-panel" id="bracket" role="tabpanel">
                <FeedTabBar
                  ariaLabel="Knockout stages"
                  className="bracket-stage-tabs"
                  tabs={CURRENT_KNOCKOUT_STAGES.map((stage) => ({ id: stage, label: stage }))}
                  value={activeKnockoutStage}
                  onChange={setActiveKnockoutStage}
                />
                <TournamentKnockoutSchedule stage={activeKnockoutStage} />
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "coach-board" ? (
          <div className="current-event-coach-tab" id="coach-board">
            <MatchCoachBoardRow groups={groups} />
          </div>
        ) : null}

        {activeTab === "predictions" ? (
          <div className="current-event-predictions-tab section-anchor" id="predictions">
            <PredictionsPanel groups={groups} />
          </div>
        ) : null}

        {activeTab === "community" ? (
          <div className="current-event-community-tab section-anchor" id="community">
            <section className="data-card surface-flat community-section">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Connections</p>
                  <h2>Community</h2>
                  <p>Find friends, accept invites, and share your registration link.</p>
                </div>
              </div>
              <CommunityConnectionsPanel />
            </section>
          </div>
        ) : null}
      </div>

    </section>
  );
}
