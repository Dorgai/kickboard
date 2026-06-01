# Widget API contract

The home dashboard is a layout shell. It renders widget slots and saves layout metadata, but each
widget owns its own data fetching and state handling. A slow or failed analytics widget must not
block the live score widget from updating.

## Fetching strategies

### Real-time widgets

Live score, live vote tallies, live stats, and match events subscribe to a focused WebSocket slice:

```ts
const { data } = useMatchChannel(matchId, "score");
```

Server broadcasts are split by concern:

- `match:{matchId}:score`
- `match:{matchId}:events`
- `match:{matchId}:statistics`
- `match:{matchId}:votes`

Widgets re-render only when their subscribed slice changes.

### Polling widgets

Top scorers, group standings, and leaderboards use SWR with a refresh interval:

```ts
const { data } = useSWR(`/api/tournament/${tournamentId}/standings`, fetcher, {
  refreshInterval: 60000,
  revalidateOnFocus: true
});
```

### Static/session widgets

My squad and wallet balance fetch on mount and update on user action:

```ts
const { data } = useSWR(`/api/user/squad/${matchId}`, fetcher, {
  refreshInterval: 0,
  revalidateOnFocus: false
});
```

### Analytics widgets

Pro and Elite analytics fetch on demand and show a widget-level skeleton:

```ts
const { data, isLoading } = useSWR(queryKey, analyticsApiFetcher, {
  suspense: false,
  errorRetryCount: 2
});
```

## Isolation contract

Every widget implements these states internally:

1. Loading: skeleton matching the loaded shape.
2. Error: inline retry button and short error copy.
3. Loaded: normal content.
4. Incomplete setup: required config is missing, so the widget prompts for configuration.

Widgets must not throw uncaught errors to the dashboard. The dashboard wraps every widget slot in a
React ErrorBoundary; if a widget crashes, only that slot renders an error card.

## Layout metadata

`user_preferences.widget_layout` stores an array of objects:

```json
{
  "id": "uuid",
  "type": "live_score",
  "position": { "col": 0, "row": 0 },
  "size": "2x1",
  "config": {
    "matchId": "uuid-or-null",
    "queryId": "uuid-or-null"
  }
}
```

Allowed widget types:

- `live_score`
- `bracket_mini`
- `top_scorers`
- `coach_board`
- `my_squad`
- `prediction_leaderboard`
- `wallet`
- `player_spotlight`
- `standings`
- `analytics_chart`
- `heat_map`

Allowed sizes:

- `1x1`
- `2x1`
- `2x2`

Config is widget-specific:

- `live_score` requires `config.matchId`.
- `analytics_chart` and `heat_map` require `config.queryId`.
- Most other widgets resolve from the active tournament/user context.

When a required config value is absent, the widget renders an incomplete setup state.
