import * as cheerio from "cheerio";
import type { SquadPlayerRole } from "@/lib/squads/player-roles";
import type { SquadPoolPlayer } from "@/lib/squads/player-pool";
import { normalizeTeamName, teamsMatch } from "@/lib/squads/team-names";

/** Avoid colliding with StatsBomb / API-Football player ids in saved lineups. */
export const WIKIPEDIA_SQUAD_PLAYER_ID_BASE = 2_300_000_000;

const WIKI_USER_AGENT = "MyPicksFeedBot/1.0 (https://mypicks.live; public squad reader)";
const CACHE_MS = 60 * 60 * 1000;

const WIKI_TITLE_OVERRIDES: Record<string, string> = {
  "united states": "United_States_men's_national_soccer_team",
  "usa": "United_States_men's_national_soccer_team",
  "south korea": "South_Korea_national_football_team",
  "korea republic": "South_Korea_national_football_team",
  "republic of ireland": "Republic_of_Ireland_national_football_team",
  "ireland": "Republic_of_Ireland_national_football_team",
  "cote d ivoire": "Ivory_Coast_national_football_team",
  "ivory coast": "Ivory_Coast_national_football_team",
  "curacao": "Curaçao_national_football_team",
  "czech republic": "Czech_Republic_national_football_team",
  "czechia": "Czech_Republic_national_football_team",
  "dr congo": "DR_Congo_national_football_team",
  "congo dr": "DR_Congo_national_football_team",
  "democratic republic of the congo": "DR_Congo_national_football_team",
  "cape verde": "Cape_Verde_national_football_team",
  "cabo verde": "Cape_Verde_national_football_team",
  "north korea": "North_Korea_national_football_team",
  "korea dpr": "North_Korea_national_football_team"
};

const squadCache = new Map<string, { loadedAt: number; players: SquadPoolPlayer[] }>();

function wikiPlayerId(teamName: string, playerName: string) {
  const key = `${normalizeTeamName(teamName)}:${normalizeTeamName(playerName)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) >>> 0;
  }
  return WIKIPEDIA_SQUAD_PLAYER_ID_BASE + (hash % 99_999_999);
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

export function wikiTitlesForNationalTeam(teamName: string) {
  const normalized = normalizeTeamName(teamName);
  const titles: string[] = [];

  const override = WIKI_TITLE_OVERRIDES[normalized];
  if (override) titles.push(override);

  const slug = teamName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");

  if (slug) {
    titles.push(`${slug}_at_the_2026_FIFA_World_Cup`);
    titles.push(`${slug}_national_football_team`);
    titles.push(`${slug}_national_soccer_team`);
  }

  return [...new Set(titles)];
}

function parseSquadTable(html: string, displayTeamName: string): SquadPoolPlayer[] {
  const $ = cheerio.load(html);
  const heading = $("#Current_squad").first();
  if (!heading.length) return [];

  const table = heading.parent().nextAll("table.wikitable").first();
  if (!table.length) return [];

  const players: SquadPoolPlayer[] = [];
  const seen = new Set<number>();

  table.find("tr.nat-fs-player").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length < 3) return;

    const numberCell = $(cells[0]).text().trim();
    const positionCell = $(cells[1]).text().trim();
    const nameCell = $(cells[2]).find("a").first().text().trim() || $(cells[2]).text().trim();
    const name = nameCell.replace(/\[[^\]]+\]/g, "").trim();
    if (!name || name.length < 2) return;

    const playerId = wikiPlayerId(displayTeamName, name);
    if (seen.has(playerId)) return;
    seen.add(playerId);

    players.push({
      playerId,
      name,
      teamName: displayTeamName,
      role: mapWikiRole(positionCell),
      jerseyNumber: parseJerseyNumber(numberCell)
    });
  });

  return players.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

async function fetchWikiRender(title: string) {
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}?action=render`;
  const response = await fetch(url, {
    headers: { "User-Agent": WIKI_USER_AGENT },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) return null;
  return response.text();
}

/**
 * Load a national-team squad from Wikipedia "Current squad" tables (2026 WC call-ups when published).
 */
export async function loadWikipediaNationalTeamSquad(teamName: string): Promise<SquadPoolPlayer[]> {
  const displayTeam = teamName.trim();
  if (!displayTeam) return [];

  const cacheKey = normalizeTeamName(displayTeam);
  const cached = squadCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) {
    return cached.players;
  }

  for (const title of wikiTitlesForNationalTeam(displayTeam)) {
    try {
      const html = await fetchWikiRender(title);
      if (!html) continue;
      const players = parseSquadTable(html, displayTeam);
      if (players.length >= 11) {
        squadCache.set(cacheKey, { loadedAt: Date.now(), players });
        return players;
      }
    } catch {
      /* try next title */
    }
  }

  squadCache.set(cacheKey, { loadedAt: Date.now(), players: [] });
  return [];
}

/** @internal — test hook */
export function parseWikipediaSquadHtml(html: string, teamName: string) {
  return parseSquadTable(html, teamName);
}
