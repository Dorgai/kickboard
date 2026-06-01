import { Share2, UserRoundPen } from "lucide-react";

type Tier = "fan" | "pro" | "elite";

export type UserStatCardData = {
  username: string;
  handle: string;
  tier: Tier;
  points: string;
  rank: string;
  accuracy: string;
  streak: boolean[];
  streakLabel: string;
  topPlayer: {
    name: string;
    rating: string;
    portraitInitials: string;
  };
  squadsSubmitted: number;
  votesCast: number;
  friendsCount: number;
};

const tierLabels: Record<Tier, string> = {
  fan: "Fan",
  pro: "Pro",
  elite: "Elite"
};

export const demoUserStatCard: UserStatCardData = {
  username: "Lazlo",
  handle: "@kickboarder",
  tier: "pro",
  points: "1,284",
  rank: "#12",
  accuracy: "41%",
  streak: [true, true, true, false, false],
  streakLabel: "3 correct in a row",
  topPlayer: {
    name: "Mbappe",
    rating: "9.2",
    portraitInitials: "KM"
  },
  squadsSubmitted: 14,
  votesCast: 67,
  friendsCount: 8
};

type UserStatCardProps = {
  data?: UserStatCardData;
};

export function UserStatCard({ data = demoUserStatCard }: UserStatCardProps) {
  return (
    <article className="user-stat-card" aria-label={`${data.username} tournament stat card`}>
      <header className="user-stat-header">
        <div className="user-avatar" aria-hidden="true">
          {data.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3>{data.username}</h3>
          <p>
            {data.handle}
            <span className={`user-tier user-tier-${data.tier}`}>{tierLabels[data.tier]}</span>
          </p>
        </div>
      </header>

      <div className="stat-metric-grid" aria-label="Tournament metrics">
        <Metric label="Points" value={data.points} />
        <Metric label="Rank" value={data.rank} />
        <Metric label="Accuracy" value={data.accuracy} />
      </div>

      <section className="stat-card-section">
        <div className="streak-row">
          <span>Prediction streak</span>
          <span aria-label={`${data.streak.filter(Boolean).length} correct predictions in recent form`}>
            {data.streak.map((correct, index) => (
              <span className={correct ? "streak-dot correct" : "streak-dot"} key={`${index}-${correct}`} />
            ))}
          </span>
        </div>
        <p>{data.streakLabel}</p>
      </section>

      <section className="stat-card-section">
        <p>My top-rated player this tournament</p>
        <div className="top-player-row">
          <span className="player-mini-avatar" aria-hidden="true">
            {data.topPlayer.portraitInitials}
          </span>
          <strong>{data.topPlayer.name}</strong>
          <span aria-label={`Rating ${data.topPlayer.rating}`}>* {data.topPlayer.rating}</span>
        </div>
      </section>

      <dl className="activity-list">
        <ActivityStat label="Squads submitted" value={data.squadsSubmitted} />
        <ActivityStat label="Votes cast" value={data.votesCast} />
        <ActivityStat label="Friends on platform" value={data.friendsCount} />
      </dl>

      <footer className="stat-card-actions">
        <button type="button">
          <Share2 size={16} aria-hidden="true" />
          Share card
        </button>
        <button type="button">
          <UserRoundPen size={16} aria-hidden="true" />
          Edit profile
        </button>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
