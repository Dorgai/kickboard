"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";
import { CoachBoardPanel } from "@/components/coach-board-panel";
import { HelpTooltip } from "@/components/help-tooltip";
import { SavedSquadsBar } from "@/components/saved-squads-bar";
import {
  FixtureMatchPicker,
  useFixtureOptions,
  type WorldCupGroupInput
} from "@/components/fixture-match-picker";
import {
  fixtureKeyToShortLabel,
  formatFixtureTeamsLabel,
  sortCoachBoardFixtures
} from "@/lib/fixtures/fixture-key";
import { isFixtureDragEvent, readFixtureDragData } from "@/lib/fixtures/drag-fixture";
import type { SquadSummary } from "@/lib/squads/store";

type MatchCoachBoardRowProps = {
  groups: WorldCupGroupInput[];
};

export function MatchCoachBoardRow({ groups }: MatchCoachBoardRowProps) {
  const touchLayout = useNarrowViewport();
  const { data: session, status: sessionStatus } = useSession();
  const allFixtures = useFixtureOptions(groups);
  const fixtures = useMemo(
    () => sortCoachBoardFixtures(allFixtures.filter((fixture) => fixture.status !== "finished")),
    [allFixtures]
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fixtureDragDepthRef = useRef(0);
  const [panelFixtureDragOver, setPanelFixtureDragOver] = useState(false);
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [squadsLoading, setSquadsLoading] = useState(false);
  const [activeSquadId, setActiveSquadId] = useState<string | null>(null);
  const [newBoardNonce, setNewBoardNonce] = useState(0);

  const canLoadSquads =
    sessionStatus === "authenticated" && Boolean(session?.user?.onboardingComplete);

  const fixtureLabelForKey = useCallback(
    (fixtureKey: string) => {
      const fixture = fixtures.find((entry) => entry.key === fixtureKey);
      if (fixture) {
        return formatFixtureTeamsLabel(fixture.homeTeam, fixture.awayTeam) || fixture.label;
      }
      return fixtureKeyToShortLabel(fixtureKey);
    },
    [fixtures]
  );

  const refreshSquads = useCallback(async () => {
    if (!canLoadSquads) {
      setSquads([]);
      return [];
    }

    setSquadsLoading(true);
    try {
      const response = await fetch("/api/squads", { cache: "no-store" });
      if (!response.ok) {
        setSquads([]);
        return [];
      }
      const payload = (await response.json()) as { squads?: SquadSummary[] };
      const list = payload.squads ?? [];
      setSquads(list);
      return list;
    } catch {
      setSquads([]);
      return [];
    } finally {
      setSquadsLoading(false);
    }
  }, [canLoadSquads]);

  useEffect(() => {
    void refreshSquads();
  }, [refreshSquads]);

  useEffect(() => {
    if (!fixtures.length) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((current) =>
      current && fixtures.some((fixture) => fixture.key === current) ? current : fixtures[0].key
    );
  }, [fixtures]);

  useEffect(() => {
    setNewBoardNonce(0);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey) {
      setActiveSquadId(null);
      return;
    }
    if (newBoardNonce > 0) return;

    const squadForFixture = squads.find((squad) => squad.fixtureKey === selectedKey);
    setActiveSquadId((current) => {
      if (current && squads.some((squad) => squad.id === current && squad.fixtureKey === selectedKey)) {
        return current;
      }
      return squadForFixture?.id ?? null;
    });
  }, [selectedKey, squads, newBoardNonce]);

  function handlePanelFixtureDragEnter(event: React.DragEvent) {
    if (!isFixtureDragEvent(event)) return;
    event.preventDefault();
    fixtureDragDepthRef.current += 1;
    setPanelFixtureDragOver(true);
    event.dataTransfer.dropEffect = "copy";
  }

  function handlePanelFixtureDragLeave(event: React.DragEvent) {
    if (!isFixtureDragEvent(event)) return;
    fixtureDragDepthRef.current = Math.max(0, fixtureDragDepthRef.current - 1);
    if (fixtureDragDepthRef.current === 0) {
      setPanelFixtureDragOver(false);
    }
  }

  function handlePanelFixtureDragOver(event: React.DragEvent) {
    if (!isFixtureDragEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handlePanelFixtureDrop(event: React.DragEvent) {
    event.preventDefault();
    fixtureDragDepthRef.current = 0;
    setPanelFixtureDragOver(false);
    const fixtureKey = readFixtureDragData(event.dataTransfer);
    if (!fixtureKey) return;
    setSelectedKey(fixtureKey);
  }

  function handleSelectSquad(squad: SquadSummary) {
    if (squad.fixtureKey) {
      setSelectedKey(squad.fixtureKey);
    }
    setNewBoardNonce(0);
    setActiveSquadId(squad.id);
  }

  function handleNewBoard() {
    setActiveSquadId(null);
    setNewBoardNonce((value) => value + 1);
  }

  const handleSquadSaved = useCallback(
    async (savedId: string) => {
      setNewBoardNonce(0);
      const list = await refreshSquads();
      const saved = list.find((squad) => squad.id === savedId);
      if (saved?.fixtureKey) {
        setSelectedKey(saved.fixtureKey);
      }
      setActiveSquadId(savedId || list.find((squad) => squad.fixtureKey === selectedKey)?.id || null);
    },
    [refreshSquads, selectedKey]
  );

  const selected = fixtures.find((fixture) => fixture.key === selectedKey) ?? null;

  return (
    <section className="match-coach-row section-anchor" id="coach-board">
      <div className="match-coach-row-header">
        <div>
          <p className="eyebrow">Per match</p>
          <h2 className="panel-help-row">
            Coach Board
            <HelpTooltip label="How Coach Board works" size="sm">
              {touchLayout
                ? "Tap a match below, then build your squad on the pitch."
                : "Pick an upcoming fixture, then build and share a squad for that game only."}
            </HelpTooltip>
          </h2>
        </div>
      </div>

      <div className="match-coach-row-body">
        <FixtureMatchPicker
          draggableMatches={!touchLayout}
          fixtures={fixtures}
          rail={touchLayout}
          searchable
          selectedKey={selectedKey}
          timeline={!touchLayout}
          onSelect={setSelectedKey}
        />

        <div
          className={`match-coach-board-panel${
            panelFixtureDragOver ? " match-coach-board-panel--fixture-drag-over" : ""
          }`}
          onDragEnter={handlePanelFixtureDragEnter}
          onDragLeave={handlePanelFixtureDragLeave}
          onDragOver={handlePanelFixtureDragOver}
          onDrop={handlePanelFixtureDrop}
        >
          {canLoadSquads ? (
            <SavedSquadsBar
              activeSquadId={activeSquadId}
              fixtureLabelForKey={fixtureLabelForKey}
              loading={squadsLoading}
              selectedFixtureKey={selectedKey}
              squads={squads}
              touchLayout={touchLayout}
              onFixtureDrop={touchLayout ? undefined : setSelectedKey}
              onNew={handleNewBoard}
              onSelect={handleSelectSquad}
            />
          ) : null}

          {selected ? (
            <CoachBoardPanel
              activeSquadId={activeSquadId}
              awayGoals={selected.awayGoals}
              awayTeam={selected.awayTeam}
              date={selected.date}
              fixtureKey={selected.key}
              fixtureLabel={selected.label}
              group={selected.group}
              elapsed={selected.elapsed}
              goalScorers={selected.goalScorers}
              homeGoals={selected.homeGoals}
              homeTeam={selected.homeTeam}
              newBoardNonce={newBoardNonce}
              status={selected.status}
              onSquadSaved={handleSquadSaved}
            />
          ) : (
            <p className="inline-status match-coach-board-panel-empty">
              {touchLayout
                ? "Tap a match above to open its Coach Board."
                : "Select a match from the list, or drag one here to open its Coach Board."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
