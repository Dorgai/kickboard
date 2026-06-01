import type { GroupStandingRow } from "@/lib/group-stage";
import { TeamLabel } from "@/components/team-label";

type GroupStageStandingsProps = {
  groupLetter: string;
  rows: GroupStandingRow[];
  qualifyCount?: number;
};

export function GroupStageStandings({
  groupLetter,
  rows,
  qualifyCount = 2
}: GroupStageStandingsProps) {
  if (!rows.length) {
    return (
      <p className="inline-status group-stage-standings-empty">
        No group-stage results to rank for Group {groupLetter} yet.
      </p>
    );
  }

  return (
    <div className="group-stage-standings-wrap">
      <h3 className="group-stage-standings-heading">Final group standings</h3>
      <div className="group-stage-standings-scroll">
        <table className="group-stage-standings-table">
          <caption className="group-stage-standings-caption">Group {groupLetter} final standings</caption>
          <thead>
            <tr>
              <th scope="col">Pos</th>
              <th scope="col">Team</th>
              <th scope="col">P</th>
              <th scope="col">W</th>
              <th scope="col">D</th>
              <th scope="col">L</th>
              <th scope="col">GF</th>
              <th scope="col">GA</th>
              <th scope="col">GD</th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const qualifies = row.rank <= qualifyCount;
              return (
                <tr
                  className={qualifies ? "group-stage-standings-row--qualified" : undefined}
                  key={row.team}
                >
                  <td>{row.rank}</td>
                  <th scope="row">
                    <TeamLabel name={row.team} size="xs" />
                  </th>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                  <td>{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="group-stage-standings-note">Top {qualifyCount} advance · sorted by points, goal difference, goals scored</p>
    </div>
  );
}
