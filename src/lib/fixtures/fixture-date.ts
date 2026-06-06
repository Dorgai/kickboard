/** Parse Wikipedia footballbox dates, e.g. "June 11, 2026 (2026-06-11) 1:00 p.m. UTC−6". */
export function parseWorldCupFixtureDate(date: string | null | undefined) {
  if (!date?.trim()) return null;

  const normalized = date
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/−/g, "-")
    .replace(/\u2013/g, "-");

  const isoInParens = normalized.match(/\((20\d{2}-\d{2}-\d{2})\)/);
  const isoLoose = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const dayIso = isoInParens?.[1] ?? isoLoose?.[1];

  if (!dayIso) {
    const fallback = Date.parse(normalized);
    return Number.isNaN(fallback) ? null : new Date(fallback);
  }

  let hours = 12;
  let minutes = 0;
  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i);
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
    if (/p\.m\./i.test(timeMatch[3]) && hours < 12) hours += 12;
    if (/a\.m\./i.test(timeMatch[3]) && hours === 12) hours = 0;
  }

  let offsetMinutes = 0;
  const tzMatch = normalized.match(/UTC\s*([+-])\s*(\d{1,2})/i);
  if (tzMatch) {
    const sign = tzMatch[1] === "-" ? -1 : 1;
    offsetMinutes = sign * Number(tzMatch[2]) * 60;
  }

  const year = Number(dayIso.slice(0, 4));
  const month = Number(dayIso.slice(5, 7)) - 1;
  const day = Number(dayIso.slice(8, 10));
  const localAsUtc = Date.UTC(year, month, day, hours, minutes, 0);
  const utcMs = localAsUtc - offsetMinutes * 60 * 1000;
  const kickoff = new Date(utcMs);
  return Number.isNaN(kickoff.getTime()) ? null : kickoff;
}
