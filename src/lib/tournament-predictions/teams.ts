export type WorldCupGroupInput = {
  group: string;
  fixtures: Array<{
    homeTeam: string;
    awayTeam: string;
    date: string | null;
  }>;
};

/** Unique nation names from the World Cup group feed. */
export function teamsFromWorldCupGroups(groups: WorldCupGroupInput[]) {
  const names = new Set<string>();
  for (const group of groups) {
    for (const fixture of group.fixtures) {
      const home = fixture.homeTeam?.trim();
      const away = fixture.awayTeam?.trim();
      if (home) names.add(home);
      if (away) names.add(away);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
