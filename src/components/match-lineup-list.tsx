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
  /** Dense grids with vertical position-group rails (past-events match view). */
  compact?: boolean;
};

function sortByJersey(players: MatchLineupPlayer[]) {
  return [...players].sort((left, right) => {
    const leftNum = left.jerseyNumber ?? 999;
    const rightNum = right.jerseyNumber ?? 999;
    if (leftNum !== rightNum) return leftNum - rightNum;
    return left.name.localeCompare(right.name);
  });
}

function LineupPlayerButton({
  compact,
  player,
  role,
  selectedPlayerId,
  teamName,
  onSelect
}: {
  compact: boolean;
  player: MatchLineupPlayer;
  role: LineupRole;
  selectedPlayerId: number | null;
  teamName: string;
  onSelect: (playerId: number) => void;
}) {
  return (
    <button
      className={`lineup-row lineup-row--${role}${
        compact ? " lineup-row--dense" : ""
      }${selectedPlayerId === player.playerId ? " selected" : ""}`}
      title={player.position ?? undefined}
      type="button"
      onClick={() => onSelect(player.playerId)}
    >
      <span className="lineup-row-number">{player.jerseyNumber ?? "–"}</span>
      <span className="lineup-row-name">{player.name}</span>
    </button>
  );
}

export function MatchLineupList({
  teams,
  selectedPlayerId,
  onSelectPlayer,
  layout = "stacked",
  compact = false
}: MatchLineupListProps) {
  return (
    <div
      className={`match-lineup-teams${layout === "paired" ? " match-lineup-teams--paired" : ""}${
        compact ? " match-lineup-teams--compact" : ""
      }`}
    >
      {teams.map((team) => (
        <div className={`lineup-card compact${compact ? " lineup-card--dense" : ""}`} key={team.teamName}>
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
              <div className={`lineup-role-group${compact ? " lineup-role-group--dense" : ""}`} key={`${team.teamName}-${role}`}>
                <p className="lineup-role-label">{LINEUP_ROLE_LABELS[role]}</p>
                {compact ? (
                  <div className="lineup-role-bands">
                    {LINEUP_POSITION_GROUP_ORDER.map((group) => {
                      const groupPlayers = sortByJersey(
                        players.filter((player) => player.positionGroup === group)
                      );
                      if (!groupPlayers.length) return null;

                      return (
                        <div className="lineup-position-band" key={`${team.teamName}-${role}-${group}`}>
                          <span className="lineup-position-rail" title={LINEUP_POSITION_GROUP_LABELS[group]}>
                            {LINEUP_POSITION_GROUP_LABELS[group]}
                          </span>
                          <div className="lineup-list lineup-list--dense">
                            {groupPlayers.map((player) => (
                              <LineupPlayerButton
                                key={`${team.teamName}-${player.playerId}`}
                                compact
                                player={player}
                                role={role}
                                selectedPlayerId={selectedPlayerId}
                                teamName={team.teamName}
                                onSelect={onSelectPlayer}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  LINEUP_POSITION_GROUP_ORDER.map((group) => {
                    const groupPlayers = sortByJersey(
                      players.filter((player) => player.positionGroup === group)
                    );
                    if (!groupPlayers.length) return null;

                    return (
                      <div className="lineup-position-group" key={`${team.teamName}-${role}-${group}`}>
                        <p className="lineup-position-label">{LINEUP_POSITION_GROUP_LABELS[group]}</p>
                        <div className="lineup-list">
                          {groupPlayers.map((player) => (
                            <LineupPlayerButton
                              key={`${team.teamName}-${player.playerId}`}
                              compact={false}
                              player={player}
                              role={role}
                              selectedPlayerId={selectedPlayerId}
                              teamName={team.teamName}
                              onSelect={onSelectPlayer}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
