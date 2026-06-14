import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { MatchBoardGoal } from "@/lib/fixtures/fixture-key";

export type MatchBoardRedCard = {
  playerName: string;
  teamSide: "home" | "away";
  minute: number | null;
  extra: number | null;
};

function parseMinuteLabel(raw: string): { minute: number | null; extra: number | null } {
  const text = raw.replace(/\u00a0/g, " ").trim();
  const match = text.match(/(\d+)(?:\+(\d+))?/);
  if (!match) return { minute: null, extra: null };
  return {
    minute: Number(match[1]),
    extra: match[2] ? Number(match[2]) : null
  };
}

function playerNameFromCell($: CheerioAPI, cell: Cheerio<Element>) {
  const link = cell.find("a").first();
  const name = link.text().trim() || cell.text().trim();
  return name.replace(/\s*\(c\)\s*$/i, "").trim();
}

function parseGoalCell($: CheerioAPI, cell: Cheerio<Element>, teamSide: "home" | "away"): MatchBoardGoal[] {
  const goals: MatchBoardGoal[] = [];
  cell.find("li").each((_, li) => {
    const row = $(li);
    if (!row.find(".fb-goal").length) return;
    const playerName = playerNameFromCell($, row);
    if (!playerName) return;
    const minuteText = row.find(".fb-goal span").last().text();
    const { minute, extra } = parseMinuteLabel(minuteText);
    goals.push({ playerName, teamSide, minute, extra });
  });

  if (!goals.length && cell.find(".fb-goal").length) {
    const playerName = playerNameFromCell($, cell);
    const minuteText = cell.find(".fb-goal span").last().text();
    const { minute, extra } = parseMinuteLabel(minuteText);
    if (playerName) goals.push({ playerName, teamSide, minute, extra });
  }

  return goals;
}

function parseRedCards($: CheerioAPI, box: Cheerio<Element>): MatchBoardRedCard[] {
  const cards: MatchBoardRedCard[] = [];

  box.find(`${".fhgoal"} li, ${".fagoal"} li`).each((_, li) => {
    const row = $(li);
    if (!row.find('img[alt="Red card"]').length) return;
    const teamSide = row.closest(".fhgoal").length ? "home" : "away";
    const playerName = playerNameFromCell($, row);
    if (!playerName) return;
    const { minute, extra } = parseMinuteLabel(row.text());
    cards.push({ playerName, teamSide, minute, extra });
  });

  const lineupTables = box
    .find("table")
    .filter((_, table) => $(table).find('img[alt="Red card"]').length > 0)
    .toArray();

  if (!lineupTables.length) {
    box
      .find("table")
      .filter((_, table) => {
        const headers = $(table)
          .find("tr")
          .first()
          .find("th")
          .map((__, th) => $(th).text().trim().toLowerCase())
          .get();
        return headers.includes("no.") || headers.includes("pos");
      })
      .toArray()
      .forEach((table, index) => {
        appendLineupRedCards($(table), index === 0 ? "home" : "away");
      });
  } else {
    lineupTables.forEach((table, index) => {
      appendLineupRedCards($(table), index === 0 ? "home" : "away");
    });
  }

  function appendLineupRedCards(table: Cheerio<Element>, teamSide: "home" | "away") {
    table.find("tr").each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 3) return;
      const playerCell = cells.eq(cells.length >= 4 ? 2 : 1);
      const eventCell = cells.eq(cells.length >= 4 ? 3 : 2);
      if (!eventCell.find('img[alt="Red card"]').length) return;
      const playerName = playerNameFromCell($, playerCell);
      if (!playerName) return;
      const { minute, extra } = parseMinuteLabel(eventCell.text());
      if (cards.some((card) => card.playerName === playerName && card.minute === minute)) return;
      cards.push({ playerName, teamSide, minute, extra });
    });
  }

  return cards;
}

export function parseWikipediaFootballBoxEvents($: CheerioAPI, matchSection: Cheerio<Element>) {
  const footballBox = matchSection.filter(".footballbox").first();
  const goalScorers = [
    ...parseGoalCell($, footballBox.find(".fhgoal").first(), "home"),
    ...parseGoalCell($, footballBox.find(".fagoal").first(), "away")
  ];
  const redCards = parseRedCards($, matchSection);

  return { goalScorers, redCards };
}
