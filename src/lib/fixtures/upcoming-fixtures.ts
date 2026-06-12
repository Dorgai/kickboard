import { mapApiFootballStatusShort } from "@/lib/api-football";
import {
  buildApiFootballFixtureKey,
  buildWorldCupFixtureKey,
  formatFixtureLabel,
  parseFixtureSortKey,
  sortFixtureOptions,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";
import { teamsMatch } from "@/lib/squads/team-names";

type WorldCupGroupFixture = {
  homeTeam: string;
  awayTeam: string;
  date: string | null;
};

type WorldCupGroup = {
  group: string;
  fixtures: WorldCupGroupFixture[];
};

type LiveFixtureInput = {
  fixtureId: number;
  date: string;
  status: { short: string };
  homeTeam: string;
  awayTeam: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

export function buildFixtureOptionsFromWorldCup(groups: WorldCupGroup[], liveFixtures: LiveFixtureInput[] = []) {
  const byKey = new Map<string, FixtureOption>();

  for (const group of groups) {
    for (const fixture of group.fixtures) {
      const key = buildWorldCupFixtureKey({
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        date: fixture.date,
        group: group.group
      });
      if (byKey.has(key)) continue;
      byKey.set(key, {
        key,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        date: fixture.date,
        group: group.group,
        status: "upcoming",
        label: formatFixtureLabel({
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          date: fixture.date,
          group: group.group
        }),
        sortKey: parseFixtureSortKey(fixture.date)
      });
    }
  }

  for (const live of liveFixtures) {
    const status = mapApiFootballStatusShort(live.status.short);
    let merged = false;

    for (const [existingKey, existing] of byKey) {
      if (
        !teamsMatch(existing.homeTeam, live.homeTeam) ||
        !teamsMatch(existing.awayTeam, live.awayTeam)
      ) {
        continue;
      }

      byKey.set(existingKey, {
        ...existing,
        date: live.date || existing.date,
        status,
        homeGoals: live.homeGoals,
        awayGoals: live.awayGoals,
        label: formatFixtureLabel({
          homeTeam: existing.homeTeam,
          awayTeam: existing.awayTeam,
          date: live.date || existing.date,
          group: existing.group
        }),
        sortKey: parseFixtureSortKey(live.date || existing.date)
      });
      merged = true;
      break;
    }

    if (!merged) {
      const key = buildApiFootballFixtureKey(live.fixtureId);
      byKey.set(key, {
        key,
        homeTeam: live.homeTeam,
        awayTeam: live.awayTeam,
        date: live.date,
        group: null,
        status,
        homeGoals: live.homeGoals,
        awayGoals: live.awayGoals,
        label: formatFixtureLabel({
          homeTeam: live.homeTeam,
          awayTeam: live.awayTeam,
          date: live.date
        }),
        sortKey: parseFixtureSortKey(live.date)
      });
    }
  }

  return sortFixtureOptions(Array.from(byKey.values()));
}
