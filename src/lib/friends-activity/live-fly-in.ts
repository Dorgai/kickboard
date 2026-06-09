export const FRIEND_LIVE_ACTIVITY_VISIBLE_MS = 10_000;
export const FRIEND_LIVE_ACTIVITY_EXIT_MS = 820;
export const FRIEND_LIVE_ACTIVITY_POLL_MS = 10_000;

export type LiveConnectionActivityItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  fixtureKey: string | null;
  occurredAt: string;
};
