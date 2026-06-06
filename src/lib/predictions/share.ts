import { BRAND } from "@/lib/brand";
import { parseFixtureKeyTeams } from "@/lib/fixtures/fixture-key";
import {
  formatScorerPicksSummary,
  outcomeLabel,
  parseScorerPicks,
  type FixtureOutcome,
  type ScorerPick
} from "@/lib/fixture-predictions/types";
import {
  DEFAULT_TOURNAMENT_KEY,
  parseTournamentPlayerPick,
  parseTournamentTopScorerBoard,
  type TournamentPlayerPick,
  type TournamentTopScorerBoard
} from "@/lib/tournament-predictions/types";

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

export type TournamentSharePayload = {
  kind: "tournament";
  v: 1;
  tournamentKey: string;
  tournamentLabel: string;
  predictedChampion: string | null;
  predictedFinalOpponent: string | null;
  predictedTopScorer: TournamentPlayerPick | null;
  predictedTopScorerBoard: TournamentTopScorerBoard | null;
  predictedBestPlayer: TournamentPlayerPick | null;
  displayName?: string | null;
};

export type SharePayload = PredictionSharePayload | TournamentSharePayload;

export function isTournamentSharePayload(payload: SharePayload): payload is TournamentSharePayload {
  return "kind" in payload && payload.kind === "tournament";
}

export function isFixtureSharePayload(payload: SharePayload): payload is PredictionSharePayload {
  return !isTournamentSharePayload(payload);
}

const TOURNAMENT_LABEL_BY_KEY: Record<string, string> = {
  WC26: "World Cup 2026"
};

export function tournamentLabelFromKey(tournamentKey: string) {
  const key = tournamentKey.trim();
  return TOURNAMENT_LABEL_BY_KEY[key] ?? key;
}

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

export function encodeSharePayload(payload: SharePayload): string {
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

function normalizeTournamentSharePayload(
  parsed: Partial<TournamentSharePayload>
): TournamentSharePayload | null {
  if (parsed.kind !== "tournament") return null;
  if (parsed.v !== undefined && parsed.v !== 1) return null;

  const tournamentKey =
    typeof parsed.tournamentKey === "string" && parsed.tournamentKey.trim()
      ? parsed.tournamentKey.trim()
      : DEFAULT_TOURNAMENT_KEY;

  const predictedChampion =
    typeof parsed.predictedChampion === "string" && parsed.predictedChampion.trim()
      ? parsed.predictedChampion.trim().slice(0, 80)
      : null;
  const predictedFinalOpponent =
    typeof parsed.predictedFinalOpponent === "string" && parsed.predictedFinalOpponent.trim()
      ? parsed.predictedFinalOpponent.trim().slice(0, 80)
      : null;
  const predictedTopScorer = parseTournamentPlayerPick(parsed.predictedTopScorer);
  const predictedTopScorerBoard = parseTournamentTopScorerBoard(parsed.predictedTopScorerBoard);
  const predictedBestPlayer = parseTournamentPlayerPick(parsed.predictedBestPlayer);

  const hasPick = Boolean(
    predictedChampion ||
      predictedFinalOpponent ||
      predictedTopScorer ||
      predictedTopScorerBoard ||
      predictedBestPlayer
  );
  if (!hasPick) return null;

  return {
    kind: "tournament",
    v: 1,
    tournamentKey: tournamentKey.slice(0, 40),
    tournamentLabel: String(parsed.tournamentLabel ?? tournamentLabelFromKey(tournamentKey)).slice(
      0,
      120
    ),
    predictedChampion,
    predictedFinalOpponent,
    predictedTopScorer,
    predictedTopScorerBoard,
    predictedBestPlayer,
    displayName: parsed.displayName ? String(parsed.displayName).slice(0, 80) : null
  };
}

export function decodeSharePayload(rawToken: string): SharePayload | null {
  const token = normalizePredictionShareToken(rawToken);
  if (!token) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(token)) as Partial<TournamentSharePayload>;
    if (parsed.kind === "tournament") {
      return normalizeTournamentSharePayload(parsed);
    }
  } catch {
    /* fall through to fixture decode */
  }

  return decodePredictionShare(rawToken);
}

export function decodePredictionShare(rawToken: string): PredictionSharePayload | null {
  const token = normalizePredictionShareToken(rawToken);
  if (!token) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(token)) as Partial<PredictionSharePayload>;
    if ("kind" in parsed && parsed.kind === "tournament") return null;
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
  return fromEnv.replace(/\/$/, "") || BRAND.url;
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

export function buildSharePageUrlEmbedded(payload: SharePayload) {
  const origin = resolveAppOrigin();
  const token = encodeSharePayload(payload);
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

export function buildTournamentAppDeepLink(tournamentKey: string = DEFAULT_TOURNAMENT_KEY) {
  const origin = resolveAppOrigin();
  const params = new URLSearchParams({ tournamentKey });
  return `${origin}/?${params.toString()}&predictionsTab=tournament#predictions-tournament`;
}

function formatTournamentScorerBoardSummary(board: TournamentTopScorerBoard) {
  return board.picks
    .map((pick) => `#${pick.rank} ${pick.playerName} (${pick.predictedGoals}g)`)
    .join(", ");
}

export function buildTournamentShareCaption(payload: TournamentSharePayload) {
  const parts: string[] = [];
  const who = payload.displayName?.trim();
  if (who) parts.push(`${who} on MyPicks`);

  parts.push(`${payload.tournamentLabel} tournament picks`);

  if (payload.predictedChampion) {
    parts.push(`Champion: ${payload.predictedChampion}`);
  }
  if (payload.predictedFinalOpponent) {
    parts.push(`Final opponent: ${payload.predictedFinalOpponent}`);
  }
  if (payload.predictedTopScorer) {
    parts.push(`Top scorer: ${payload.predictedTopScorer.playerName}`);
  }
  if (payload.predictedTopScorerBoard) {
    parts.push(`Scorer board: ${formatTournamentScorerBoardSummary(payload.predictedTopScorerBoard)}`);
  }
  if (payload.predictedBestPlayer) {
    parts.push(`Best player: ${payload.predictedBestPlayer.playerName}`);
  }

  parts.push("Make your tournament picks on MyPicks for the World Cup.");
  return parts.join(" · ");
}

export function buildShareCaption(payload: SharePayload) {
  if (isTournamentSharePayload(payload)) {
    return buildTournamentShareCaption(payload);
  }
  return buildPredictionShareCaption(payload);
}

export function sharePayloadTitle(payload: SharePayload) {
  if (isTournamentSharePayload(payload)) {
    return `${payload.tournamentLabel} — MyPicks`;
  }
  return `${payload.fixtureLabel} — MyPicks`;
}

export function sharePayloadOpenGraphTitle(payload: SharePayload) {
  if (isTournamentSharePayload(payload)) {
    return `${payload.tournamentLabel} — MyPicks tournament picks`;
  }
  return `${payload.fixtureLabel} — MyPicks prediction`;
}

export function canSharePayload(payload: SharePayload) {
  if (isTournamentSharePayload(payload)) {
    return Boolean(
      payload.predictedChampion ||
        payload.predictedFinalOpponent ||
        payload.predictedTopScorer ||
        payload.predictedTopScorerBoard ||
        payload.predictedBestPlayer
    );
  }
  return Boolean(
    payload.predictedOutcome ||
      (payload.homeScore !== null && payload.awayScore !== null) ||
      payload.scorerPicks.length > 0
  );
}

export function buildPredictionShareCaption(payload: PredictionSharePayload) {
  const parts: string[] = [];
  const who = payload.displayName?.trim();
  if (who) parts.push(`${who} on MyPicks`);

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

  parts.push("Make your picks on MyPicks for the World Cup.");
  return parts.join(" · ");
}

export function buildFacebookShareUrl(sharePageUrl: string) {
  const params = new URLSearchParams({
    u: sharePageUrl,
    quote: ""
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}
