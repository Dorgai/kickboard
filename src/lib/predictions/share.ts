import { parseFixtureKeyTeams } from "@/lib/fixtures/fixture-key";
import {
  formatScorerPicksSummary,
  outcomeLabel,
  parseScorerPicks,
  type FixtureOutcome,
  type ScorerPick
} from "@/lib/fixture-predictions/types";

export type PredictionSharePayload = {
  v: 1;
  fixtureKey: string;
  fixtureLabel: string;
  homeTeam: string;
  awayTeam: string;
  predictedOutcome: FixtureOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: ScorerPick[];
  displayName?: string | null;
};

function base64UrlEncode(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(token: string) {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
  if (typeof Buffer !== "undefined") {
    return Buffer.from(pad, "base64").toString("utf8");
  }
  const binary = atob(pad);
  const percentEncoded = Array.from(binary, (char) =>
    `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`
  ).join("");
  return decodeURIComponent(percentEncoded);
}

export function encodePredictionShare(payload: PredictionSharePayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

/** Normalize tokens from URLs, query strings, or pasted text (messengers often break `?d=` links). */
export function normalizePredictionShareToken(raw: string | null | undefined): string {
  if (!raw) return "";
  let token = raw.trim();
  if (!token) return "";

  try {
    if (/^https?:\/\//i.test(token)) {
      const url = new URL(token);
      const fromShort = url.searchParams.get("s") ?? url.searchParams.get("id");
      const fromQuery = url.searchParams.get("d");
      if (fromShort) {
        token = fromShort;
      } else if (fromQuery) {
        token = fromQuery;
      } else {
        const segments = url.pathname.split("/").filter(Boolean);
        const shareIdx = segments.findIndex((part) => part === "share");
        if (shareIdx >= 0 && segments[shareIdx + 1] === "p" && segments[shareIdx + 2]) {
          token = segments[shareIdx + 2] ?? token;
        } else if (shareIdx >= 0 && segments[shareIdx + 1] === "prediction" && segments[shareIdx + 2]) {
          token = segments[shareIdx + 2] ?? token;
        }
      }
    }
  } catch {
    /* not a full URL */
  }

  token = token.replace(/\s/g, "");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(token);
      if (decoded !== token) {
        token = decoded.replace(/\s/g, "");
        continue;
      }
    } catch {
      break;
    }
    break;
  }

  return token;
}

export function decodePredictionShare(rawToken: string): PredictionSharePayload | null {
  const token = normalizePredictionShareToken(rawToken);
  if (!token) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(token)) as Partial<PredictionSharePayload>;
    const fixtureKey = typeof parsed.fixtureKey === "string" ? parsed.fixtureKey.trim() : "";
    if (!fixtureKey) return null;
    if (parsed.v !== undefined && parsed.v !== 1) return null;

    const teamsFromKey = parseFixtureKeyTeams(fixtureKey);
    const homeTeam =
      typeof parsed.homeTeam === "string" && parsed.homeTeam.trim()
        ? parsed.homeTeam.trim()
        : teamsFromKey.homeTeam;
    const awayTeam =
      typeof parsed.awayTeam === "string" && parsed.awayTeam.trim()
        ? parsed.awayTeam.trim()
        : teamsFromKey.awayTeam;

    if (!homeTeam || !awayTeam) return null;

    return {
      v: 1,
      fixtureKey: fixtureKey.slice(0, 120),
      fixtureLabel: String(parsed.fixtureLabel ?? `${homeTeam} vs ${awayTeam}`).slice(0, 120),
      homeTeam: homeTeam.slice(0, 80),
      awayTeam: awayTeam.slice(0, 80),
      predictedOutcome:
        parsed.predictedOutcome === "home" ||
        parsed.predictedOutcome === "away" ||
        parsed.predictedOutcome === "draw"
          ? parsed.predictedOutcome
          : null,
      homeScore: typeof parsed.homeScore === "number" ? parsed.homeScore : null,
      awayScore: typeof parsed.awayScore === "number" ? parsed.awayScore : null,
      scorerPicks: parseScorerPicks(parsed.scorerPicks),
      displayName: parsed.displayName ? String(parsed.displayName).slice(0, 80) : null
    };
  } catch {
    return null;
  }
}

export function readShareTokenFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  const raw = searchParams.d ?? searchParams.token;
  if (Array.isArray(raw)) return normalizePredictionShareToken(raw[0]);
  return normalizePredictionShareToken(raw);
}

export function resolveAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim() || "";
  return fromEnv.replace(/\/$/, "") || "https://kickboard-production.up.railway.app";
}

/** Short share URL stored server-side (preferred). */
export function buildPredictionSharePageUrl(shareId: string) {
  const origin = resolveAppOrigin();
  const id = shareId.trim();
  return `${origin}/share/p/${encodeURIComponent(id)}`;
}

/** Fallback when DB is unavailable — embeds pick data in the URL (may break in some apps). */
export function buildPredictionSharePageUrlEmbedded(payload: PredictionSharePayload) {
  const origin = resolveAppOrigin();
  const token = encodePredictionShare(payload);
  return `${origin}/share/prediction/${token}`;
}

export function readShortShareIdFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  const raw = searchParams.s ?? searchParams.id;
  if (Array.isArray(raw)) return raw[0]?.trim() ?? "";
  return raw?.trim() ?? "";
}

export function buildPredictionAppDeepLink(fixtureKey: string) {
  const origin = resolveAppOrigin();
  const params = new URLSearchParams({ predictionsFixture: fixtureKey });
  return `${origin}/?${params.toString()}&predictionsTab=match#predictions-match`;
}

export function buildPredictionShareCaption(payload: PredictionSharePayload) {
  const parts: string[] = [];
  const who = payload.displayName?.trim();
  if (who) parts.push(`${who} on Kickboard`);

  parts.push(payload.fixtureLabel);

  if (payload.predictedOutcome) {
    parts.push(`Pick: ${outcomeLabel(payload.predictedOutcome, payload.homeTeam, payload.awayTeam)}`);
  }

  if (payload.homeScore !== null && payload.awayScore !== null) {
    parts.push(`Score: ${payload.homeScore}–${payload.awayScore}`);
  }

  if (payload.scorerPicks.length > 0) {
    parts.push(`Scorers: ${formatScorerPicksSummary(payload.scorerPicks)}`);
  }

  parts.push("Make your picks on Kickboard for the World Cup.");
  return parts.join(" · ");
}

export function buildFacebookShareUrl(sharePageUrl: string) {
  const params = new URLSearchParams({
    u: sharePageUrl,
    quote: ""
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}
