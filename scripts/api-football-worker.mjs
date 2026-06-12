import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;
const apiKey = process.env.API_FOOTBALL_KEY;

if (!redisUrl) {
  throw new Error("REDIS_URL is required for the API-Football worker.");
}

if (!apiKey) {
  throw new Error("API_FOOTBALL_KEY is required for the API-Football worker.");
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

const queue = new Queue("api-football-polling", { connection });

async function fetchApiFootball(path, params = {}) {
  const url = new URL(`https://v3.football.api-sports.io${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey
        },
        signal: controller.signal
      });

      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 60000));
        throw new Error("API-Football rate limit exceeded");
      }

      if (!response.ok) {
        throw new Error(`API-Football returned ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, [1000, 2000, 4000][attempt]));
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function pollLiveFixtures() {
  const data = await fetchApiFootball("/fixtures", { live: "all" });
  await connection.set(
    "api-football:live-fixtures",
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      data
    }),
    "EX",
    120
  );

  const fixtures = data.response ?? [];
  await Promise.all(
    fixtures.slice(0, 8).map(async (fixture) => {
      try {
        const eventsPayload = await fetchApiFootball("/fixtures/events", {
          fixture: String(fixture.fixture.id)
        });
        await connection.set(
          `api-football:match-events:${fixture.fixture.id}`,
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            events: eventsPayload.response ?? []
          }),
          "EX",
          120
        );
      } catch {
        /* optional per-fixture events */
      }
    })
  );

  await connection.publish(
    "api-football:live-fixtures",
    JSON.stringify({
      type: "LIVE_FIXTURES_UPDATED",
      updatedAt: new Date().toISOString(),
      results: data.results
    })
  );
}

new Worker(
  "api-football-polling",
  async (job) => {
    if (job.name === "poll-live-fixtures") {
      await pollLiveFixtures();
    }
  },
  { connection }
);

await queue.upsertJobScheduler(
  "poll-live-fixtures-every-60s",
  { every: 60000 },
  {
    name: "poll-live-fixtures",
    data: {}
  }
);

console.log("API-Football worker started. Polling live fixtures every 60 seconds.");
