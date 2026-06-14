"use client";

import { useRef, type CSSProperties } from "react";
import { useMatchBoardOptional } from "@/components/match-board-provider";
import { useOptionalEventTab } from "@/components/event-tab-provider";
import { MatchGoalScorersLine } from "@/components/match-goal-scorers-line";
import { MatchRedCardsLine } from "@/components/match-red-cards-line";
import { MatchTeamsLine } from "@/components/team-label";
import { useLiveClock } from "@/hooks/use-live-clock";
import { usePlayedMatchesStripFade } from "@/hooks/use-played-matches-strip-fade";
import { formatFixtureDateDivider } from "@/lib/fixtures/fixture-key";
import type { MatchBoardCard } from "@/lib/fixtures/match-board-shared";
import { resolveLiveElapsed } from "@/lib/fixtures/live-elapsed";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";
import { useLocationHash } from "@/lib/use-location-hash";

function statusLabel(card: MatchBoardCard, nowMs: number) {
  if (card.status === "live") {
    const elapsed = resolveLiveElapsed(card.status, card.date, card.elapsed, nowMs);
    return elapsed != null ? `Live · ${elapsed}'` : "Live";
  }
  if (card.status === "finished") {
    return card.statusShort === "FT" ? "FT" : card.statusShort || "FT";
  }
  if (card.startsInMinutes != null) {
    return `Starts in ${card.startsInMinutes}m`;
  }
  return "Soon";
}

function formatPlayedMatchDate(date: string | null) {
  if (!date?.trim()) return null;
  return formatFixtureDateDivider(date);
}

export function MatchBoardStrip() {
  const matchBoard = useMatchBoardOptional();
  const payload = matchBoard?.payload;
  const hash = useLocationHash();
  const eventTab = useOptionalEventTab();
  const fadeEnabled = eventTab?.activeTab === "current";
  const hasLive =
    (payload?.live?.length ?? 0) > 0 ||
    Object.values(payload?.byKey ?? {}).some((state) => state.status === "live");
  const liveNowMs = useLiveClock(hasLive);

  const playedCards = [...(payload?.live ?? []), ...(payload?.recentResults ?? [])];
  const upcomingCards = payload?.startingSoon ?? [];
  const stripActive = Boolean(payload?.connected && (playedCards.length > 0 || upcomingCards.length > 0));
  const { playedTrackRef, opacity, collapsed } = usePlayedMatchesStripFade(
    fadeEnabled,
    hash,
    stripActive && playedCards.length > 0
  );

  if (!stripActive) return null;

  const renderPlayedCard = (card: MatchBoardCard) => {
    const matchDate = formatPlayedMatchDate(card.date);

    return (
      <button
        className={`match-board-strip-card${
          card.status === "live"
            ? " match-board-strip-card--live"
            : " match-board-strip-card--result"
        }`}
        key={card.fixtureKey}
        type="button"
        onClick={() => navigateToPredictFixture(card.fixtureKey, { scrollToTop: true })}
      >
        <span className="match-board-strip-status">{statusLabel(card, liveNowMs)}</span>
        {matchDate ? <span className="match-board-strip-date">{matchDate}</span> : null}
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
        {card.redCards.length > 0 ? (
          <MatchRedCardsLine
            awayTeam={card.awayTeam}
            cards={card.redCards}
            compact
            homeTeam={card.homeTeam}
          />
        ) : null}
      </button>
    );
  };

  const renderUpcomingCard = (card: MatchBoardCard) => (
    <button
      className="match-board-strip-card"
      key={card.fixtureKey}
      type="button"
      onClick={() => navigateToPredictFixture(card.fixtureKey, { scrollToTop: true })}
    >
      <span className="match-board-strip-status">{statusLabel(card, liveNowMs)}</span>
      <MatchTeamsLine
        awayTeam={card.awayTeam}
        homeTeam={card.homeTeam}
        layout="stacked"
        size="xs"
      />
    </button>
  );

  return (
    <section aria-label="Live and upcoming matches" className="match-board-strip">
      {playedCards.length > 0 ? (
        <div
          className={`match-board-strip-played-shell${collapsed ? " match-board-strip-played-shell--collapsed" : ""}`}
          style={{ "--played-strip-opacity": opacity } as CSSProperties}
        >
          <div
            aria-hidden={collapsed}
            aria-label="Live and recent results"
            className="match-board-strip-track match-board-strip-track--played"
            ref={playedTrackRef}
          >
            {playedCards.map(renderPlayedCard)}
          </div>
        </div>
      ) : null}
      {upcomingCards.length > 0 ? (
        <div
          aria-label="Upcoming matches"
          className="match-board-strip-track match-board-strip-track--upcoming"
        >
          {upcomingCards.map(renderUpcomingCard)}
        </div>
      ) : null}
    </section>
  );
}
