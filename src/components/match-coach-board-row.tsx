"use client";

import { useEffect, useRef, useState } from "react";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";
import { CoachBoardPanel } from "@/components/coach-board-panel";
import { HelpTooltip } from "@/components/help-tooltip";
import {
  FixtureMatchPicker,
  useFixtureOptions,
  type WorldCupGroupInput
} from "@/components/fixture-match-picker";
import { isFixtureDragEvent, readFixtureDragData } from "@/lib/fixtures/drag-fixture";

type MatchCoachBoardRowProps = {
  groups: WorldCupGroupInput[];
};

export function MatchCoachBoardRow({ groups }: MatchCoachBoardRowProps) {
  const touchLayout = useNarrowViewport();
  const fixtures = useFixtureOptions(groups);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fixtureDragDepthRef = useRef(0);
  const [panelFixtureDragOver, setPanelFixtureDragOver] = useState(false);

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
          {selected ? (
            <CoachBoardPanel
              awayGoals={selected.awayGoals}
              awayTeam={selected.awayTeam}
              date={selected.date}
              fixtureKey={selected.key}
              fixtureLabel={selected.label}
              group={selected.group}
              homeGoals={selected.homeGoals}
              homeTeam={selected.homeTeam}
              status={selected.status}
              touchLayout={touchLayout}
              onFixtureDrop={touchLayout ? undefined : setSelectedKey}
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
