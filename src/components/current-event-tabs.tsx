"use client";

import { HelpTooltip } from "@/components/help-tooltip";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CommunityConnectionsPanel } from "@/components/community-connections-panel";
import { FeedTabBar } from "@/components/feed-tab-bar";
import { FloatingFanChat } from "@/components/floating-fan-chat";
import { NAVIGATE_PREDICTIONS_EVENT } from "@/lib/session-checkpoint/navigate";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";
import { MatchCoachBoardRow } from "@/components/match-coach-board-row";
import { PredictionsPanel } from "@/components/predictions-panel";
import { TeamLabel } from "@/components/team-label";

export const CURRENT_EVENT_TAB_IDS = [
  "tournament",
  "coach-board",
  "predictions",
  "community"
] as const;
export type CurrentEventTabId = (typeof CURRENT_EVENT_TAB_IDS)[number];

const CURRENT_EVENT_TABS = [
  { id: "tournament" as const, label: "Tournament" },
  { id: "coach-board" as const, label: "Coach Board" },
  { id: "predictions" as const, label: "Predictions" },
  { id: "community" as const, label: "Community" }
] as const;

const CURRENT_KNOCKOUT_STAGES = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Final"
] as const;

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

function hashTarget() {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "").trim().toLowerCase();
}

function parseHash(hash: string): { tab: CurrentEventTabId; chatOpen: boolean } {
  if (hash === "fan-chat") {
    return { tab: "coach-board", chatOpen: true };
  }
  if (hash === "community") {
    return { tab: "community", chatOpen: false };
  }
  if (hash === "tournament" || hash === "bracket") {
    return { tab: "tournament", chatOpen: false };
  }
  if (hash === "coach-board") {
    return { tab: "coach-board", chatOpen: false };
  }
  if (hash === "predictions") {
    return { tab: "predictions", chatOpen: false };
  }
  return { tab: "predictions", chatOpen: false };
}

function setHashForTab(tab: CurrentEventTabId) {
  const next = tab === "tournament" ? "tournament" : tab;
  if (typeof window !== "undefined") {
    window.location.hash = next;
  }
}

type SummaryTileProps = {
  label: string;
  value: string;
  compact?: boolean;
};

function SummaryTile({ label, value, compact = false }: SummaryTileProps) {
  return (
    <div className={`summary-tile${compact ? " summary-tile--compact" : ""}`}>
      <span className="summary-tile-label">{label}</span>
      <strong className="summary-tile-value">{value}</strong>
    </div>
  );
}

type TournamentSummary = CurrentWorldCup["summary"];

function TournamentSummaryDialog({
  title,
  summary
}: {
  title: string;
  summary: TournamentSummary;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        className="button secondary current-event-summary-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        Tournament details
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="timeline-modal tournament-summary-modal"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => closeDialogOnBackdropClick(event, close)}
        onClose={close}
      >
        <div className="timeline-modal-panel">
          <header className="timeline-modal-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h2 id={titleId}>{title}</h2>
            </div>
            <button className="button secondary timeline-modal-close" type="button" onClick={close}>
              Close
            </button>
          </header>
          <div className="timeline-modal-body">
            <div className="current-summary-grid current-summary-grid--popup">
              <SummaryTile label="Hosts" value={summary.hostCountries ?? "—"} />
              <SummaryTile label="Dates" value={summary.dates ?? "—"} />
              <SummaryTile label="Teams" value={summary.teams ?? "—"} />
              <SummaryTile label="Venues" value={summary.venueCount ?? "—"} />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function CurrentEventTabs({
  currentWorldCup
}: {
  currentWorldCup: CurrentWorldCup | null;
}) {
  const groups = currentWorldCup?.groups ?? [];
  const summary = currentWorldCup?.summary ?? {
    hostCountries: null,
    dates: null,
    teams: null,
    venueCount: null
  };
  const [activeTab, setActiveTab] = useState<CurrentEventTabId>("predictions");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeGroupLetter, setActiveGroupLetter] = useState(groups[0]?.group ?? "A");
  const [activeKnockoutStage, setActiveKnockoutStage] = useState<string>(CURRENT_KNOCKOUT_STAGES[0]);

  const applyHash = useCallback(() => {
    const { tab, chatOpen: openChat } = parseHash(hashTarget());
    setActiveTab(tab);
    setChatOpen(openChat);
  }, []);

  useEffect(() => {
    applyHash();
    if (!hashTarget()) {
      window.location.hash = "predictions";
    }
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  useEffect(() => {
    function onNavigatePredictions() {
      setActiveTab("predictions");
      setChatOpen(false);
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

  function setChatOpenWithHash(open: boolean) {
    setChatOpen(open);
    if (typeof window === "undefined") return;
    if (open) {
      window.location.hash = "fan-chat";
    } else if (hashTarget() === "fan-chat") {
      window.location.hash = activeTab;
    }
  }

  return (
    <section className={`current-world-cup-card current-event-tabs-layout${chatOpen ? " fan-chat-dock-open" : ""}`}>
      <div className="current-event-overview">
        <div className="current-event-overview-heading">
          <h2>{currentWorldCup?.title ?? "2026 FIFA World Cup"}</h2>
          <div className="current-event-overview-actions">
            <TournamentSummaryDialog
              summary={summary}
              title={currentWorldCup?.title ?? "2026 FIFA World Cup"}
            />
            <HelpTooltip label="About tournament squads and data sources" size="md">
              {currentWorldCup?.note ? (
                <>
                  {currentWorldCup.note}
                  {" "}
                </>
              ) : null}
              Tournament summary and groups come from public pages. Live scores appear when API-Football
              and the worker are configured.
            </HelpTooltip>
          </div>
        </div>
      </div>

      <nav className="event-tab-bar current-event-section-tabs" aria-label="Current event sections">
        {CURRENT_EVENT_TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            type="button"
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="current-event-tab-panel" role="tabpanel">
        {activeTab === "tournament" ? (
          <section className="bracket-tree-card surface-muted current-event-bracket" id="tournament">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Tournament path</p>
                <h2>Route to the final</h2>
                <p>Use tabs to browse groups and knockout stages. Knockout pairings appear when live data connects.</p>
              </div>
            </div>

            <div className="bracket-tabbed-section">
              <h3 className="bracket-tabbed-heading">Group stage</h3>
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
                  {activeGroup ? (
                    <div className="bracket-cluster">
                      <div className="bracket-cluster-teams">
                        {activeGroup.teams.map((team) => (
                          <div className="bracket-team-slot" key={`${activeGroup.group}-${team}`}>
                            <TeamLabel name={team} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <button className="bracket-tbd-slot" disabled type="button">
                  <strong>Groups A–L</strong>
                  <span>Loading from public feed</span>
                </button>
              )}
            </div>

            <div className="bracket-tabbed-section">
              <h3 className="bracket-tabbed-heading">Knockout</h3>
              <FeedTabBar
                ariaLabel="Knockout stages"
                className="bracket-stage-tabs"
                tabs={CURRENT_KNOCKOUT_STAGES.map((stage) => ({ id: stage, label: stage }))}
                value={activeKnockoutStage}
                onChange={setActiveKnockoutStage}
              />
              <button className="bracket-tbd-slot" disabled type="button">
                <strong>Pairings TBD</strong>
                <span>
                  {activeKnockoutStage === "Final" ? "July 19, 2026" : "Live feed pending"} ·{" "}
                  {activeKnockoutStage}
                </span>
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "coach-board" ? (
          <div className="current-event-coach-tab" id="coach-board">
            <MatchCoachBoardRow groups={groups} />
          </div>
        ) : null}

        {activeTab === "predictions" ? (
          <div className="current-event-predictions-tab" id="predictions">
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

      <FloatingFanChat open={chatOpen} onOpenChange={setChatOpenWithHash} />
    </section>
  );
}
