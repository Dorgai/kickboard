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

export function parseFixtureSortKey(date: string | null) {
  if (!date) return "9999-99-99";
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date;
  return new Date(parsed).toISOString();
}
