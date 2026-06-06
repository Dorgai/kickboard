"use client";

import { useCallback, useState } from "react";
import { adminFetch, type AdminAuthMode } from "@/lib/admin/fetch";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isSuspended: boolean;
  suspendedUntil: string | null;
  isBanned: boolean;
  bannedAt: string | null;
  createdAt: string;
};

export function AdminUserManagementPanel({
  auth
}: {
  auth: { mode: AdminAuthMode; token?: string };
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [dmBody, setDmBody] = useState("");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const params = new URLSearchParams({ q: query.trim() });
      const response = await adminFetch(`/api/admin/users?${params}`, undefined, auth);
      const payload = (await response.json()) as { error?: string; users?: AdminUser[] };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to search users.");
      }

      const list = payload.users ?? [];
      setUsers(list);
      setSelected((current) => {
        if (!current) return list[0] ?? null;
        return list.find((user) => user.id === current.id) ?? list[0] ?? null;
      });
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unable to search users.");
    } finally {
      setLoading(false);
    }
  }, [auth, query]);

  async function patchUser(userId: string, action: string, suspendedUntilValue?: string | null) {
    setBusyId(userId);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch(
        "/api/admin/users",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          userId,
          action,
          suspendedUntil: suspendedUntilValue ?? null
        })
        },
        auth
      );
      const payload = (await response.json()) as { error?: string; user?: AdminUser };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update user.");
      }

      if (payload.user) {
        setUsers((list) => list.map((user) => (user.id === payload.user!.id ? payload.user! : user)));
        setSelected(payload.user);
      }

      setNotice(`User ${action} applied.`);
      await search();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Unable to update user.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendDirectMessage() {
    if (!selected) return;

    setBusyId(`dm:${selected.id}`);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch(
        "/api/admin/fan-chat/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientUserId: selected.id, body: dmBody })
        },
        auth
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send message.");
      }

      setDmBody("");
      setNotice(`Direct message sent to @${selected.username} as MyPicks.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-community-section data-card surface-muted">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Users</p>
          <h2>User management</h2>
          <p>Search accounts, suspend or ban access, and send official direct messages.</p>
        </div>
      </div>

      <form
        className="admin-user-search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="feed-control-field">
          <span>Search username, email, or display name</span>
          <input
            className="feed-control-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. fan_abc123"
          />
        </label>
        <button className="button" disabled={loading} type="submit">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? <p className="inline-error">{error}</p> : null}
      {notice ? <p className="inline-status">{notice}</p> : null}

      {users.length === 0 ? (
        <p className="inline-status">Search to find users.</p>
      ) : (
        <div className="admin-user-layout">
          <ul className="admin-user-list">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  className={`admin-user-list-item${selected?.id === user.id ? " admin-user-list-item--active" : ""}`}
                  type="button"
                  onClick={() => setSelected(user)}
                >
                  <strong>{user.displayName ?? user.username}</strong>
                  <span>@{user.username}</span>
                  <span className="admin-user-badges">
                    {user.isBanned ? <span className="admin-user-badge admin-user-badge--ban">Banned</span> : null}
                    {user.isSuspended ? (
                      <span className="admin-user-badge admin-user-badge--suspend">Suspended</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="admin-user-detail">
              <p className="community-moderation-meta">
                <strong>{selected.displayName ?? selected.username}</strong> · @{selected.username} ·{" "}
                {selected.email}
              </p>
              <p className="community-moderation-meta">
                Joined {new Date(selected.createdAt).toLocaleString()}
                {selected.suspendedUntil
                  ? ` · Suspended until ${new Date(selected.suspendedUntil).toLocaleString()}`
                  : null}
              </p>

              <div className="community-moderation-actions">
                {selected.isSuspended ? (
                  <button
                    className="button secondary"
                    disabled={busyId === selected.id}
                    type="button"
                    onClick={() => patchUser(selected.id, "unsuspend")}
                  >
                    Unsuspend
                  </button>
                ) : (
                  <button
                    className="button secondary"
                    disabled={busyId === selected.id}
                    type="button"
                    onClick={() =>
                      patchUser(
                        selected.id,
                        "suspend",
                        suspendUntil.trim() ? new Date(suspendUntil).toISOString() : null
                      )
                    }
                  >
                    Suspend
                  </button>
                )}
                {selected.isBanned ? (
                  <button
                    className="button secondary"
                    disabled={busyId === selected.id}
                    type="button"
                    onClick={() => patchUser(selected.id, "unban")}
                  >
                    Unban
                  </button>
                ) : (
                  <button
                    className="button secondary"
                    disabled={busyId === selected.id}
                    type="button"
                    onClick={() => patchUser(selected.id, "ban")}
                  >
                    Ban
                  </button>
                )}
              </div>

              {!selected.isSuspended ? (
                <label className="feed-control-field">
                  <span>Suspend until (optional)</span>
                  <input
                    className="feed-control-input"
                    type="datetime-local"
                    value={suspendUntil}
                    onChange={(event) => setSuspendUntil(event.target.value)}
                  />
                </label>
              ) : null}

              <label className="feed-control-field">
                <span>Direct message as MyPicks</span>
                <textarea
                  className="feed-control-input admin-user-dm-input"
                  rows={3}
                  value={dmBody}
                  onChange={(event) => setDmBody(event.target.value)}
                  placeholder="Account notice or support message…"
                />
              </label>
              <button
                className="button"
                disabled={!dmBody.trim() || busyId === `dm:${selected.id}`}
                type="button"
                onClick={() => void sendDirectMessage()}
              >
                Send direct message
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
