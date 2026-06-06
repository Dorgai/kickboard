import { parseWorldCupFixtureDate } from "@/lib/fixtures/fixture-date";

export type FixtureOption = {
  key: string;
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  group: string | null;
  status: "upcoming" | "live" | "finished";
  label: string;
  sortKey: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

export function teamNameToFixtureSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function slugPart(value: string) {
  return teamNameToFixtureSlug(value);
}

export function buildWorldCupFixtureKey(input: {
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  group?: string | null;
}) {
  const group = slugPart(input.group ?? "x") || "x";
  const home = slugPart(input.homeTeam) || "home";
  const away = slugPart(input.awayTeam) || "away";
  const date = slugPart(input.date ?? "tbd") || "tbd";
  return `wc26:${group}:${home}:${away}:${date}`;
}

export function buildApiFootballFixtureKey(fixtureId: number) {
  return `api-football:${fixtureId}`;
}

export function parseApiFootballFixtureId(fixtureKey: string | null | undefined) {
  const key = fixtureKey?.trim() ?? "";
  if (!key.startsWith("api-football:")) return null;
  const id = Number(key.slice("api-football:".length));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function formatFixtureTeamsLabel(homeTeam: string, awayTeam: string) {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  if (home && away) return `${home} vs ${away}`;
  if (home) return home;
  if (away) return away;
  return "";
}

export function formatFixtureLabel(input: {
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  group?: string | null;
}) {
  const teams = formatFixtureTeamsLabel(input.homeTeam, input.awayTeam) || "Match";
  const meta = [input.group ? `Group ${input.group}` : null, input.date].filter(Boolean).join(" · ");
  return meta ? `${teams} — ${meta}` : teams;
}

function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Human-readable label from a stored fixture_key (best-effort for wc26 keys). */
export function fixtureKeyToShortLabel(fixtureKey: string) {
  const key = fixtureKey.trim();
  if (!key) return "Match";
  if (key.startsWith("api-football:")) return "Match";

  const parts = key.split(":");
  if (parts[0] === "wc26" && parts.length >= 5) {
    const home = titleCaseSlug(parts[2] ?? "home");
    const away = titleCaseSlug(parts[3] ?? "away");
    const group = parts[1] && parts[1] !== "x" ? ` · Group ${parts[1].toUpperCase()}` : "";
    return `${home} vs ${away}${group}`;
  }

  return key;
}

export function parseFixtureKeyTeams(fixtureKey: string) {
  const label = fixtureKeyToShortLabel(fixtureKey);
  const vsIndex = label.toLowerCase().indexOf(" vs ");
  if (vsIndex >= 0) {
    const homeTeam = label.slice(0, vsIndex).trim();
    const afterVs = label.slice(vsIndex + 4).trim();
    const awayTeam = afterVs.split(" · ")[0]?.trim() ?? afterVs;
    return { homeTeam: homeTeam || "Home", awayTeam: awayTeam || "Away" };
  }
  return { homeTeam: "Home", awayTeam: "Away" };
}

function kickoffInstant(date: string | null) {
  if (!date?.trim()) return null;
  const fromFeed = parseWorldCupFixtureDate(date);
  if (fromFeed) return fromFeed;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function parseFixtureSortKey(date: string | null) {
  const kickoff = kickoffInstant(date);
  if (!kickoff) return date?.trim() ? `9999-99-98:${date.trim()}` : "9999-99-99";
  return kickoff.toISOString();
}

/** Stable day bucket for grouping fixtures in lists (YYYY-MM-DD or fallback). */
export function fixtureDateGroupKey(date: string | null) {
  const kickoff = kickoffInstant(date);
  if (!kickoff) return date?.trim() ? date.trim().toLowerCase() : "unknown";
  return kickoff.toISOString().slice(0, 10);
}

export function compareFixtureOptions(a: FixtureOption, b: FixtureOption) {
  const byKickoff = a.sortKey.localeCompare(b.sortKey);
  if (byKickoff !== 0) return byKickoff;
  return a.key.localeCompare(b.key);
}

export function sortFixtureOptions(fixtures: FixtureOption[]) {
  return [...fixtures].sort(compareFixtureOptions);
}

/** Upcoming and live fixtures first, earliest kickoff on top. Finished matches last. */
export function sortCoachBoardFixtures(fixtures: FixtureOption[]) {
  const statusRank: Record<FixtureOption["status"], number> = {
    live: 0,
    upcoming: 1,
    finished: 2
  };

  return [...fixtures].sort((a, b) => {
    const byStatus = statusRank[a.status] - statusRank[b.status];
    if (byStatus !== 0) return byStatus;
    return compareFixtureOptions(a, b);
  });
}

/** Human-readable date heading for fixture picker timelines. */
export function formatFixtureDateDivider(date: string | null) {
  if (!date?.trim()) return "Date TBD";
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date.trim();
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(parsed));
}

export type FixtureDateGroup = {
  dateKey: string;
  label: string;
  fixtures: FixtureOption[];
};

/** Preserve fixture sort order while splitting into day groups. */
export function groupFixturesByDate(fixtures: FixtureOption[]): FixtureDateGroup[] {
  const groups: FixtureDateGroup[] = [];

  for (const fixture of fixtures) {
    const dateKey = fixtureDateGroupKey(fixture.date);
    const last = groups[groups.length - 1];
    if (!last || last.dateKey !== dateKey) {
      groups.push({
        dateKey,
        label: formatFixtureDateDivider(fixture.date),
        fixtures: [fixture]
      });
    } else {
      last.fixtures.push(fixture);
    }
  }

  return groups;
}
