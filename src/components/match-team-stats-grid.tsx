import { TEAM_MATCH_STAT_CHIPS, type TeamMatchStatRow } from "@/lib/player-stat-metrics";
import { TeamLabel } from "@/components/team-label";

export type MatchTeamStatColumn = TeamMatchStatRow & { team: string };

type MatchTeamStatsGridProps = {
  columns: MatchTeamStatColumn[];
};

export function MatchTeamStatsGrid({ columns }: MatchTeamStatsGridProps) {
  if (!columns.length) return null;

  const gridStyle =
    columns.length === 1
      ? { gridTemplateColumns: "minmax(96px, 1.35fr) minmax(52px, 1fr)" }
      : {
          gridTemplateColumns: `minmax(96px, 1.35fr) repeat(${columns.length}, minmax(52px, 1fr))`
        };

  return (
    <div className="match-team-stats-grid">
      <div className="match-team-stats-grid-row match-team-stats-grid-row--head" style={gridStyle}>
        <span className="match-team-stats-grid-stat">Stat</span>
        {columns.map((team) => (
          <span className="match-team-stats-grid-team" key={team.team}>
            <TeamLabel name={team.team} size="xs" />
          </span>
        ))}
      </div>
      {TEAM_MATCH_STAT_CHIPS.map((stat) => (
        <div className="match-team-stats-grid-row" key={stat.id} style={gridStyle}>
          <span className="match-team-stats-grid-stat">{stat.label}</span>
          {columns.map((team) => (
            <span className="match-team-stats-grid-value" key={`${team.team}-${stat.id}`}>
              {stat.format(team)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
