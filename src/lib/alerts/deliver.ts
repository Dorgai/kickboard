import { upsertUserAlert } from "@/lib/alerts/store";
import type { UserAlertCategory } from "@/lib/alerts/types";
import { listAcceptedPeerIds } from "@/lib/connections/store";
import { query } from "@/lib/db";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import { notifyUserPush } from "@/lib/push/send";

export type AlertPushMode = boolean | "ifNew";

async function actorDisplayLabel(userId: string) {
  const result = await query<{ username: string; display_name: string | null }>(
    `SELECT username, display_name FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return "A connection";
  return row.display_name?.trim() || row.username;
}

function shouldSendPush(mode: AlertPushMode | undefined, isNew: boolean) {
  if (mode === true) return true;
  if (mode === "ifNew") return isNew;
  return false;
}

/** Upsert an in-app alert and optionally send a matching Web Push notification. */
export async function deliverUserAlert(input: {
  userId: string;
  alertKey: string;
  category: UserAlertCategory;
  title: string;
  body: string;
  href: string;
  occurredAt: Date;
  actorUserId?: string | null;
  fixtureKey?: string | null;
  push?: AlertPushMode;
}) {
  const isNew = await upsertUserAlert(input);

  if (shouldSendPush(input.push, isNew)) {
    notifyUserPush(input.userId, {
      title: input.title,
      body: input.body,
      url: input.href,
      tag: input.alertKey.slice(0, 64)
    });
  }

  return { isNew };
}

/** Notify every accepted connection of activity from `actorUserId`. */
export async function deliverConnectionActivityToPeers(input: {
  actorUserId: string;
  alertKey: string;
  title: string;
  body: string;
  href: string;
  fixtureKey?: string | null;
  occurredAt?: Date;
  push?: AlertPushMode;
}) {
  const peerIds = await listAcceptedPeerIds(input.actorUserId);
  if (!peerIds.length) return;

  const occurredAt = input.occurredAt ?? new Date();
  const push = input.push ?? true;

  await Promise.all(
    peerIds.map((peerId) =>
      deliverUserAlert({
        userId: peerId,
        alertKey: input.alertKey,
        category: "connection_activity",
        title: input.title,
        body: input.body,
        href: input.href,
        actorUserId: input.actorUserId,
        fixtureKey: input.fixtureKey,
        occurredAt,
        push
      })
    )
  );
}

export async function deliverCoachBoardPostToPeers(input: {
  authorId: string;
  postId: string;
  body: string;
}) {
  const name = await actorDisplayLabel(input.authorId);
  const snippet = input.body.slice(0, 120);
  await deliverConnectionActivityToPeers({
    actorUserId: input.authorId,
    alertKey: `connection:post:${input.postId}`,
    title: `${name} posted on Coach Board`,
    body: snippet,
    href: "/#community"
  });
}

export async function deliverSquadPublishedToPeers(input: {
  userId: string;
  squadId: string;
  squadName: string;
  fixtureKey: string | null;
}) {
  const name = await actorDisplayLabel(input.userId);
  const match = input.fixtureKey ? fixtureKeyToShortLabel(input.fixtureKey) : "Coach Board";
  await deliverConnectionActivityToPeers({
    actorUserId: input.userId,
    alertKey: `connection:squad:${input.squadId}`,
    title: `${name} published a board`,
    body: `${input.squadName} — ${match}`,
    href: "/#coach-board",
    fixtureKey: input.fixtureKey
  });
}
