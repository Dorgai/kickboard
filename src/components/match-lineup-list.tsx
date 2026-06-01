import {
  LINEUP_POSITION_GROUP_LABELS,
  LINEUP_POSITION_GROUP_ORDER,
  type LineupPositionGroup
} from "@/lib/lineup-position-groups";
import { LINEUP_ROLE_LABELS, LINEUP_ROLE_ORDER, type LineupRole } from "@/lib/lineup-roles";
import { TeamLabel } from "@/components/team-label";

export type MatchLineupPlayer = {
  playerId: number;
  name: string;
  jerseyNumber: number | null;
  country: string | null;
  lineupRole: LineupRole;
  position: string | null;
  positionGroup: LineupPositionGroup;
};

export type MatchLineupTeam = {
  teamName: string;
  /** StatsBomb player nationality — improves flag resolution when team name is ambiguous. */
  countryHint?: string | null;
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
            <TeamLabel
              countryHint={team.countryHint ?? team.players.find((player) => player.country)?.country}
              name={team.teamName}
              size="xs"
            />
          </h4>
          {LINEUP_ROLE_ORDER.map((role) => {
            const players = sortByJersey(team.players.filter((player) => player.lineupRole === role));
            if (!players.length) return null;

            return (
              <div className="lineup-role-group" key={`${team.teamName}-${role}`}>
                <p className="lineup-role-label">{LINEUP_ROLE_LABELS[role]}</p>
                {LINEUP_POSITION_GROUP_ORDER.map((group) => {
                  const groupPlayers = sortByJersey(
                    players.filter((player) => player.positionGroup === group)
                  );
                  if (!groupPlayers.length) return null;

                  return (
                    <div className="lineup-position-group" key={`${team.teamName}-${role}-${group}`}>
                      <p className="lineup-position-label">{LINEUP_POSITION_GROUP_LABELS[group]}</p>
                      <div className="lineup-list">
                        {groupPlayers.map((player) => (
                          <button
                            className={`lineup-row lineup-row--${role}${
                              selectedPlayerId === player.playerId ? " selected" : ""
                            }`}
                            key={`${team.teamName}-${player.playerId}`}
                            title={player.position ?? undefined}
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
            );
          })}
        </div>
      ))}
    </div>
  );
}
