/** Normalized tokens for matching feed labels to provider team names. */
const TEAM_ALIAS_GROUPS: string[][] = [
  ["united states", "usa", "u s a"],
  ["south korea", "korea republic", "republic of korea"],
  ["north korea", "korea dpr"],
  ["ivory coast", "cote d ivoire", "côte d ivoire"],
  ["dr congo", "congo dr", "democratic republic of the congo", "drc"],
  ["republic of ireland", "ireland"],
  ["cape verde", "cabo verde"],
  ["curacao", "curaçao"],
  ["czech republic", "czechia"],
  ["bosnia and herzegovina", "bosnia herzegovina"],
];

export function normalizeTeamName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasTokens(normalized: string) {
  const tokens = new Set<string>([normalized]);
  for (const group of TEAM_ALIAS_GROUPS) {
    const hit = group.some(
      (alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized)
    );
    if (hit) {
      for (const alias of group) tokens.add(alias);
    }
  }
  return tokens;
}

function fuzzyContains(longer: string, shorter: string) {
  if (shorter.length < 4) return false;
  if (longer === shorter) return true;
  return (
    longer.startsWith(`${shorter} `) ||
    longer.endsWith(` ${shorter}`) ||
    longer.includes(` ${shorter} `)
  );
}

export function teamsMatch(left: string, right: string) {
  const a = normalizeTeamName(left);
  const b = normalizeTeamName(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const aTokens = aliasTokens(a);
  const bTokens = aliasTokens(b);
  for (const token of aTokens) {
    if (bTokens.has(token)) return true;
  }

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return fuzzyContains(longer, shorter);
}

/**
 * Map a feed/UI team label to the closest name present in provider data (e.g. StatsBomb).
 */
export function resolveTeamName(requested: string, knownNames: string[]) {
  const normalized = normalizeTeamName(requested);
  if (!normalized) return null;

  for (const known of knownNames) {
    if (teamsMatch(requested, known)) return known;
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const known of knownNames) {
    const k = normalizeTeamName(known);
    if (!k) continue;
    const shared = [...aliasTokens(normalized)].filter((token) => aliasTokens(k).has(token)).length;
    if (shared > bestScore) {
      bestScore = shared;
      best = known;
    }
  }

  return bestScore > 0 ? best : null;
}
