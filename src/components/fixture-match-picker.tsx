"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchTeamsLine } from "@/components/team-label";
import { writeFixtureDragData } from "@/lib/fixtures/drag-fixture";
import {
  groupFixturesByDate,
  sortFixtureOptions,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";
import {
  buildGroupFixtureOptions,
  buildKnockoutFixtureOptions
} from "@/lib/feeds/wc26-tournament-schedule";
import { buildFixtureOptionsFromWorldCup } from "@/lib/fixtures/upcoming-fixtures";

export type WorldCupGroupInput = {
  group: string;
  teams?: string[];
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

  return useMemo(() => {
    const byKey = new Map<string, FixtureOption>();
    for (const fixture of buildGroupFixtureOptions(groups)) {
      byKey.set(fixture.key, fixture);
    }
    for (const fixture of buildFixtureOptionsFromWorldCup(groups, liveFixtures)) {
      byKey.set(fixture.key, fixture);
    }
    for (const fixture of buildKnockoutFixtureOptions()) {
      if (!byKey.has(fixture.key)) byKey.set(fixture.key, fixture);
    }
    return sortFixtureOptions(Array.from(byKey.values()));
  }, [groups, liveFixtures]);
}

function fixtureMatchesSearch(fixture: FixtureOption, query: string) {
  const haystack = [
    fixture.homeTeam,
    fixture.awayTeam,
    fixture.label,
    fixture.group ?? "",
    fixture.date ?? "",
    fixture.status
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

type FixtureMatchPickerProps = {
  fixtures: FixtureOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  ariaLabel?: string;
  emptyMessage?: string;
  /** Group matches by day with a vertical timeline rail (Predictions / Coach Board picker). */
  timeline?: boolean;
  /** Single horizontal row of matches (mobile Coach Board). */
  rail?: boolean;
  /** Compact search filter (Coach Board). */
  searchable?: boolean;
  /** Allow dragging a match to drop on saved boards (Coach Board). */
  draggableMatches?: boolean;
};

export function FixtureMatchPicker({
  fixtures,
  selectedKey,
  onSelect,
  ariaLabel = "Select a match",
  emptyMessage = "Fixture list is loading from the tournament feed.",
  timeline = true,
  rail = false,
  searchable = false,
  draggableMatches = false
}: FixtureMatchPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFixtures = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!searchable || !query) return fixtures;
    return fixtures.filter((fixture) => fixtureMatchesSearch(fixture, query));
  }, [fixtures, searchQuery, searchable]);

  const dateGroups = useMemo(
    () => (timeline ? groupFixturesByDate(filteredFixtures) : []),
    [filteredFixtures, timeline]
  );

  return (
    <aside className="match-fixture-picker" aria-label={ariaLabel}>
      {searchable ? (
        <label className="match-fixture-picker-search match-list-search">
          <input
            aria-label="Search matches on Coach Board"
            autoComplete="off"
            placeholder="Search matches…"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      ) : null}
      {fixtures.length === 0 ? (
        <p className="inline-status">{emptyMessage}</p>
      ) : searchable && searchQuery.trim() && filteredFixtures.length === 0 ? (
        <p className="inline-status">No matches match your search.</p>
      ) : rail && filteredFixtures.length > 0 ? (
        <ul className="match-fixture-picker-list match-fixture-picker-list--rail">
          {filteredFixtures.map((fixture) => (
            <li key={fixture.key}>
              <FixturePickerButton
                draggable={draggableMatches}
                fixture={fixture}
                selected={fixture.key === selectedKey}
                showDate={Boolean(fixture.date)}
                onSelect={() => onSelect(fixture.key)}
              />
            </li>
          ))}
        </ul>
      ) : timeline && dateGroups.length > 0 ? (
        <ul className="match-fixture-picker-list match-fixture-picker-list--timeline">
          {dateGroups.map((group) => (
            <li className="match-fixture-picker-date-group" key={group.dateKey}>
              <div className="match-fixture-picker-timeline-heading">
                <span aria-hidden className="match-fixture-picker-timeline-node" />
                <span className="match-fixture-picker-timeline-date">{group.label}</span>
              </div>
              <ul className="match-fixture-picker-date-matches">
                {group.fixtures.map((fixture) => (
                  <li key={fixture.key}>
                    <FixturePickerButton
                      draggable={draggableMatches}
                      fixture={fixture}
                      selected={fixture.key === selectedKey}
                      showDate={false}
                      onSelect={() => onSelect(fixture.key)}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="match-fixture-picker-list">
          {filteredFixtures.map((fixture) => (
            <li key={fixture.key}>
              <FixturePickerButton
                draggable={draggableMatches}
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
  onSelect,
  showDate = true,
  draggable = false
}: {
  fixture: FixtureOption;
  selected: boolean;
  onSelect: () => void;
  showDate?: boolean;
  draggable?: boolean;
}) {
  return (
    <button
      className={`match-fixture-picker-btn${selected ? " selected" : ""}${
        draggable ? " match-fixture-picker-btn--draggable" : ""
      }`}
      draggable={draggable}
      type="button"
      onClick={onSelect}
      onDragStart={
        draggable
          ? (event) => {
              writeFixtureDragData(event.dataTransfer, fixture.key);
              event.dataTransfer.effectAllowed = "copy";
            }
          : undefined
      }
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
      {showDate && fixture.date ? (
        <span className="match-fixture-picker-date">{fixture.date}</span>
      ) : null}
    </button>
  );
}
