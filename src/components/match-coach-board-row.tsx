"use client";

import { useEffect, useState } from "react";
import { CoachBoardPanel } from "@/components/coach-board-panel";
import {
  FixtureMatchPicker,
  useFixtureOptions,
  type WorldCupGroupInput
} from "@/components/fixture-match-picker";

type MatchCoachBoardRowProps = {
  groups: WorldCupGroupInput[];
};

export function MatchCoachBoardRow({ groups }: MatchCoachBoardRowProps) {
  const fixtures = useFixtureOptions(groups);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
          fixtures={fixtures}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />

        <div className="match-coach-board-panel">
          {selected ? (
            <CoachBoardPanel
              awayTeam={selected.awayTeam}
              fixtureKey={selected.key}
              fixtureLabel={selected.label}
              homeTeam={selected.homeTeam}
            />
          ) : (
            <p className="inline-status">Select a match to open its Coach Board.</p>
          )}
        </div>
      </div>
    </section>
  );
}
