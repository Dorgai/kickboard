export type UserAlertCategory = "connection_activity" | "match_upcoming" | "match_result";

export type UserAlert = {
  id: string;
  alertKey: string;
  category: UserAlertCategory;
  title: string;
  body: string;
  href: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  fixtureKey: string | null;
  occurredAt: string;
  readAt: string | null;
};

export type AlertsPayload = {
  alerts: UserAlert[];
  unreadCount: number;
  syncedAt: string;
};
