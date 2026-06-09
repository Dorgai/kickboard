import { teamsMatch } from "@/lib/squads/team-names";

export type CommunityDistributionOption = {
  key: string;
  label: string | null;
  count: number;
  percent: number;
};

export type CommunityDistribution = {
  scope: "fixture" | "tournament";
  category: string;
  totalPicks: number;
  eligiblePredictors: number;
  participationPercent: number;
  options: CommunityDistributionOption[];
};

export function lookupTeamCrowdPercent(
  distribution: CommunityDistribution | null | undefined,
  teamName: string
) {
  if (!distribution?.totalPicks) return null;
  const match = distribution.options.find((option) => teamsMatch(option.key, teamName));
  return match?.percent ?? 0;
}

export function outcomeCrowdPercents(distribution: CommunityDistribution | null | undefined) {
  const byKey = new Map(distribution?.options.map((option) => [option.key, option.percent]) ?? []);
  return {
    home: byKey.get("home") ?? 0,
    draw: byKey.get("draw") ?? 0,
    away: byKey.get("away") ?? 0,
    totalPicks: distribution?.totalPicks ?? 0,
    participationPercent: distribution?.participationPercent ?? 0
  };
}
