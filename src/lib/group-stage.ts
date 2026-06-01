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
