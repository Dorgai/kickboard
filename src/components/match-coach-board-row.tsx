"use client";

import { useEffect, useMemo, useState } from "react";
import { CoachBoardPanel } from "@/components/coach-board-panel";
import { MatchTeamsLine } from "@/components/team-label";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";

type WorldCupGroup = {
  group: string;
  fixtures: Array<{
    homeTeam: string;
    awayTeam: string;
    date: string | null;
  }>;
};

type MatchCoachBoardRowProps = {
  groups: WorldCupGroup[];
};

type RealtimeFixture = {
  fixtureId: number;
  date: string;
  status: { short: string };
  homeTeam: string;
  awayTeam: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

export function MatchCoachBoardRow({ groups }: MatchCoachBoardRowProps) {
  const [liveFixtures, setLiveFixtures] = useState<RealtimeFixture[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLive() {
      try {
        const response = await fetch("/api/feeds/realtime", { cache: "no-store" });
        const payload = (await response.json()) as {
          connected?: boolean;
          fixtures?: RealtimeFixture[];
        };
        if (!cancelled && payload.connected && payload.fixtures?.length) {
          setLiveFixtures(payload.fixtures);
        }
      } catch {
        /* optional live feed */
      }
    }

    void loadLive();
    const interval = window.setInterval(loadLive, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const fixtures = useMemo(
    () => buildFixtureOptionsFromWorldCup(groups, liveFixtures),
    [groups, liveFixtures]
  );

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
        <aside className="match-fixture-picker" aria-label="Select a match">
          {fixtures.length === 0 ? (
            <p className="inline-status">Fixture list is loading from the tournament feed.</p>
          ) : (
            <ul className="match-fixture-picker-list">
              {fixtures.map((fixture) => (
                <li key={fixture.key}>
                  <FixturePickerButton
                    fixture={fixture}
                    selected={fixture.key === selectedKey}
                    onSelect={() => setSelectedKey(fixture.key)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="match-coach-board-panel">
          {selected ? (
            <CoachBoardPanel fixtureKey={selected.key} fixtureLabel={selected.label} />
          ) : (
            <p className="inline-status">Select a match to open its Coach Board.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function FixturePickerButton({
  fixture,
  selected,
  onSelect
}: {
  fixture: FixtureOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`match-fixture-picker-btn${selected ? " selected" : ""}`}
      type="button"
      onClick={onSelect}
    >
      <span className="match-fixture-picker-status" data-status={fixture.status}>
        {fixture.status === "live" ? "Live" : fixture.status === "finished" ? "FT" : "Upcoming"}
      </span>
      <MatchTeamsLine
        awayTeam={fixture.awayTeam}
        homeTeam={fixture.homeTeam}
        layout="stacked"
        size="xs"
      />
      {fixture.homeGoals != null && fixture.awayGoals != null ? (
        <span className="match-fixture-picker-score">
          {fixture.homeGoals} – {fixture.awayGoals}
        </span>
      ) : null}
      {fixture.date ? <span className="match-fixture-picker-date">{fixture.date}</span> : null}
    </button>
  );
}
