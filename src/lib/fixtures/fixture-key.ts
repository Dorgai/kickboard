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

function slugPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
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

export function formatFixtureLabel(input: {
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  group?: string | null;
}) {
  const teams = `${input.homeTeam} vs ${input.awayTeam}`;
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
  if (key.startsWith("api-football:")) return "Live match";

  const parts = key.split(":");
  if (parts[0] === "wc26" && parts.length >= 5) {
    const home = titleCaseSlug(parts[2] ?? "home");
    const away = titleCaseSlug(parts[3] ?? "away");
    const group = parts[1] && parts[1] !== "x" ? ` · Group ${parts[1].toUpperCase()}` : "";
    return `${home} vs ${away}${group}`;
  }

  return key;
}

export function parseFixtureSortKey(date: string | null) {
  if (!date) return "9999-99-99";
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date;
  return new Date(parsed).toISOString();
}
