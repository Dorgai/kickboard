import * as cheerio from "cheerio";
import bundledSquads from "../../../content/wc26-squads.json";
import type { SquadPlayerRole } from "@/lib/squads/player-roles";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { normalizeTeamName, teamsMatch } from "@/lib/squads/team-names";
import { WIKIPEDIA_SQUAD_PLAYER_ID_BASE } from "@/lib/squads/wikipedia-squad";

const WC26_SQUADS_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads";
const WIKI_USER_AGENT = "MyPicksFeedBot/1.0 (https://mypicks.live; FIFA WC26 squad reader)";
/** Shorter cache during the tournament window — squads can change on late injury replacements. */
const CACHE_MS = 30 * 60 * 1000;

const NON_TEAM_HEADINGS = new Set([
  "age",
  "player representation by club",
  "player representation by league system",
  "player representation by club confederation",
  "average age of squads",
  "coach representation by country"
]);

/** Wikipedia h3 labels on the official squads page → common feed labels. */
const WIKI_TO_FEED_TEAM: Record<string, string> = {
  turkey: "Turkey",
  "czech republic": "Czech Republic",
  "south korea": "South Korea",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "ivory coast": "Ivory Coast",
  "cape verde": "Cape Verde",
  "dr congo": "DR Congo",
  iran: "Iran",
  curaçao: "Curaçao",
  curacao: "Curaçao"
};

type SquadCache = {
  loadedAt: number;
  byWikiName: Map<string, SquadPoolPlayer[]>;
  byNormalized: Map<string, string>;
};

let pageCache: SquadCache | null = null;
let bundledCache: SquadCache | null = null;

type BundledSquadsFile = {
  generatedAt: string;
  source: string;
  teamCount: number;
  teams: Array<{
    teamName: string;
    players: Array<{ name: string; role: string; jerseyNumber: number | null }>;
  }>;
};

function wikiPlayerId(teamName: string, playerName: string) {
  const key = `${normalizeTeamName(teamName)}:${normalizeTeamName(playerName)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) >>> 0;
  }
  return WIKIPEDIA_SQUAD_PLAYER_ID_BASE + 50_000_000 + (hash % 49_999_999);
}

function mapWikiRole(positionCell: string): SquadPlayerRole {
  const text = positionCell.toUpperCase();
  if (text.includes("GK") || text.includes("GOAL")) return "GK";
  if (text.includes("DF") || text.includes("DEF")) return "DEF";
  if (text.includes("FW") || text.includes("FOR")) return "FWD";
  return "MID";
}

function parseJerseyNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 && value < 100 ? value : null;
}

function cleanCellText(value: string) {
  return value.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
}

function feedLabelForWikiTeam(wikiTeamName: string) {
  const normalized = normalizeTeamName(wikiTeamName);
  return WIKI_TO_FEED_TEAM[normalized] ?? wikiTeamName.trim();
}

function parseSquadTable($: cheerio.CheerioAPI, table: ReturnType<cheerio.CheerioAPI>, wikiTeamName: string) {
  const displayTeam = feedLabelForWikiTeam(wikiTeamName);
  const players: SquadPoolPlayer[] = [];
  const seen = new Set<number>();

  table.find("tr.nat-fs-player").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length < 3) return;

    const numberCell = $(cells[0]).text().trim();
    const positionCell = $(cells[1]).text().trim();
    const nameCell =
      $(cells[2]).find("a").first().text().trim() ||
      $(cells[2]).attr("data-sort-value")?.split(",")[1]?.trim() ||
      $(cells[2]).text().trim();
    const name = cleanCellText(nameCell);
    if (!name || name.length < 2) return;

    const playerId = wikiPlayerId(displayTeam, name);
    if (seen.has(playerId)) return;
    seen.add(playerId);

    players.push({
      playerId,
      name,
      teamName: displayTeam,
      role: mapWikiRole(positionCell),
      jerseyNumber: parseJerseyNumber(numberCell)
    });
  });

  return players.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function parseWikipediaWc26SquadsHtml(html: string) {
  const $ = cheerio.load(html);
  const byWikiName = new Map<string, SquadPoolPlayer[]>();
  const byNormalized = new Map<string, string>();

  let currentHeading: string | null = null;

  $("h3, table.wikitable").each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    if (tag === "h3") {
      currentHeading = cleanCellText($(element).text()).replace(/\[edit\]$/i, "").trim();
      return;
    }

    if (tag !== "table" || !currentHeading) return;
    const normalizedHeading = normalizeTeamName(currentHeading);
    if (!normalizedHeading || NON_TEAM_HEADINGS.has(normalizedHeading)) {
      currentHeading = null;
      return;
    }

    const wikiTeamName = currentHeading;
    currentHeading = null;
    const players = parseSquadTable($, $(element), wikiTeamName);
    if (players.length < 11) return;

    byWikiName.set(wikiTeamName, players);
    byNormalized.set(normalizeTeamName(wikiTeamName), wikiTeamName);
    byNormalized.set(normalizeTeamName(players[0]?.teamName ?? wikiTeamName), wikiTeamName);
  });

  return { byWikiName, byNormalized };
}

async function fetchWc26SquadsPage() {
  const response = await fetch(`${WC26_SQUADS_URL}?action=render`, {
    headers: { "User-Agent": WIKI_USER_AGENT },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) {
    throw new Error(`WC26 squads page returned ${response.status}`);
  }
  return response.text();
}

function loadBundledWc26Squads() {
  if (bundledCache) return bundledCache;

  const file = bundledSquads as BundledSquadsFile;
  const byWikiName = new Map<string, SquadPoolPlayer[]>();
  const byNormalized = new Map<string, string>();

  for (const entry of file.teams) {
    const wikiTeamName = entry.teamName.trim();
    const displayTeam = feedLabelForWikiTeam(wikiTeamName);
    const players = entry.players
      .map((player) => ({
        playerId: wikiPlayerId(displayTeam, player.name),
        name: player.name,
        teamName: displayTeam,
        role: mapWikiRole(player.role),
        jerseyNumber: player.jerseyNumber
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    if (players.length < 11) continue;
    byWikiName.set(wikiTeamName, players);
    byNormalized.set(normalizeTeamName(wikiTeamName), wikiTeamName);
    byNormalized.set(normalizeTeamName(displayTeam), wikiTeamName);
  }

  bundledCache = { loadedAt: Date.now(), byWikiName, byNormalized };
  return bundledCache;
}

async function loadAllWc26Squads() {
  const now = Date.now();
  if (pageCache && now - pageCache.loadedAt < CACHE_MS) {
    return pageCache;
  }

  try {
    const html = await fetchWc26SquadsPage();
    const parsed = parseWikipediaWc26SquadsHtml(html);
    if (parsed.byWikiName.size >= 40) {
      pageCache = { loadedAt: now, ...parsed };
      return pageCache;
    }
  } catch (error) {
    console.error("[wc26-squads] live Wikipedia fetch failed:", error);
  }

  return loadBundledWc26Squads();
}

function resolveWikiTeamName(teamName: string, byNormalized: Map<string, string>, byWikiName: Map<string, SquadPoolPlayer[]>) {
  const trimmed = teamName.trim();
  if (!trimmed) return null;

  for (const wikiName of byWikiName.keys()) {
    if (teamsMatch(trimmed, wikiName) || teamsMatch(trimmed, feedLabelForWikiTeam(wikiName))) {
      return wikiName;
    }
  }

  const normalized = normalizeTeamName(trimmed);
  return byNormalized.get(normalized) ?? null;
}

/** Official FIFA WC 2026 squad for one nation (26 players when published). */
export async function loadWikipediaWc26TeamSquad(teamName: string): Promise<SquadPoolPlayer[]> {
  const cache = await loadAllWc26Squads();
  const wikiName = resolveWikiTeamName(teamName, cache.byNormalized, cache.byWikiName);
  if (!wikiName) return [];
  return cache.byWikiName.get(wikiName) ?? [];
}

/** All official WC 2026 squads in one fetch (48 teams × ~26 players). */
export async function loadAllWikipediaWc26Squads() {
  const cache = await loadAllWc26Squads();
  const teams = Array.from(cache.byWikiName.entries()).map(([wikiTeamName, players]) => ({
    wikiTeamName,
    teamName: feedLabelForWikiTeam(wikiTeamName),
    players
  }));

  const players = teams.flatMap((entry) => entry.players);

  const bundled = bundledSquads as BundledSquadsFile;
  const usedLive = pageCache && pageCache.byWikiName.size >= 40;

  return {
    source: usedLive ? "wikipedia/wc26-official-squads" : "content/wc26-squads-snapshot",
    sourceUrl: usedLive ? WC26_SQUADS_URL : bundled.source,
    snapshotGeneratedAt: bundled.generatedAt,
    teamCount: teams.length,
    playerCount: players.length,
    teams,
    players
  };
}

/** @internal — reset in-memory cache (tests). */
export function clearWikipediaWc26SquadsCache() {
  pageCache = null;
}
