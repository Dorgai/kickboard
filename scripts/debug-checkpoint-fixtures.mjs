#!/usr/bin/env node
import { getCurrentWorldCupFeedCached, parseWorldCupFixtureDate } from "../src/lib/feeds/current-world-cup.ts";

const feed = await getCurrentWorldCupFeedCached();
const now = Date.now();
const window14 = 14 * 24 * 60 * 60 * 1000;
let total = 0,
  noDate = 0,
  in14 = 0,
  past = 0,
  future14 = 0;

for (const g of feed.groups) {
  for (const f of g.fixtures) {
    total++;
    const k = parseWorldCupFixtureDate(f.date);
    if (!k) {
      noDate++;
      continue;
    }
    const ms = k.getTime();
    if (ms < now - 90 * 60 * 1000) past++;
    else if (ms > now + window14) future14++;
    else in14++;
  }
}

const samples = [];
for (const g of feed.groups) {
  for (const f of g.fixtures.slice(0, 2)) {
    samples.push({ group: g.group, date: f.date, parsed: parseWorldCupFixtureDate(f.date)?.toISOString() ?? null });
  }
}

console.log({
  now: new Date().toISOString(),
  groups: feed.groups.length,
  total,
  noDate,
  in14,
  past,
  future14,
  samples: samples.slice(0, 6)
});
