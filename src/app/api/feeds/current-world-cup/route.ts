import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const SOURCE_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup";
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

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

export async function GET() {
  try {
    const response = await fetch(`${SOURCE_URL}?action=render`, {
      headers: {
        "User-Agent": "KickboardFeedBot/1.0 (public data reader)"
      },
      next: {
        revalidate: 3600
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          error: `Current World Cup source returned ${response.status}`
        },
        { status: 502 }
      );
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
            "User-Agent": "KickboardFeedBot/1.0 (public data reader)"
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
        const fixtures: Array<{ homeTeam: string; awayTeam: string; date: string | null }> = [];

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

          fixtures.push({
            homeTeam,
            awayTeam,
            date: date ? `${date}${time ? ` ${time}` : ""}` : null
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

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown current World Cup feed error"
      },
      { status: 502 }
    );
  }
}
