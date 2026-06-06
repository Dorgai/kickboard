import {
  buildWorldCupFixtureKey,
  formatFixtureDateDivider,
  formatFixtureLabel,
  parseFixtureSortKey,
  type FixtureOption
} from "@/lib/fixtures/fixture-key";

export type TournamentScheduleFixture = {
  homeTeam: string;
  awayTeam: string;
  date: string | null;
};

export type KnockoutPlaceholderMatch = TournamentScheduleFixture & {
  matchId: string;
  stage: string;
  stageSlug: string;
  fixtureKey: string;
  label: string;
};

const GROUP_STAGE_MATCH_COUNT = 6;

/** Standard round-robin pairings for a four-team group (placeholder order). */
const GROUP_PAIRINGS: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3]
];

function stageSlug(stage: string) {
  return stage
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function teamAtIndex(teams: string[], index: number) {
  const team = teams[index]?.trim();
  return team || "TBD";
}

/** Group fixtures from feed, or six placeholder games with team/date slots. */
export function fixturesForGroupDisplay(group: {
  group: string;
  teams?: string[];
  fixtures: TournamentScheduleFixture[];
}): TournamentScheduleFixture[] {
  if (group.fixtures.length > 0) {
    return group.fixtures.map((fixture) => ({
      homeTeam: fixture.homeTeam?.trim() || "TBD",
      awayTeam: fixture.awayTeam?.trim() || "TBD",
      date: fixture.date
    }));
  }

  const teams = (group.teams ?? []).map((team) => team.trim()).filter(Boolean);
  if (teams.length >= 4) {
    return GROUP_PAIRINGS.map(([homeIndex, awayIndex]) => ({
      homeTeam: teamAtIndex(teams, homeIndex),
      awayTeam: teamAtIndex(teams, awayIndex),
      date: null
    }));
  }

  return Array.from({ length: GROUP_STAGE_MATCH_COUNT }, () => ({
    homeTeam: teamAtIndex(teams, 0),
    awayTeam: teamAtIndex(teams, 1),
    date: null
  }));
}

function buildKnockoutMatch(input: {
  stage: string;
  matchIndex: number;
  homeTeam: string;
  awayTeam: string;
  date: string | null;
}): KnockoutPlaceholderMatch {
  const slug = stageSlug(input.stage);
  const matchId = `${slug}-${input.matchIndex + 1}`;
  const fixtureKey = buildWorldCupFixtureKey({
    group: `ko-${slug}-${input.matchIndex + 1}`,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    date: input.date
  });

  return {
    matchId,
    stage: input.stage,
    stageSlug: slug,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    date: input.date,
    fixtureKey,
    label: `${input.stage} · Match ${input.matchIndex + 1}`
  };
}

/** Knockout placeholders with bracket slot labels and scheduled dates (teams TBD until draw). */
export function knockoutPlaceholdersForStage(stage: string): KnockoutPlaceholderMatch[] {
  switch (stage) {
    case "Round of 32":
      return [
        ["2nd Group A", "2nd Group B", "June 28, 2026"],
        ["Winner Group E", "3rd Group A/B/C", "June 28, 2026"],
        ["Winner Group F", "2nd Group C", "June 29, 2026"],
        ["Winner Group C", "2nd Group F", "June 29, 2026"],
        ["Winner Group I", "3rd Group C/D/E", "June 30, 2026"],
        ["2nd Group E", "2nd Group I", "June 30, 2026"],
        ["Winner Group A", "3rd Group C/E/F", "July 1, 2026"],
        ["Winner Group L", "3rd Group E/H/I", "July 1, 2026"],
        ["Winner Group D", "3rd Group B/E/F", "July 2, 2026"],
        ["Winner Group G", "3rd Group A/E/H", "July 2, 2026"],
        ["2nd Group K", "2nd Group L", "July 3, 2026"],
        ["Winner Group H", "2nd Group J", "July 3, 2026"],
        ["Winner Group B", "3rd Group E/F/G", "July 3, 2026"],
        ["Winner Group J", "2nd Group H", "July 3, 2026"],
        ["2nd Group D", "2nd Group G", "July 3, 2026"],
        ["Winner Group K", "3rd Group D/G/I", "July 3, 2026"]
      ].map(([homeTeam, awayTeam, date], index) =>
        buildKnockoutMatch({ stage, matchIndex: index, homeTeam, awayTeam, date })
      );
    case "Round of 16":
      return Array.from({ length: 8 }, (_, index) =>
        buildKnockoutMatch({
          stage,
          matchIndex: index,
          homeTeam: `Winner R32 match ${index * 2 + 1}`,
          awayTeam: `Winner R32 match ${index * 2 + 2}`,
          date: index < 4 ? "July 4, 2026" : "July 5, 2026"
        })
      );
    case "Quarter-finals":
      return Array.from({ length: 4 }, (_, index) =>
        buildKnockoutMatch({
          stage,
          matchIndex: index,
          homeTeam: `Winner R16 match ${index * 2 + 1}`,
          awayTeam: `Winner R16 match ${index * 2 + 2}`,
          date: index < 2 ? "July 9, 2026" : "July 10, 2026"
        })
      );
    case "Semi-finals":
      return [
        buildKnockoutMatch({
          stage,
          matchIndex: 0,
          homeTeam: "Winner QF match 1",
          awayTeam: "Winner QF match 2",
          date: "July 14, 2026"
        }),
        buildKnockoutMatch({
          stage,
          matchIndex: 1,
          homeTeam: "Winner QF match 3",
          awayTeam: "Winner QF match 4",
          date: "July 15, 2026"
        })
      ];
    case "Final":
      return [
        buildKnockoutMatch({
          stage,
          matchIndex: 0,
          homeTeam: "Winner SF match 1",
          awayTeam: "Winner SF match 2",
          date: "July 19, 2026"
        })
      ];
    default:
      return [];
  }
}

export function allKnockoutPlaceholderMatches() {
  return [
    "Round of 32",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "Final"
  ].flatMap((stage) => knockoutPlaceholdersForStage(stage));
}

export function buildGroupFixtureOptions(
  groups: Array<{
    group: string;
    teams?: string[];
    fixtures: TournamentScheduleFixture[];
  }>
): FixtureOption[] {
  const options: FixtureOption[] = [];

  for (const group of groups) {
    const fixtures = fixturesForGroupDisplay(group);
    fixtures.forEach((fixture, index) => {
      const key = fixtureKeyForGroupMatch(group.group, fixture, index);
      options.push({
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
    });
  }

  return options;
}

export function buildKnockoutFixtureOptions(): FixtureOption[] {
  return allKnockoutPlaceholderMatches().map((match) => ({
    key: match.fixtureKey,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    date: match.date,
    group: null,
    status: "upcoming" as const,
    label: match.label,
    sortKey: match.date ?? "9999-99-99"
  }));
}

export function formatTournamentFixtureDate(date: string | null) {
  if (!date?.trim()) return "Date TBD";
  return formatFixtureDateDivider(date);
}

export function fixtureKeyForGroupMatch(
  group: string,
  fixture: TournamentScheduleFixture,
  index: number
) {
  return buildWorldCupFixtureKey({
    group,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    date: fixture.date ?? `placeholder-${index + 1}`
  });
}
