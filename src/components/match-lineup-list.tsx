import { LINEUP_ROLE_LABELS, LINEUP_ROLE_ORDER, type LineupRole } from "@/lib/lineup-roles";
import { TeamLabel } from "@/components/team-label";

export type MatchLineupPlayer = {
  playerId: number;
  name: string;
  jerseyNumber: number | null;
  country: string | null;
  lineupRole: LineupRole;
};

export type MatchLineupTeam = {
  teamName: string;
  players: MatchLineupPlayer[];
};

type MatchLineupListProps = {
  teams: MatchLineupTeam[];
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number) => void;
  /** Home and away columns side by side when two teams are present. */
  layout?: "stacked" | "paired";
};

function sortByJersey(players: MatchLineupPlayer[]) {
  return [...players].sort((left, right) => {
    const leftNum = left.jerseyNumber ?? 999;
    const rightNum = right.jerseyNumber ?? 999;
    if (leftNum !== rightNum) return leftNum - rightNum;
    return left.name.localeCompare(right.name);
  });
}

export function MatchLineupList({
  teams,
  selectedPlayerId,
  onSelectPlayer,
  layout = "stacked"
}: MatchLineupListProps) {
  return (
    <div className={`match-lineup-teams${layout === "paired" ? " match-lineup-teams--paired" : ""}`}>
      {teams.map((team) => (
        <div className="lineup-card compact" key={team.teamName}>
          <h4>
            <TeamLabel name={team.teamName} size="xs" />
          </h4>
          {LINEUP_ROLE_ORDER.map((role) => {
            const players = sortByJersey(team.players.filter((player) => player.lineupRole === role));
            if (!players.length) return null;

            return (
              <div className="lineup-role-group" key={`${team.teamName}-${role}`}>
                <p className="lineup-role-label">{LINEUP_ROLE_LABELS[role]}</p>
                <div className="lineup-list">
                  {players.map((player) => (
                    <button
                      className={`lineup-row lineup-row--${role}${
                        selectedPlayerId === player.playerId ? " selected" : ""
                      }`}
                      key={`${team.teamName}-${player.playerId}`}
                      type="button"
                      onClick={() => onSelectPlayer(player.playerId)}
                    >
                      <span>{player.jerseyNumber ?? "–"}</span>
                      <span className="lineup-row-name">{player.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
