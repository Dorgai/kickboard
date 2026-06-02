# Feed browser — requirements vs implementation

This tracks the homepage feed browser against `README.md` and product cards in `src/lib/kickboard-data.ts`.

## Done (feed browser MVP)

| Requirement | Implementation |
|-------------|----------------|
| No fabricated data | All UI reads `/api/feeds/*` |
| Historical competitions & matches | StatsBomb `/api/feeds/historical/*` |
| Knockout bracket | `/api/feeds/historical/bracket` + full-width layout |
| Match detail: team & player stats, lineups | `/api/feeds/historical/match-detail` |
| **Event timelines** | `/api/feeds/historical/events` + `MatchEventTimeline` |
| **Player stats focus widget** | `PlayerStatsPanel` — selected player match card + tournament career |
| **Full player table** | Hidden under disclosure in `PlayerStatsPanel` |
| Group stage explorer | Group-stage match grid + stage filter |
| Current event public summary & groups | `/api/feeds/current-world-cup` |
| Current event route-to-final tree | Group columns (teams only) + knockout TBD columns |
| Qualified nations list | Collapsible compact text chips (not full flag grid) |
| Live scores when configured | `LiveFixturesPanel` → `/api/feeds/realtime` |
| Feed & infrastructure status | `FeedStatusPanel` on `/admin/data-sources` only |
| Country flags | `team-label.tsx` + `flagcdn.com` |
| Admin data sources | `/admin/data-sources` |
| Railway deploy | GitHub Actions + `npm run railway:deploy` |

## Partial

| Requirement | Gap |
|-------------|-----|
| API-Football worker | Fixed 60s poll; no adaptive schedule / `DATA_DELAYED` UI |
| PostgreSQL / Redis | Schema + env checks only; no app writes |
| Current knockout pairings | TBD slots until live fixture mapping from API-Football |
| Realtime on Current tab | Live panel added; depends on `API_FOOTBALL_KEY` + worker |

## Community & engagement (phase 1 shipped)

| Feature | Status |
|---------|--------|
| Google OAuth + birth-year onboarding | NextAuth + `/api/auth/onboarding` — see [`docs/auth-oauth.md`](auth-oauth.md) |
| Coach Board (squad builder + feed) | `CoachBoardPanel`, `/api/squads`, `squad_share` posts |
| Fan Chat (text posts) | `FanChatPanel`, `/api/community/posts` |
| Predictions (points, not betting) | `PredictionsPanel` placeholder; tables ready |
| Moderation | Withheld by default; admin approve |
| Legacy join (dev) | `/api/community/session` when OAuth not configured |

Requires Postgres (`db/schema.sql`, `db/community-extensions.sql`, `db/auth-extensions.sql`), `JWT_SECRET`, and `GOOGLE_CLIENT_*` for OAuth.

## Later phase (documented, not started)

- Widget dashboard (`docs/widget-contract.md`)
- Prediction settlement worker + leaderboard widget
- Comments, reactions, player-linked squads
- Virtual wallet UI
- Pro analytics / FastAPI service
- User auth, Fan Mode, Stripe tiers
- UserStatCard export, portrait pipeline
