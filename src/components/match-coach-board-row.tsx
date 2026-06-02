"use client";

import { useEffect, useRef, useState } from "react";
import { CoachBoardPanel } from "@/components/coach-board-panel";
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
          <h2>Coach Board</h2>
          <p className="match-coach-row-lead">
            Pick an upcoming fixture, then build and share a squad for that game only.
          </p>
        </div>
      </div>

      <div className="match-coach-row-body">
        <FixtureMatchPicker
          draggableMatches
          fixtures={fixtures}
          searchable
          selectedKey={selectedKey}
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
              awayTeam={selected.awayTeam}
              fixtureKey={selected.key}
              fixtureLabel={selected.label}
              homeTeam={selected.homeTeam}
              onFixtureDrop={setSelectedKey}
            />
          ) : (
            <p className="inline-status match-coach-board-panel-empty">
              Select a match from the list, or drag one here to open its Coach Board.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
