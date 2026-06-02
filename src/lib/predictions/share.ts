import {
  formatScorerPicksSummary,
  outcomeLabel,
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

export function decodePredictionShare(token: string): PredictionSharePayload | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(trimmed)) as PredictionSharePayload;
    if (parsed?.v !== 1 || !parsed.fixtureKey || !parsed.homeTeam || !parsed.awayTeam) return null;
    return {
      v: 1,
      fixtureKey: String(parsed.fixtureKey).slice(0, 120),
      fixtureLabel: String(parsed.fixtureLabel ?? `${parsed.homeTeam} vs ${parsed.awayTeam}`).slice(0, 120),
      homeTeam: String(parsed.homeTeam).slice(0, 80),
      awayTeam: String(parsed.awayTeam).slice(0, 80),
      predictedOutcome:
        parsed.predictedOutcome === "home" ||
        parsed.predictedOutcome === "away" ||
        parsed.predictedOutcome === "draw"
          ? parsed.predictedOutcome
          : null,
      homeScore: typeof parsed.homeScore === "number" ? parsed.homeScore : null,
      awayScore: typeof parsed.awayScore === "number" ? parsed.awayScore : null,
      scorerPicks: Array.isArray(parsed.scorerPicks)
        ? (parsed.scorerPicks as PredictionSharePayload["scorerPicks"])
        : [],
      displayName: parsed.displayName ? String(parsed.displayName).slice(0, 80) : null
    };
  } catch {
    return null;
  }
}

export function resolveAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim() || "";
  return fromEnv.replace(/\/$/, "") || "https://kickboard-production.up.railway.app";
}

export function buildPredictionSharePageUrl(payload: PredictionSharePayload) {
  const origin = resolveAppOrigin();
  const token = encodePredictionShare(payload);
  return `${origin}/share/prediction?d=${encodeURIComponent(token)}`;
}

export function buildPredictionAppDeepLink(fixtureKey: string) {
  const origin = resolveAppOrigin();
  const params = new URLSearchParams({ predictionsFixture: fixtureKey });
  return `${origin}/?${params.toString()}#predictions`;
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
