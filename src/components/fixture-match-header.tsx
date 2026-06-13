import { MatchGoalScorersLine } from "@/components/match-goal-scorers-line";
import { useLiveClock } from "@/hooks/use-live-clock";
import { parseWorldCupFixtureDate } from "@/lib/feeds/current-world-cup";
import { formatFixtureDateDivider } from "@/lib/fixtures/fixture-key";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";
import { resolveLiveElapsed } from "@/lib/fixtures/live-elapsed";
import { MatchTeamsLine } from "@/components/team-label";

type FixtureMatchHeaderProps = Pick<
  FixtureOption,
  "homeTeam" | "awayTeam" | "group" | "date" | "status" | "homeGoals" | "awayGoals" | "elapsed" | "goalScorers"
> & {
  className?: string;
  teamsSize?: "xs" | "sm" | "md";
  align?: "start" | "center";
};

function fixtureEyebrow(
  group: string | null,
  status: FixtureOption["status"],
  elapsed: number | null | undefined
) {
  if (status === "live") return elapsed != null ? `Live · ${elapsed}'` : "Live";
  if (status === "finished") return "Full time";
  if (group?.trim()) return `Group ${group.trim()}`;
  return "Match";
}

function fixtureMatchMeta(date: string | null) {
  const kickoff = parseWorldCupFixtureDate(date);
  if (kickoff) {
    return kickoff.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    });
  }
  if (date?.trim()) return formatFixtureDateDivider(date);
  return "";
}

/** Scoreline-style header (teams + meta) used in Coach Board and match focus panels. */
export function FixtureMatchHeader({
  homeTeam,
  awayTeam,
  group,
  date,
  status,
  homeGoals,
  awayGoals,
  elapsed = null,
  goalScorers = [],
  className = "",
  teamsSize = "sm",
  align = "start"
}: FixtureMatchHeaderProps) {
  const hasScore = homeGoals != null && awayGoals != null;
  const meta = fixtureMatchMeta(date);
  const liveNowMs = useLiveClock(status === "live");
  const liveElapsed = resolveLiveElapsed(status, date, elapsed, liveNowMs);

  return (
    <header
      className={`match-focus-scoreline fixture-match-header fixture-match-header--${align}${className ? ` ${className}` : ""}`}
    >
      <p className="eyebrow">{fixtureEyebrow(group, status, liveElapsed)}</p>
      <MatchTeamsLine
        awayScore={hasScore ? awayGoals : undefined}
        awayTeam={awayTeam}
        homeScore={hasScore ? homeGoals : undefined}
        homeTeam={homeTeam}
        layout="inline"
        size={teamsSize}
      />
      {meta ? <p className="match-focus-meta">{meta}</p> : null}
      {goalScorers && goalScorers.length > 0 ? (
        <MatchGoalScorersLine awayTeam={awayTeam} goals={goalScorers} homeTeam={homeTeam} />
      ) : null}
    </header>
  );
}
