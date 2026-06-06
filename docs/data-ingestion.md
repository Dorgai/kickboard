# Data ingestion pipeline

MyPicks uses polling for live match data. API-Football standard paid tiers do not provide true
push webhooks, so one background worker process manages adaptive polling with Redis-backed job
state.

## API-Football polling schedule

The worker stores a match state map in Redis keyed by `match:{match_id}:state` and adjusts cadence
from `fixture.status` on every poll.

| Match state | Poll interval | Endpoint | Reason |
| --- | --- | --- | --- |
| 72h before kickoff | Once | Fixtures, lineups when announced | Pre-seed match record |
| 60min before kickoff | Every 10min | Lineups, odds | Confirm team sheets |
| Live, 0 to 90+ | Every 60s | Fixtures, Events, Statistics | Core live layer |
| Half-time | Every 2min | Statistics only | Score frozen, stats can update |
| Extra time / penalties | Every 30s | Fixtures, Events | High-stakes faster cadence |
| Full-time + 30min | Every 5min | Statistics final | Let API finalise stats |
| Post-match, day after | Once | Player statistics | Per-player data often delayed |

The worker should be a separate Node.js process on Railway using BullMQ on Redis. It owns polling,
prediction settlement triggers, and live Redis pub/sub publishing. The Next.js web service should
consume stored state and WebSocket broadcasts; it should not poll API-Football directly.

## Retry envelope

Every API-Football call must use the same retry envelope:

- Timeout: 8 seconds per request.
- Retry: up to 3 attempts with exponential backoff of 1s, 2s, and 4s.
- Live-match failure threshold: after 3 consecutive failures, publish `DATA_DELAYED` to the match
  pub/sub channel.
- Frontend delayed state: display `Live data is delayed - last updated at {time}` rather than
  silently showing stale numbers.
- HTTP 429 handling: pause that worker for 60 seconds, log the incident, and alert if more than 3
  rate-limit incidents occur inside one match window.
- Circuit breaker: if API-Football fails for more than 5 minutes during a live match, publish a
  `DATA_UNAVAILABLE` state. The frontend must not label the last known score as live.

## Reconciliation rules

API-Football can return score and event data out of order. MyPicks resolves inconsistencies with
these rules:

1. The fixture endpoint scoreline is ground truth. Never derive score from counting goal events.
2. Events are ordered by `time.elapsed`. If an older-minute event arrives late, insert it into the
   correct timeline position.
3. If a goal event arrives before the fixture score changes, hold it in a 30-second buffer and
   re-check the score. If the score confirms, publish the score and event together.
4. Statistics snapshots from `/fixtures/statistics` replace the previous snapshot entirely on every
   poll. They are not additive.

## Redis keys and events

Recommended keys:

- `match:state:{match_id}` - current fixture status, score, minute, last successful poll time.
- `match:failures:{match_id}` - consecutive failure count and first failure timestamp.
- `match:goal-buffer:{match_id}` - short-lived goal events waiting for score confirmation.
- `pubsub:match:{match_id}` - channel for score, events, statistics, `DATA_DELAYED`, and
  `DATA_UNAVAILABLE` payloads.

## StatsBomb sync

StatsBomb is historical, not live. The sync job runs manually before the tournament and then as an
automated nightly check after the tournament dataset is published.

Process:

1. Clone or pull `statsbomb/open-data` into a staging volume.
2. Read `/data/competitions.json` and find FIFA World Cup competition entries.
3. For each match in `/data/matches/{competition_id}/{season_id}.json`:
   - Upsert the match into PostgreSQL using `statsbomb_match_id` as a unique key.
   - For each event in `/data/events/{match_id}.json`, upsert into `statsbomb_events`.
4. For each lineup in `/data/lineups/{match_id}.json`:
   - Upsert player records.
   - Link `statsbomb_player_id` to `players` by fuzzy name match.
5. Log ingestion counts and flag player-name mismatches for manual review.

Expected runtime for a full World Cup is about 15 minutes for 64 matches with roughly 3,000 events
each.

`statsbomb_events` stores raw JSONB for forward compatibility. Indexed extracted fields are
`match_id`, `player_id`, `event_type`, `minute`, and `location`.
