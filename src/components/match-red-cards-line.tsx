import type { MatchBoardRedCard } from "@/lib/fixtures/match-board-shared";
import { formatGoalMinute } from "@/lib/fixtures/match-board-shared";

type MatchRedCardsLineProps = {
  cards: MatchBoardRedCard[];
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
};

function cardsForSide(cards: MatchBoardRedCard[], side: "home" | "away") {
  return cards.filter((card) => card.teamSide === side);
}

function formatSideCards(cards: MatchBoardRedCard[]) {
  if (!cards.length) return null;
  return cards
    .map((card) => {
      const minute = formatGoalMinute(card);
      return minute ? `${card.playerName} ${minute}` : card.playerName;
    })
    .join(", ");
}

export function MatchRedCardsLine({
  cards,
  homeTeam,
  awayTeam,
  compact = false
}: MatchRedCardsLineProps) {
  if (!cards.length) return null;

  const homeCards = formatSideCards(cardsForSide(cards, "home"));
  const awayCards = formatSideCards(cardsForSide(cards, "away"));
  if (!homeCards && !awayCards) return null;

  return (
    <div className={`match-red-cards-line${compact ? " match-red-cards-line--compact" : ""}`}>
      {homeCards ? (
        <p>
          <strong>{homeTeam}</strong> {homeCards}
        </p>
      ) : null}
      {awayCards ? (
        <p>
          <strong>{awayTeam}</strong> {awayCards}
        </p>
      ) : null}
    </div>
  );
}
