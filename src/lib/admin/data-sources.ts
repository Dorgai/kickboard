import { getApiFootballConfig } from "@/lib/api-football";
import { getMatches, getWorldCupCompetitions } from "@/lib/statsbomb";

type DataSourceStatus = "online" | "configured" | "not_configured" | "degraded" | "offline";

export type AdminDataSource = {
  id: string;
  name: string;
  category: "historical" | "current" | "realtime" | "storage" | "worker";
  status: DataSourceStatus;
  connected: boolean;
  lastCheckedAt: string;
  lastRefreshedAt: string | null;
  refreshCadence: string;
  updates: string[];
  records?: Record<string, number | string | null>;
  message: string;
};

export async function buildAdminDataSources() {
  const checkedAt = new Date().toISOString();
  const apiFootball = getApiFootballConfig();
  const sources: AdminDataSource[] = [];

  try {
    const worldCups = await getWorldCupCompetitions();
    const latestWorldCup = worldCups[0];
    const latestMatches = latestWorldCup
      ? await getMatches(latestWorldCup.competition_id, latestWorldCup.season_id)
      : [];

    sources.push({
      id: "statsbomb-open-data",
      name: "StatsBomb Open Data",
      category: "historical",
      status: "online",
      connected: true,
      lastCheckedAt: checkedAt,
      lastRefreshedAt: latestWorldCup?.match_available ?? null,
      refreshCadence: "Public GitHub feed, cached for 1 hour in app routes",
      updates: [
        "Historical World Cup competitions",
        "Historical matches",
        "Lineups and squads",
        "Event-level data",
        "Derived team and player stats",
        "Historical knockout bracket tree"
      ],
      records: {
        worldCupSeasons: worldCups.length,
        latestSeason: latestWorldCup?.season_name ?? null,
        latestSeasonMatches: latestMatches.length
      },
      message: "Historical feed is reachable and powering the public historical browser."
    });
  } catch (error) {
    sources.push({
      id: "statsbomb-open-data",
      name: "StatsBomb Open Data",
      category: "historical",
      status: "offline",
      connected: false,
      lastCheckedAt: checkedAt,
      lastRefreshedAt: null,
      refreshCadence: "Public GitHub feed, cached for 1 hour in app routes",
      updates: ["Historical World Cup competitions", "Historical matches", "Lineups", "Events"],
      message: error instanceof Error ? error.message : "StatsBomb feed check failed"
    });
  }

  sources.push({
    id: "current-world-cup-public",
    name: "2026 World Cup public tournament pages",
    category: "current",
    status: "online",
    connected: true,
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Public pages, cached for 1 hour in app route",
    updates: [
      "Known 2026 teams",
      "Groups A-L",
      "Published group fixtures",
      "Tournament summary dates and host information"
    ],
    message:
      "Current tournament endpoint parses public tournament and group pages. Player pools prefer the official FIFA WC 2026 squad lists page."
  });

  sources.push({
    id: "wikipedia-wc26-official-squads",
    name: "FIFA WC 2026 official squad lists (Wikipedia)",
    category: "current",
    status: "online",
    connected: true,
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Published squad page, cached for 30 minutes in app",
    updates: [
      "All 48 final 26-man squads (FIFA, published June 2026)",
      "Primary Coach Board and scorer picker roster source"
    ],
    message:
      "Parses https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads — mirrors FIFA's published lists. API-Football and StatsBomb are fallbacks only."
  });

  sources.push({
    id: "wikipedia-national-squads",
    name: "Wikipedia national team squads",
    category: "current",
    status: "online",
    connected: true,
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Public pages, cached for 1 hour per team",
    updates: ["Current squad tables for WC call-ups", "Coach Board player pool last resort"],
    message:
      "Used only when the official WC 2026 squad page and API-Football both lack a roster for a nation."
  });

  sources.push({
    id: "api-football",
    name: "API-Football live data",
    category: "realtime",
    status: apiFootball.keyConfigured ? "configured" : "not_configured",
    connected: apiFootball.keyConfigured && apiFootball.workerEnabled,
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Adaptive polling: live 60s, extra time 30s, half-time 2m, final stats 5m",
    updates: [
      "Live fixtures",
      "Scores and match minute",
      "Events",
      "Statistics",
      "Lineups when available",
      "World Cup team squads and league player lists (Coach Board)",
      "Post-match player statistics"
    ],
    records: {
      keyConfigured: String(apiFootball.keyConfigured),
      workerEnabled: String(apiFootball.workerEnabled)
    },
    message: apiFootball.keyConfigured
      ? "Provider key is configured. Worker must be enabled and running for live updates."
      : "Provider key is missing; real-time data is intentionally unavailable."
  });

  sources.push({
    id: "postgres",
    name: "Railway Postgres",
    category: "storage",
    status: process.env.DATABASE_URL ? "configured" : "not_configured",
    connected: Boolean(process.env.DATABASE_URL),
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Database writes when app/worker persistence is implemented",
    updates: [
      "Users",
      "Tournaments",
      "Matches",
      "Squads",
      "Predictions",
      "Wallet ledger",
      "StatsBomb event storage schema"
    ],
    message: process.env.DATABASE_URL
      ? "DATABASE_URL is configured. Current public feed browser reads direct public feeds; persistence jobs are next."
      : "DATABASE_URL is missing."
  });

  sources.push({
    id: "redis",
    name: "Railway Redis",
    category: "storage",
    status: process.env.REDIS_URL ? "configured" : "not_configured",
    connected: Boolean(process.env.REDIS_URL),
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Used by worker queues and live pub/sub when worker is enabled",
    updates: ["BullMQ API-Football polling queue", "Live match state cache", "Pub/sub channels", "Rate limits"],
    message: process.env.REDIS_URL
      ? "REDIS_URL is configured. API-Football worker can use it when provider key is added."
      : "REDIS_URL is missing."
  });

  sources.push({
    id: "api-football-worker",
    name: "API-Football BullMQ worker",
    category: "worker",
    status: apiFootball.workerEnabled ? "configured" : "not_configured",
    connected: apiFootball.workerEnabled && apiFootball.keyConfigured,
    lastCheckedAt: checkedAt,
    lastRefreshedAt: null,
    refreshCadence: "Runs npm run worker:api-football as a separate Railway worker service",
    updates: [
      "Poll scheduling",
      "Retry envelope",
      "Live fixture Redis cache",
      "Redis pub/sub update notifications"
    ],
    message: apiFootball.workerEnabled
      ? "Worker flag is enabled. Confirm separate worker service is deployed."
      : "Worker flag is not enabled on the web service."
  });

  return {
    generatedAt: checkedAt,
    summary: {
      total: sources.length,
      connected: sources.filter((source) => source.connected).length,
      notConfigured: sources.filter((source) => source.status === "not_configured").length
    },
    sources
  };
}
