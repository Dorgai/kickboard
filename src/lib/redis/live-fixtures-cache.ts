import type { ApiFootballFixture } from "@/lib/api-football";
import type { ApiFootballFixtureEvent } from "@/lib/api-football-events";

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  mget: (...keys: string[]) => Promise<(string | null)[]>;
};

let redisPromise: Promise<RedisClient | null> | null = null;

async function getRedis(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (!redisPromise) {
    redisPromise = import("ioredis")
      .then(({ default: IORedis }) => {
        const client = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
        return client.connect().then(() => client as RedisClient);
      })
      .catch(() => null);
  }

  return redisPromise;
}

export async function readCachedLiveFixtures(): Promise<ApiFootballFixture[] | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get("api-football:live-fixtures");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: { response?: ApiFootballFixture[] } };
    return parsed.data?.response ?? null;
  } catch {
    return null;
  }
}

export async function readCachedFixtureGoalEvents(
  fixtureIds: number[]
): Promise<Map<number, ApiFootballFixtureEvent[]>> {
  const redis = await getRedis();
  const map = new Map<number, ApiFootballFixtureEvent[]>();
  if (!redis || !fixtureIds.length) return map;

  try {
    const keys = fixtureIds.map((id) => `api-football:match-events:${id}`);
    const values = await redis.mget(...keys);
    fixtureIds.forEach((id, index) => {
      const raw = values[index];
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { events?: ApiFootballFixtureEvent[] };
        if (parsed.events?.length) map.set(id, parsed.events);
      } catch {
        /* ignore bad cache row */
      }
    });
  } catch {
    /* optional cache */
  }

  return map;
}
