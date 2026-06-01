export type StatsBombCompetition = {
  competition_id: number;
  season_id: number;
  country_name: string;
  competition_name: string;
  competition_gender: string;
  competition_youth: boolean;
  competition_international: boolean;
  season_name: string;
  match_available?: string | null;
  match_available_360?: string | null;
};

export type StatsBombMatch = {
  match_id: number;
  match_date: string;
  kick_off?: string | null;
  competition: {
    competition_id: number;
    competition_name: string;
  };
  season: {
    season_id: number;
    season_name: string;
  };
  home_team: {
    home_team_id: number;
    home_team_name: string;
  };
  away_team: {
    away_team_id: number;
    away_team_name: string;
  };
  home_score: number;
  away_score: number;
  match_status?: string;
  match_week?: number;
  competition_stage?: {
    id: number;
    name: string;
  };
  stadium?: {
    id: number;
    name: string;
  } | null;
};

export type StatsBombEvent = {
  id: string;
  index: number;
  period: number;
  timestamp: string;
  minute: number;
  second: number;
  type: {
    id: number;
    name: string;
  };
  team?: {
    id: number;
    name: string;
  };
  player?: {
    id: number;
    name: string;
  };
  location?: [number, number];
  pass?: {
    recipient?: {
      id: number;
      name: string;
    };
    outcome?: {
      id: number;
      name: string;
    };
    goal_assist?: boolean;
  };
  shot?: {
    outcome?: {
      id: number;
      name: string;
    };
    statsbomb_xg?: number;
  };
  dribble?: {
    outcome?: {
      id: number;
      name: string;
    };
  };
};

export type StatsBombLineupPosition = {
  position_id?: number;
  position?: string;
  from?: string;
  to?: string | null;
  from_period?: number;
  to_period?: number | null;
  start_reason?: string | null;
  end_reason?: string | null;
};

export type StatsBombLineupPlayer = {
  player_id: number;
  player_name: string;
  player_nickname?: string | null;
  jersey_number?: number;
  country?: {
    id: number;
    name: string;
  };
  positions?: StatsBombLineupPosition[];
};

export type StatsBombLineup = {
  team_id: number;
  team_name: string;
  lineup: StatsBombLineupPlayer[];
};

const BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";

async function fetchStatsBomb<T>(path: string, revalidate = 3600): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json"
    },
    next: {
      revalidate
    }
  });

  if (!response.ok) {
    throw new Error(`StatsBomb ${path} returned ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getCompetitions() {
  return fetchStatsBomb<StatsBombCompetition[]>("/competitions.json", 3600);
}

export async function getWorldCupCompetitions() {
  const competitions = await getCompetitions();

  return competitions
    .filter((competition) => competition.competition_name === "FIFA World Cup")
    .sort((a, b) => Number(b.season_name) - Number(a.season_name));
}

export async function getMatches(competitionId: number, seasonId: number) {
  return fetchStatsBomb<StatsBombMatch[]>(`/matches/${competitionId}/${seasonId}.json`, 3600);
}

export async function getEvents(matchId: number) {
  return fetchStatsBomb<StatsBombEvent[]>(`/events/${matchId}.json`, 3600);
}

export async function getLineups(matchId: number) {
  return fetchStatsBomb<StatsBombLineup[]>(`/lineups/${matchId}.json`, 3600);
}

export type SummarisedEventTone = "goal" | "danger" | "neutral";

export function summariseEvent(event: StatsBombEvent) {
  const type = event.type.name;
  let tone: SummarisedEventTone = "neutral";
  let highlight = false;
  let description = type;

  if (event.shot?.outcome?.name === "Goal") {
    tone = "goal";
    highlight = true;
    description = `Goal · ${event.player?.name ?? "Unknown"}`;
  } else if (type === "Shot") {
    const outcome = event.shot?.outcome?.name;
    if (outcome && outcome !== "Off T" && outcome !== "Blocked") {
      highlight = true;
    }
    description = `Shot (${outcome ?? "—"}) · ${event.player?.name ?? "Unknown"}`;
  } else if (type === "Pass" && event.pass?.goal_assist) {
    highlight = true;
    description = `Assist · ${event.player?.name ?? "Unknown"}`;
  } else if (type === "Substitution") {
    highlight = true;
    description = `Substitution · ${event.player?.name ?? "Unknown"}`;
  } else if (/card/i.test(type) || type === "Bad Behaviour" || type === "Foul Committed") {
    tone = "danger";
    highlight = true;
    description = `${type} · ${event.player?.name ?? "Unknown"}`;
  } else if (event.player?.name) {
    description = `${type} · ${event.player.name}`;
  }

  return {
    id: event.id,
    minute: event.minute,
    second: event.second,
    type,
    team: event.team?.name ?? null,
    player: event.player?.name ?? null,
    location: event.location ?? null,
    description,
    tone,
    highlight
  };
}

export function buildMatchStats(events: StatsBombEvent[]) {
  const teamStats = new Map<
    string,
    {
      team: string;
      passes: number;
      completedPasses: number;
      shots: number;
      goals: number;
      xg: number;
      carries: number;
      dribbles: number;
      successfulDribbles: number;
    }
  >();

  const playerStats = new Map<
    string,
    {
      playerId: number | null;
      player: string;
      team: string;
      passes: number;
      completedPasses: number;
      shots: number;
      goals: number;
      assists: number;
      xg: number;
      carries: number;
      dribbles: number;
      successfulDribbles: number;
    }
  >();

  function getTeam(teamName: string) {
    if (!teamStats.has(teamName)) {
      teamStats.set(teamName, {
        team: teamName,
        passes: 0,
        completedPasses: 0,
        shots: 0,
        goals: 0,
        xg: 0,
        carries: 0,
        dribbles: 0,
        successfulDribbles: 0
      });
    }
    return teamStats.get(teamName)!;
  }

  function getPlayer(event: StatsBombEvent) {
    const team = event.team?.name ?? "Unknown team";
    const player = event.player?.name ?? "Unknown player";
    const key = `${team}:${player}`;

    if (!playerStats.has(key)) {
      playerStats.set(key, {
        playerId: event.player?.id ?? null,
        player,
        team,
        passes: 0,
        completedPasses: 0,
        shots: 0,
        goals: 0,
        assists: 0,
        xg: 0,
        carries: 0,
        dribbles: 0,
        successfulDribbles: 0
      });
    }
    return playerStats.get(key)!;
  }

  for (const event of events) {
    const teamName = event.team?.name;
    if (!teamName) continue;

    const team = getTeam(teamName);
    const player = getPlayer(event);

    if (event.type.name === "Pass") {
      team.passes += 1;
      player.passes += 1;
      if (!event.pass?.outcome) {
        team.completedPasses += 1;
        player.completedPasses += 1;
      }
      if (event.pass?.goal_assist) {
        player.assists += 1;
      }
    }

    if (event.type.name === "Shot") {
      const xg = event.shot?.statsbomb_xg ?? 0;
      team.shots += 1;
      team.xg += xg;
      player.shots += 1;
      player.xg += xg;
      if (event.shot?.outcome?.name === "Goal") {
        team.goals += 1;
        player.goals += 1;
      }
    }

    if (event.type.name === "Carry") {
      team.carries += 1;
      player.carries += 1;
    }

    if (event.type.name === "Dribble") {
      team.dribbles += 1;
      player.dribbles += 1;
      if (event.dribble?.outcome?.name === "Complete") {
        team.successfulDribbles += 1;
        player.successfulDribbles += 1;
      }
    }
  }

  return {
    teamStats: Array.from(teamStats.values()).map((team) => ({
      ...team,
      xg: Number(team.xg.toFixed(2)),
      passAccuracy: team.passes ? Number(((team.completedPasses / team.passes) * 100).toFixed(1)) : null
    })),
    playerStats: Array.from(playerStats.values())
      .map((player) => ({
        ...player,
        xg: Number(player.xg.toFixed(2)),
        passAccuracy: player.passes ? Number(((player.completedPasses / player.passes) * 100).toFixed(1)) : null
      }))
      .sort((a, b) => b.xg + b.shots + b.goals * 5 - (a.xg + a.shots + a.goals * 5))
  };
}
