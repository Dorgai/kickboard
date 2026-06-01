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

export function summariseEvent(event: StatsBombEvent) {
  return {
    id: event.id,
    minute: event.minute,
    second: event.second,
    type: event.type.name,
    team: event.team?.name ?? null,
    player: event.player?.name ?? null,
    location: event.location ?? null
  };
}
