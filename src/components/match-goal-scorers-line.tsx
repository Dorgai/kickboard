import type { MatchBoardGoal } from "@/lib/fixtures/fixture-key";
import { formatGoalMinute } from "@/lib/fixtures/match-board-shared";

type MatchGoalScorersLineProps = {
  goals: MatchBoardGoal[];
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
};

function goalsForSide(goals: MatchBoardGoal[], side: "home" | "away") {
  return goals.filter((goal) => goal.teamSide === side);
}

function formatSideGoals(goals: MatchBoardGoal[]) {
  if (!goals.length) return null;
  return goals
    .map((goal) => {
      const minute = formatGoalMinute(goal);
      return minute ? `${goal.playerName} ${minute}` : goal.playerName;
    })
    .join(", ");
}

export function MatchGoalScorersLine({
  goals,
  homeTeam,
  awayTeam,
  compact = false
}: MatchGoalScorersLineProps) {
  if (!goals.length) return null;

  const homeGoals = formatSideGoals(goalsForSide(goals, "home"));
  const awayGoals = formatSideGoals(goalsForSide(goals, "away"));
  if (!homeGoals && !awayGoals) return null;

  return (
    <div className={`match-goal-scorers-line${compact ? " match-goal-scorers-line--compact" : ""}`}>
      {homeGoals ? (
        <p>
          <strong>{homeTeam}</strong> {homeGoals}
        </p>
      ) : null}
      {awayGoals ? (
        <p>
          <strong>{awayTeam}</strong> {awayGoals}
        </p>
      ) : null}
    </div>
  );
}
