import {
  getCurrentWorldCupFeedCached,
  parseWorldCupFixtureDate
} from "@/lib/feeds/current-world-cup";
import {
  hasDigestBeenSent,
  listUsersWithPushSubscriptions,
  markDigestSent,
  userPushNotificationsEnabled
} from "@/lib/push/store";
import { sendWebPushToUser } from "@/lib/push/send";

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isSameUtcDay(a: Date, b: Date) {
  return utcDateKey(a) === utcDateKey(b);
}

export type TodayMatchLine = {
  label: string;
  fixtureKey: string;
};

export async function listMatchesOnUtcDay(day: Date): Promise<TodayMatchLine[]> {
  const feed = await getCurrentWorldCupFeedCached();
  const lines: TodayMatchLine[] = [];

  for (const group of feed.groups) {
    for (const fixture of group.fixtures) {
      const kickoff = parseWorldCupFixtureDate(fixture.date);
      if (!kickoff || !isSameUtcDay(kickoff, day)) continue;
      const label = `${fixture.homeTeam} vs ${fixture.awayTeam}`;
      const fixtureKey = `${fixture.homeTeam}:${fixture.awayTeam}:${fixture.date}`;
      lines.push({ label, fixtureKey });
    }
  }

  return lines;
}

export async function runDailyMatchDigestForUtcDay(day = new Date()) {
  const digestDate = utcDateKey(day);
  const matches = await listMatchesOnUtcDay(day);
  if (!matches.length) {
    return { digestDate, matches: 0, usersNotified: 0, pushesSent: 0 };
  }

  const digestKey = `matches:${digestDate}`;
  const title = "Today's World Cup matches";
  const body =
    matches.length === 1
      ? matches[0].label
      : `${matches.length} matches today — ${matches
          .slice(0, 3)
          .map((m) => m.label)
          .join(" · ")}${matches.length > 3 ? "…" : ""}`;

  const userIds = await listUsersWithPushSubscriptions();
  let usersNotified = 0;
  let pushesSent = 0;

  for (const userId of userIds) {
    if (!(await userPushNotificationsEnabled(userId))) continue;
    if (await hasDigestBeenSent(userId, digestDate, digestKey)) continue;

    const sent = await sendWebPushToUser(userId, {
      title,
      body,
      url: "/#predictions",
      tag: digestKey
    });

    if (sent > 0) {
      await markDigestSent(userId, digestDate, digestKey);
      usersNotified += 1;
      pushesSent += sent;
    }
  }

  return {
    digestDate,
    matches: matches.length,
    usersNotified,
    pushesSent
  };
}
