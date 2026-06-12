const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

export type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

export type ApiFootballResponse<T> = {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[];
  results: number;
  response: T;
};

export function getApiFootballConfig() {
  return {
    keyConfigured: Boolean(process.env.API_FOOTBALL_KEY),
    workerEnabled: process.env.KICKBOARD_WORKER_ENABLED === "true"
  };
}

export function mapApiFootballStatusShort(short: string) {
  if (short === "FT" || short === "AET" || short === "PEN") {
    return "finished" as const;
  }
  if (
    short === "1H" ||
    short === "2H" ||
    short === "HT" ||
    short === "ET" ||
    short === "BT" ||
    short === "P" ||
    short === "LIVE" ||
    short === "INT"
  ) {
    return "live" as const;
  }
  return "upcoming" as const;
}

export function worldCupLeagueParams() {
  return {
    league: process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1",
    season: process.env.API_FOOTBALL_SEASON?.trim() || "2026"
  };
}

export async function fetchApiFootball<T>(path: string, searchParams: Record<string, string>) {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error("API_FOOTBALL_KEY is not configured");
  }

  const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);
  Object.entries(searchParams).forEach(([name, value]) => url.searchParams.set(name, value));

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": key
    },
    signal: AbortSignal.timeout(8000)
  });

  if (response.status === 429) {
    throw new Error("API-Football rate limit exceeded");
  }

  if (!response.ok) {
    throw new Error(`API-Football returned ${response.status}`);
  }

  return (await response.json()) as ApiFootballResponse<T>;
}
