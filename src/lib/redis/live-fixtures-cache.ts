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
  const cached = await readCachedLiveFixturesWithMeta();
  return cached?.fixtures ?? null;
}

export async function readCachedLiveFixturesWithMeta(): Promise<{
  updatedAt: string;
  fixtures: ApiFootballFixture[];
} | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get("api-football:live-fixtures");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      updatedAt?: string;
      data?: { response?: ApiFootballFixture[] };
    };
    const fixtures = parsed.data?.response ?? [];
    if (!parsed.updatedAt && fixtures.length === 0) return null;
    return {
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      fixtures
    };
  } catch {
    return null;
  }
}

type LiveUpdateHandler = () => void;

type LiveFixtureSubscriberRegistry = {
  add: (handler: LiveUpdateHandler) => () => void;
  dispose: () => Promise<void>;
};

let subscriberRegistryPromise: Promise<LiveFixtureSubscriberRegistry | null> | null = null;

/** Subscribe to worker live-fixture pub/sub (one shared Redis connection per process). */
export async function subscribeLiveFixtureUpdates(handler: LiveUpdateHandler): Promise<() => void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return () => {};

  if (!subscriberRegistryPromise) {
    subscriberRegistryPromise = import("ioredis")
      .then(async ({ default: IORedis }) => {
        const client = new IORedis(url, { maxRetriesPerRequest: null });
        await client.connect();
        await client.subscribe("api-football:live-fixtures");
        const handlers = new Set<LiveUpdateHandler>();
        client.on("message", () => {
          handlers.forEach((fn) => {
            try {
              fn();
            } catch {
              /* subscriber error */
            }
          });
        });
        return {
          add(nextHandler: LiveUpdateHandler) {
            handlers.add(nextHandler);
            return () => {
              handlers.delete(nextHandler);
            };
          },
          async dispose() {
            try {
              await client.unsubscribe("api-football:live-fixtures");
              await client.quit();
            } catch {
              /* ignore */
            }
          }
        };
      })
      .catch(() => null);
  }

  const registry = await subscriberRegistryPromise;
  if (!registry) return () => {};
  return registry.add(handler);
}

export async function resetLiveFixtureSubscribe(): Promise<void> {
  const registry = subscriberRegistryPromise ? await subscriberRegistryPromise : null;
  subscriberRegistryPromise = null;
  if (registry) {
    await registry.dispose();
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
