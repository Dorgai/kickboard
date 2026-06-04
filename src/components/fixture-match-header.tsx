import { parseWorldCupFixtureDate } from "@/lib/feeds/current-world-cup";
import { formatFixtureDateDivider } from "@/lib/fixtures/fixture-key";
import type { FixtureOption } from "@/lib/fixtures/fixture-key";
import { MatchTeamsLine } from "@/components/team-label";

type FixtureMatchHeaderProps = Pick<
  FixtureOption,
  "homeTeam" | "awayTeam" | "group" | "date" | "status" | "homeGoals" | "awayGoals"
> & {
  className?: string;
  teamsSize?: "xs" | "sm" | "md";
};

function fixtureEyebrow(group: string | null, status: FixtureOption["status"]) {
  if (status === "live") return "Live";
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
  className = "",
  teamsSize = "sm"
}: FixtureMatchHeaderProps) {
  const hasScore = homeGoals != null && awayGoals != null;
  const meta = fixtureMatchMeta(date);

  return (
    <header className={`match-focus-scoreline fixture-match-header${className ? ` ${className}` : ""}`}>
      <p className="eyebrow">{fixtureEyebrow(group, status)}</p>
      <MatchTeamsLine
        awayScore={hasScore ? awayGoals : undefined}
        awayTeam={awayTeam}
        homeScore={hasScore ? homeGoals : undefined}
        homeTeam={homeTeam}
        layout="inline"
        size={teamsSize}
      />
      {meta ? <p className="match-focus-meta">{meta}</p> : null}
    </header>
  );
}
