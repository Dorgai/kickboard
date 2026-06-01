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

## Community (in progress)

| Feature | Status |
|---------|--------|
| Coach Board feed (approved posts) | `CommunityPanel` + `/api/community/posts` |
| Join / session (birth year gate) | `/api/community/session` |
| Moderation-first posting | New posts default `withheld`; admin approve |
| Report post | `/api/community/posts/[id]/report` |
| Admin moderation queue | `/admin/data-sources` + `/api/admin/community/posts` |

Requires Postgres (`db/schema.sql`, `db/community-extensions.sql`) and `JWT_SECRET`. See [`docs/community.md`](community.md).

## Later phase (documented, not started)

- Widget dashboard (`docs/widget-contract.md`)
- Squad share post type, comments, reactions
- Virtual wallet & predictions
- Pro analytics / FastAPI service
- User auth, Fan Mode, Stripe tiers
- UserStatCard export, portrait pipeline
