import * as cheerio from "cheerio";

export { parseWorldCupFixtureDate } from "@/lib/fixtures/fixture-date";

const SOURCE_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup";
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const CACHE_MS = 60 * 60 * 1000;

export type WorldCupGroupFixture = {
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  /** Parsed from Wikipedia footballbox when the match has been played. */
  homeGoals?: number | null;
  awayGoals?: number | null;
};

export type WorldCupGroupFeed = {
  group: string;
  source: string;
  teams: string[];
  fixtures: WorldCupGroupFixture[];
};

export type CurrentWorldCupFeed = {
  connected: true;
  source: string;
  title: string;
  summary: {
    hostCountries: string | null;
    dates: string | null;
    teams: string | null;
    venueCount: string | null;
  };
  qualifiedTeams: string[];
  groups: WorldCupGroupFeed[];
  note: string;
};

let feedCache: { loadedAt: number; feed: CurrentWorldCupFeed | null } = {
  loadedAt: 0,
  feed: null
};

function normaliseCell(value: string) {
  return value.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
}

/** Wikipedia infobox sometimes concatenates host names without separators. */
function formatHostCountries(raw: string | null | undefined) {
  if (!raw) return null;
  const cleaned = normaliseCell(raw);
  if (!cleaned) return null;
  if (/[,;]/.test(cleaned) || cleaned.includes(" and ")) {
    return cleaned;
  }
  const knownHosts = ["United States", "Mexico", "Canada"];
  let formatted = cleaned;
  for (const host of knownHosts) {
    formatted = formatted.replace(host, `|${host}|`);
  }
  const parts = formatted
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return parts.join(" · ");
  }
  return cleaned.replace(/([a-z])([A-Z])/g, "$1 · $2");
}

export async function fetchCurrentWorldCupFeed(): Promise<CurrentWorldCupFeed> {
  const response = await fetch(`${SOURCE_URL}?action=render`, {
    headers: {
      "User-Agent": "MyPicksFeedBot/1.0 (https://mypicks.live)"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    throw new Error(`Current World Cup source returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const infoboxRows: Record<string, string> = {};

  $("table.infobox tr").each((_, row) => {
    const label = normaliseCell($(row).find("th").first().text());
    const value = normaliseCell($(row).find("td").first().text());
    if (label && value) {
      infoboxRows[label] = value;
    }
  });

  const qualifiedTeams = new Set<string>();

  const groups = await Promise.all(
    GROUP_LETTERS.map(async (letter) => {
      const groupUrl = `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_${letter}`;
      const groupResponse = await fetch(`${groupUrl}?action=render`, {
        headers: {
          "User-Agent": "MyPicksFeedBot/1.0 (https://mypicks.live)"
        },
        next: {
          revalidate: 3600
        }
      });

      if (!groupResponse.ok) {
        return {
          group: letter,
          source: groupUrl,
          teams: [],
          fixtures: []
        };
      }

      const groupHtml = await groupResponse.text();
      const groupPage = cheerio.load(groupHtml);
      const teams: string[] = [];
      const fixtures: WorldCupGroupFixture[] = [];

      groupPage("table.wikitable").each((_, table) => {
        const headers = groupPage(table)
          .find("tr")
          .first()
          .find("th")
          .map((__, th) => normaliseCell(groupPage(th).text()).toLowerCase())
          .get();

        if (!headers.includes("team") || !headers.includes("draw position")) return;

        groupPage(table)
          .find("tr")
          .slice(1)
          .each((__, row) => {
            const cells = groupPage(row)
              .find("th,td")
              .map((___, cell) => normaliseCell(groupPage(cell).text()))
              .get();
            if (!/^[A-L][1-4]$/.test(cells[0] ?? "")) return;
            const team = cells[1];
            if (team && !teams.includes(team)) {
              teams.push(team);
            }
          });
      });

      groupPage("h3").each((_, heading) => {
        const title = normaliseCell(groupPage(heading).text());
        if (!title.includes(" vs ")) return;

        const [homeTeam, awayTeam] = title.split(" vs ").map((value) => value.trim());
        const footballBox = groupPage(heading).parent().nextUntil(".mw-heading3").filter(".footballbox").first();
        const date = normaliseCell(footballBox.find(".fdate").first().text());
        const time = normaliseCell(footballBox.find(".ftime").first().text());
        const scoreText = normaliseCell(footballBox.find(".fscore").first().text());
        const scoreMatch = scoreText.match(/^(\d+)\s*[–-]\s*(\d+)$/);

        fixtures.push({
          homeTeam,
          awayTeam,
          date: date ? `${date}${time ? ` ${time}` : ""}` : null,
          homeGoals: scoreMatch ? Number(scoreMatch[1]) : null,
          awayGoals: scoreMatch ? Number(scoreMatch[2]) : null
        });
      });

      teams.forEach((team) => qualifiedTeams.add(team));

      return {
        group: letter,
        source: groupUrl,
        teams,
        fixtures
      };
    })
  );

  return {
    connected: true,
    source: SOURCE_URL,
    title: "2026 FIFA World Cup",
    summary: {
      hostCountries: formatHostCountries(
        infoboxRows["Host countries"] ?? infoboxRows["Host country"] ?? null
      ),
      dates: infoboxRows["Dates"] ?? null,
      teams: infoboxRows["Teams"] ?? null,
      venueCount: infoboxRows["Venue(s)"] ?? null
    },
    qualifiedTeams: Array.from(qualifiedTeams).sort(),
    groups,
    note:
      "This endpoint reads public current-tournament information. Final player squads depend on official squad releases and provider feeds."
  };
}

/** Cached WC26 schedule (1h) for alerts and other server features. */
export async function getCurrentWorldCupFeedCached() {
  const now = Date.now();
  if (feedCache.feed && now - feedCache.loadedAt < CACHE_MS) {
    return feedCache.feed;
  }

  const feed = await fetchCurrentWorldCupFeed();
  feedCache = { loadedAt: now, feed };
  return feed;
}
