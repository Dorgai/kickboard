import {
  buildApiFootballFixtureKey,
  buildWorldCupFixtureKey,
  formatFixtureLabel,
  parseFixtureSortKey,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";

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
    const key = buildApiFootballFixtureKey(live.fixtureId);
    const status = live.status.short === "FT" ? "finished" : "live";
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

  return Array.from(byKey.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
