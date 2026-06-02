"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, type AdminAuthMode } from "@/lib/admin/fetch";

type UserActivityRow = {
  userId: string;
  email: string;
  username: string;
  displayName: string | null;
  online: boolean;
  lastSeenAt: string | null;
  sessionStartedAt: string | null;
  sessionDurationMinutes: number | null;
  lastPagePath: string | null;
  eventCount: number;
  lastEventAt: string | null;
};

type ActivityEventRow = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  email: string;
  eventType: string;
  summary: string;
  createdAt: string;
};

type PresenceSessionRow = {
  id: string;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  durationMinutes: number;
  lastPagePath: string | null;
  online: boolean;
};

export function AdminUserActivityPanel({
  auth
}: {
  auth: { mode: AdminAuthMode; token?: string };
}) {
  const [query, setQuery] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [users, setUsers] = useState<UserActivityRow[]>([]);
  const [events, setEvents] = useState<ActivityEventRow[]>([]);
  const [sessions, setSessions] = useState<PresenceSessionRow[]>([]);
  const [selected, setSelected] = useState<UserActivityRow | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const userParams = new URLSearchParams({ scope: "users", limit: "50" });
      if (query.trim()) userParams.set("q", query.trim());
      if (onlineOnly) userParams.set("onlineOnly", "1");
      if (from) userParams.set("from", new Date(from).toISOString());
      if (to) userParams.set("to", new Date(to).toISOString());

      const [usersRes, summaryRes] = await Promise.all([
        adminFetch(`/api/admin/activity?${userParams}`, undefined, auth),
        adminFetch("/api/admin/activity?scope=summary", undefined, auth)
      ]);

      const usersPayload = (await usersRes.json()) as { error?: string; users?: UserActivityRow[] };
      const summaryPayload = (await summaryRes.json()) as { onlineCount?: number };

      if (!usersRes.ok) throw new Error(usersPayload.error ?? "Unable to load users.");

      setUsers(usersPayload.users ?? []);
      setOnlineCount(summaryPayload.onlineCount ?? 0);
      setSelected((current) => {
        if (!current) return usersPayload.users?.[0] ?? null;
        return usersPayload.users?.find((row) => row.userId === current.userId) ?? usersPayload.users?.[0] ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load activity.");
    } finally {
      setLoading(false);
    }
  }, [auth, from, onlineOnly, query, to]);

  const loadUserDetail = useCallback(
    async (userId: string) => {
      const eventParams = new URLSearchParams({ scope: "events", userId, limit: "60" });
      if (from) eventParams.set("from", new Date(from).toISOString());
      if (to) eventParams.set("to", new Date(to).toISOString());

      const [eventsRes, sessionsRes] = await Promise.all([
        adminFetch(`/api/admin/activity?${eventParams}`, undefined, auth),
        adminFetch(`/api/admin/activity?scope=sessions&userId=${encodeURIComponent(userId)}`, undefined, auth)
      ]);

      const eventsPayload = (await eventsRes.json()) as { events?: ActivityEventRow[] };
      const sessionsPayload = (await sessionsRes.json()) as { sessions?: PresenceSessionRow[] };

      setEvents(eventsPayload.events ?? []);
      setSessions(sessionsPayload.sessions ?? []);
    },
    [auth, from, to]
  );

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setEvents([]);
      setSessions([]);
      return;
    }
    void loadUserDetail(selected.userId);
  }, [loadUserDetail, selected]);

  if (loading) {
    return (
      <section className="admin-community-section data-card surface-muted">
        <p className="inline-status">Loading user activity…</p>
      </section>
    );
  }

  return (
    <section className="admin-community-section data-card surface-muted">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Users</p>
          <h2>User activity</h2>
          <p>
            Searchable presence and actions. <strong>{onlineCount}</strong> user
            {onlineCount === 1 ? "" : "s"} online now (seen in the last 3 minutes).
          </p>
        </div>
        <button className="button secondary" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <form
        className="admin-activity-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          void load();
        }}
      >
        <label className="feed-control-field">
          <span>Search</span>
          <input
            className="feed-control-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Username or email"
          />
        </label>
        <label className="feed-control-field">
          <span>From</span>
          <input
            className="feed-control-input"
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="feed-control-field">
          <span>To</span>
          <input
            className="feed-control-input"
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="admin-activity-online-only">
          <input checked={onlineOnly} type="checkbox" onChange={(event) => setOnlineOnly(event.target.checked)} />
          Online only
        </label>
        <button className="button" type="submit">
          Search
        </button>
      </form>

      {error ? <p className="inline-error">{error}</p> : null}

      <div className="admin-user-layout">
        <ul className="admin-user-list">
          {users.length === 0 ? (
            <li className="inline-status">No users match.</li>
          ) : (
            users.map((user) => (
              <li key={user.userId}>
                <button
                  className={`admin-user-list-item${selected?.userId === user.userId ? " admin-user-list-item--active" : ""}`}
                  type="button"
                  onClick={() => setSelected(user)}
                >
                  <strong>
                    {user.online ? "● " : ""}
                    {user.displayName ?? user.username}
                  </strong>
                  <span>@{user.username}</span>
                  <span className="admin-user-badges">
                    {user.online ? (
                      <span className="admin-user-badge admin-user-badge--online">Online</span>
                    ) : null}
                    <span className="admin-activity-meta-inline">
                      {user.lastSeenAt
                        ? `Last seen ${new Date(user.lastSeenAt).toLocaleString()}`
                        : "No presence yet"}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        {selected ? (
          <div className="admin-user-detail admin-activity-detail">
            <p className="community-moderation-meta">
              <strong>{selected.displayName ?? selected.username}</strong> · {selected.email}
            </p>
            <p className="community-moderation-meta">
              {selected.online ? (
                <>
                  Online · session ~{selected.sessionDurationMinutes ?? 0} min
                  {selected.lastPagePath ? ` · ${selected.lastPagePath}` : ""}
                </>
              ) : (
                <>
                  Offline
                  {selected.lastSeenAt
                    ? ` · last seen ${new Date(selected.lastSeenAt).toLocaleString()}`
                    : ""}
                </>
              )}
              {" · "}
              {selected.eventCount} events in range
            </p>

            <h3 className="admin-activity-subheading">Sessions</h3>
            {sessions.length === 0 ? (
              <p className="inline-status">No sessions recorded.</p>
            ) : (
              <ul className="admin-activity-session-list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <span>
                      {new Date(session.startedAt).toLocaleString()} →{" "}
                      {session.endedAt
                        ? new Date(session.endedAt).toLocaleString()
                        : session.online
                          ? "active"
                          : new Date(session.lastSeenAt).toLocaleString()}
                    </span>
                    <span>
                      {session.durationMinutes} min
                      {session.lastPagePath ? ` · ${session.lastPagePath}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="admin-activity-subheading">Recent actions</h3>
            {events.length === 0 ? (
              <p className="inline-status">No events in this range.</p>
            ) : (
              <ul className="community-moderation-list admin-activity-event-list">
                {events.map((event) => (
                  <li className="community-moderation-item" key={event.id}>
                    <div>
                      <p className="community-moderation-meta">
                        <span className="admin-activity-event-type">{event.eventType}</span> ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                      <p className="community-post-body">{event.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
