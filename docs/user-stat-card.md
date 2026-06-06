# UserStatCard component

`UserStatCard` is the user's tournament passport. It appears on profile pages and can be exported as
a share image for social platforms.

## Sizes

- Full profile card: 340x440px target.
- Share image: 1080x1080px square with padding, larger type, tournament watermark, and MyPicks URL.

## Full layout

```text
+--------------------------------------+
| [Avatar 56px] Username               |
|              @handle [Tier badge]    |
+--------------------------------------+
| POINTS       RANK        ACCURACY    |
| 1,284        #12         41%         |
+--------------------------------------+
| Prediction streak  x x x - -         |
| 3 correct in a row                   |
+--------------------------------------+
| My top-rated player this tournament  |
| [Portrait 40px] Mbappe  * 9.2        |
+--------------------------------------+
| Squads submitted      14             |
| Votes cast            67             |
| Friends on platform    8             |
+--------------------------------------+
| [Share card] [Edit profile]          |
+--------------------------------------+
```

## Data sources

| Field | Source |
| --- | --- |
| Points balance | `users.points_balance` |
| Global rank | Latest `leaderboard_snapshots` for tournament |
| Prediction accuracy | `COUNT(correct) / COUNT(total)` from `predictions` |
| Streak | Latest prediction result rows from `wallet_ledger`, ordered by `created_at` |
| Top-rated player | `player_ratings` grouped by player for this user |
| Squads submitted | Count of `squads` with `published_to_board_at IS NOT NULL` |
| Votes cast | Count of `votes` for the user |
| Friends count | Count of accepted `connections` |

## Tier badge colours

| Tier | Background | Text | Label |
| --- | --- | --- | --- |
| Fan | `#F3F4F6` | `#6B7280` | Fan |
| Pro | `#DBEAFE` | `#1D4ED8` | Pro |
| Elite | `#FEF3C7` | `#92400E` | Elite |

## Share behaviour

1. User taps **Share card**.
2. Server renders a 1080x1080 PNG using a headless browser or canvas renderer.
3. Server stores the PNG in object storage and returns a signed URL valid for 1 hour.
4. Browser attempts `navigator.share({ files: [imageFile] })`.
5. If Web Share API is unavailable, show a download link.

The first scaffold implementation renders the full card in React. The server-side PNG export should
be added when object storage is configured.
