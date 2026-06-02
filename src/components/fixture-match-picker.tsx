"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchTeamsLine } from "@/components/team-label";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";

export type WorldCupGroupInput = {
  group: string;
  fixtures: Array<{
    homeTeam: string;
    awayTeam: string;
    date: string | null;
  }>;
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

export function useFixtureOptions(groups: WorldCupGroupInput[]) {
  const [liveFixtures, setLiveFixtures] = useState<RealtimeFixture[]>([]);

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

  return useMemo(
    () => buildFixtureOptionsFromWorldCup(groups, liveFixtures),
    [groups, liveFixtures]
  );
}

type FixtureMatchPickerProps = {
  fixtures: FixtureOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  ariaLabel?: string;
  emptyMessage?: string;
};

export function FixtureMatchPicker({
  fixtures,
  selectedKey,
  onSelect,
  ariaLabel = "Select a match",
  emptyMessage = "Fixture list is loading from the tournament feed."
}: FixtureMatchPickerProps) {
  return (
    <aside className="match-fixture-picker" aria-label={ariaLabel}>
      {fixtures.length === 0 ? (
        <p className="inline-status">{emptyMessage}</p>
      ) : (
        <ul className="match-fixture-picker-list">
          {fixtures.map((fixture) => (
            <li key={fixture.key}>
              <FixturePickerButton
                fixture={fixture}
                selected={fixture.key === selectedKey}
                onSelect={() => onSelect(fixture.key)}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function FixturePickerButton({
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
