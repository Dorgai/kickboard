#!/usr/bin/env node
/**
 * Cross-check official WC 2026 squads against Wikipedia (FIFA-published lists).
 * Run: node scripts/verify-wc26-squads.mjs
 */

const URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads?action=render";

/** Spot-check players confirmed in FIFA lists (June 2026). */
const SPOT_CHECKS = [
  { team: "Mexico", players: ["Raúl Jiménez", "Santiago Giménez", "Guillermo Ochoa"] },
  { team: "Brazil", players: ["Neymar", "Vinícius Júnior", "Alisson"] },
  { team: "United States", players: ["Christian Pulisic", "Tyler Adams"] },
  { team: "Germany", players: ["Jamal Musiala", "Manuel Neuer"] },
  { team: "France", players: ["Kylian Mbappé", "Ousmane Dembélé", "N'Golo Kanté"] }
];

function normalize(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ");
}

async function main() {
  const cheerio = await import("cheerio");
  const response = await fetch(URL, {
    headers: { "User-Agent": "MyPicksVerify/1.0 (https://mypicks.live)" }
  });
  if (!response.ok) {
    console.error("Fetch failed:", response.status);
    process.exit(1);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const squads = new Map();
  let current = null;

  $("h3, table.wikitable").each((_, el) => {
    if (el.tagName === "h3") {
      current = $(el).text().replace(/\[edit\]/gi, "").trim();
      return;
    }
    if (!current || el.tagName !== "table") return;
    const names = [];
    $(el)
      .find("tr.nat-fs-player")
      .each((_, row) => {
        const cells = $(row).find("td, th");
        const name =
          $(cells[2]).find("a").first().text().trim() || $(cells[2]).text().trim();
        if (name) names.push(name.replace(/\[[^\]]+\]/g, "").trim());
      });
    if (names.length >= 11) squads.set(current, names);
    current = null;
  });

  console.log(`Parsed ${squads.size} team squads from Wikipedia FIFA lists.`);

  if (squads.size < 48) {
    console.error(`Expected 48 teams, got ${squads.size}`);
    process.exit(1);
  }

  let failed = 0;
  for (const check of SPOT_CHECKS) {
    const roster = squads.get(check.team);
    if (!roster) {
      console.error(`Missing team: ${check.team}`);
      failed += 1;
      continue;
    }
    const normalizedRoster = roster.map(normalize);
    for (const player of check.players) {
      const hit = normalizedRoster.some(
        (name) => name.includes(normalize(player)) || normalize(player).includes(name)
      );
      if (!hit) {
        console.error(`  ${check.team}: missing ${player}`);
        failed += 1;
      } else {
        console.log(`  ✓ ${check.team}: ${player}`);
      }
    }
    console.log(`  ${check.team}: ${roster.length} players`);
  }

  if (failed > 0) {
    console.error(`\n${failed} spot-check(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll spot-checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
