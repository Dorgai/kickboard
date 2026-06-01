const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

type FixtureTeams = {
  homeTeam: string;
  awayTeam: string;
};

/** Infer group letters (A–L) from group-stage fixtures via connected components. */
export function inferTeamToGroup(matches: FixtureTeams[]) {
  const adjacency = new Map<string, Set<string>>();

  for (const match of matches) {
    if (!adjacency.has(match.homeTeam)) adjacency.set(match.homeTeam, new Set());
    if (!adjacency.has(match.awayTeam)) adjacency.set(match.awayTeam, new Set());
    adjacency.get(match.homeTeam)!.add(match.awayTeam);
    adjacency.get(match.awayTeam)!.add(match.homeTeam);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const team of adjacency.keys()) {
    if (visited.has(team)) continue;

    const stack = [team];
    const component: string[] = [];
    visited.add(team);

    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    components.push(component.sort((left, right) => left.localeCompare(right)));
  }

  components.sort((left, right) => left[0].localeCompare(right[0]));

  const teamToGroup = new Map<string, string>();
  components.forEach((teams, index) => {
    const letter = GROUP_LETTERS[index] ?? String(index + 1);
    teams.forEach((team) => teamToGroup.set(team, letter));
  });

  return teamToGroup;
}

export type GroupStageMatchResult = FixtureTeams & {
  homeScore: number;
  awayScore: number;
};

export type GroupStandingRow = {
  rank: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type MutableStanding = Omit<GroupStandingRow, "rank" | "goalDifference">;

function compareStandings(left: MutableStanding, right: MutableStanding) {
  if (right.points !== left.points) return right.points - left.points;
  const leftGd = left.goalsFor - left.goalsAgainst;
  const rightGd = right.goalsFor - right.goalsAgainst;
  if (rightGd !== leftGd) return rightGd - leftGd;
  if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
  return left.team.localeCompare(right.team);
}

/** Final group table from completed group-stage fixtures (3 pts win, 1 draw). */
export function computeGroupStandings(matches: GroupStageMatchResult[]): GroupStandingRow[] {
  const teams = new Set<string>();
  for (const match of matches) {
    teams.add(match.homeTeam);
    teams.add(match.awayTeam);
  }

  const table = new Map<string, MutableStanding>();
  for (const team of teams) {
    table.set(team, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    });
  }

  for (const match of matches) {
    const home = table.get(match.homeTeam);
    const away = table.get(match.awayTeam);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const sorted = Array.from(table.values()).sort(compareStandings);
  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
    goalDifference: row.goalsFor - row.goalsAgainst
  }));
}

export function groupMatchesByLetter<T extends FixtureTeams & { date: string }>(
  matches: T[],
  teamToGroup: Map<string, string>
) {
  const grouped = new Map<string, T[]>();

  for (const match of matches) {
    const letter =
      teamToGroup.get(match.homeTeam) ??
      teamToGroup.get(match.awayTeam);
    if (!letter) continue;

    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter)!.push(match);
  }

  for (const list of grouped.values()) {
    list.sort((left, right) => left.date.localeCompare(right.date));
  }

  return GROUP_LETTERS.filter((letter) => grouped.has(letter)).map((letter) => ({
    letter,
    matches: grouped.get(letter) ?? []
  }));
}
