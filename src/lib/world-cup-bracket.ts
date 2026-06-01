import type { StatsBombMatch } from "@/lib/statsbomb";

export type BracketMatch = {
  matchId: number;
  date: string;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  stadium: string | null;
};

export type BracketCluster = {
  label: string;
  groups: [string, string];
  matches: BracketMatch[];
};

export type BracketRound = {
  stage: string;
  matches: BracketMatch[];
  clusters?: BracketCluster[];
};

const GROUP_PAIR_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function toBracketMatch(match: StatsBombMatch): BracketMatch {
  return {
    matchId: match.match_id,
    date: match.match_date,
    stage: match.competition_stage?.name ?? "Unknown",
    homeTeam: match.home_team.home_team_name,
    awayTeam: match.away_team.away_team_name,
    homeScore: match.home_score,
    awayScore: match.away_score,
    stadium: match.stadium?.name ?? null
  };
}

function buildTeamGroups(groupMatches: StatsBombMatch[]) {
  const adjacency = new Map<string, Set<string>>();

  for (const match of groupMatches) {
    const home = match.home_team.home_team_name;
    const away = match.away_team.away_team_name;

    if (!adjacency.has(home)) adjacency.set(home, new Set());
    if (!adjacency.has(away)) adjacency.set(away, new Set());
    adjacency.get(home)!.add(away);
    adjacency.get(away)!.add(home);
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
    const letter = GROUP_PAIR_ORDER[index] ?? String(index + 1);
    teams.forEach((team) => teamToGroup.set(team, letter));
  });

  return teamToGroup;
}

function buildRoundOf16Clusters(roundMatches: BracketMatch[], teamToGroup: Map<string, string>) {
  const clusterMap = new Map<string, BracketCluster>();

  for (const match of roundMatches) {
    const homeGroup = teamToGroup.get(match.homeTeam);
    const awayGroup = teamToGroup.get(match.awayTeam);

    if (!homeGroup || !awayGroup) {
      const fallbackKey = "unknown";
      const existing = clusterMap.get(fallbackKey) ?? {
        label: "Knockout pairings",
        groups: ["?", "?"] as [string, string],
        matches: []
      };
      existing.matches.push(match);
      clusterMap.set(fallbackKey, existing);
      continue;
    }

    const groups: [string, string] =
      homeGroup < awayGroup ? [homeGroup, awayGroup] : [awayGroup, homeGroup];
    const key = groups.join("/");
    const existing = clusterMap.get(key) ?? {
      label: `Groups ${groups[0]} / ${groups[1]}`,
      groups,
      matches: []
    };
    existing.matches.push(match);
    clusterMap.set(key, existing);
  }

  return [...clusterMap.values()].sort((left, right) => {
    const leftIndex = GROUP_PAIR_ORDER.indexOf(left.groups[0]);
    const rightIndex = GROUP_PAIR_ORDER.indexOf(right.groups[0]);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}

export function buildKnockoutBracket(matches: StatsBombMatch[]): BracketRound[] {
  const groupMatches = matches.filter((match) => match.competition_stage?.name === "Group Stage");
  const teamToGroup = buildTeamGroups(groupMatches);

  const knockoutMatches = matches
    .filter((match) => {
      const stage = match.competition_stage?.name ?? "";
      return stage && stage !== "Group Stage";
    })
    .map(toBracketMatch);

  const preferredStageOrder = [
    "Round of 32",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "3rd Place Final",
    "Final"
  ];

  const presentStages = [...new Set(knockoutMatches.map((match) => match.stage))].sort((left, right) => {
    const leftIndex = preferredStageOrder.indexOf(left);
    const rightIndex = preferredStageOrder.indexOf(right);
    const leftRank = leftIndex === -1 ? preferredStageOrder.length + 1 : leftIndex;
    const rightRank = rightIndex === -1 ? preferredStageOrder.length + 1 : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });

  return presentStages
    .map((stage) => {
      const roundMatches = knockoutMatches.filter((match) => match.stage === stage);
      if (!roundMatches.length) return null;

      const round: BracketRound = { stage, matches: roundMatches };

      if (stage === "Round of 16" && teamToGroup.size > 0) {
        round.clusters = buildRoundOf16Clusters(roundMatches, teamToGroup);
        round.matches = round.clusters.flatMap((cluster) => cluster.matches);
      }

      return round;
    })
    .filter((round): round is BracketRound => round !== null);
}
