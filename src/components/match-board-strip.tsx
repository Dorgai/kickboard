"use client";

import { useMatchBoardOptional } from "@/components/match-board-provider";
import { MatchGoalScorersLine } from "@/components/match-goal-scorers-line";
import { MatchTeamsLine } from "@/components/team-label";
import type { MatchBoardCard } from "@/lib/fixtures/match-board-shared";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";

function statusLabel(card: MatchBoardCard) {
  if (card.status === "live") {
    return card.elapsed != null ? `Live · ${card.elapsed}'` : "Live";
  }
  if (card.status === "finished") {
    return card.statusShort === "FT" ? "FT" : card.statusShort || "FT";
  }
  if (card.startsInMinutes != null) {
    return `Starts in ${card.startsInMinutes}m`;
  }
  return "Soon";
}

export function MatchBoardStrip() {
  const matchBoard = useMatchBoardOptional();
  const payload = matchBoard?.payload;

  if (!payload?.connected) return null;

  const cards = [...payload.live, ...(payload.recentResults ?? []), ...payload.startingSoon];
  if (!cards.length) return null;

  return (
    <section aria-label="Live and upcoming matches" className="match-board-strip">
      <div className="match-board-strip-track">
        {cards.map((card) => (
          <button
            className={`match-board-strip-card${
              card.status === "live"
                ? " match-board-strip-card--live"
                : card.segment === "recent_result"
                  ? " match-board-strip-card--result"
                  : ""
            }`}
            key={card.fixtureKey}
            type="button"
            onClick={() => navigateToPredictFixture(card.fixtureKey, { scrollToTop: true })}
          >
            <span className="match-board-strip-status">{statusLabel(card)}</span>
            <MatchTeamsLine
              awayScore={card.awayGoals ?? undefined}
              awayTeam={card.awayTeam}
              homeScore={card.homeGoals ?? undefined}
              homeTeam={card.homeTeam}
              layout="stacked"
              size="xs"
            />
            {card.goalScorers.length > 0 ? (
              <MatchGoalScorersLine
                awayTeam={card.awayTeam}
                compact
                goals={card.goalScorers}
                homeTeam={card.homeTeam}
              />
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
