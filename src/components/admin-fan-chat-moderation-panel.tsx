"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, type AdminAuthMode } from "@/lib/admin/fetch";

type AdminFanChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  senderUsername: string;
  senderDisplayName: string | null;
  recipientUsername: string;
  recipientDisplayName: string | null;
  broadcastId: string | null;
};

export function AdminFanChatModerationPanel({
  auth,
  filterUserId
}: {
  auth: { mode: AdminAuthMode; token?: string };
  filterUserId?: string | null;
}) {
  const [messages, setMessages] = useState<AdminFanChatMessage[]>([]);
  const [userIdFilter, setUserIdFilter] = useState(filterUserId ?? "");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "80" });
      const trimmed = userIdFilter.trim();
      if (trimmed) params.set("userId", trimmed);

      const response = await adminFetch(`/api/admin/fan-chat/messages?${params}`, undefined, auth);
      const payload = (await response.json()) as { error?: string; messages?: AdminFanChatMessage[] };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load messages.");
      }

      setMessages(payload.messages ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [auth, userIdFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (filterUserId) setUserIdFilter(filterUserId);
  }, [filterUserId]);

  async function removeMessage(messageId: string) {
    setBusyId(messageId);
    setError(null);

    try {
      const response = await adminFetch(
        "/api/admin/fan-chat/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", messageId })
        },
        auth
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove message.");
      }

      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove message.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="inline-status">Loading Fan Chat messages…</p>;
  }

  return (
    <section className="admin-community-section">
      <div className="section-heading compact">
        <div>
          <h2>Fan Chat moderation</h2>
          <p>Review recent direct messages and broadcasts. Remove messages that break community rules.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <label className="feed-control-field">
        <span>Filter by user id (optional)</span>
        <input
          className="feed-control-input"
          value={userIdFilter}
          onChange={(event) => setUserIdFilter(event.target.value)}
          placeholder="UUID"
        />
      </label>

      {error ? <p className="inline-error">{error}</p> : null}

      {messages.length === 0 ? (
        <p className="inline-status">No Fan Chat messages found.</p>
      ) : (
        <ul className="community-moderation-list">
          {messages.map((message) => (
            <li className="community-moderation-item" key={message.id}>
              <div>
                <p className="community-moderation-meta">
                  <strong>
                    {message.senderDisplayName ?? message.senderUsername} →{" "}
                    {message.recipientDisplayName ?? message.recipientUsername}
                  </strong>{" "}
                  · {new Date(message.createdAt).toLocaleString()}
                  {message.broadcastId ? " · broadcast" : null}
                </p>
                <p className="community-post-body">{message.body}</p>
              </div>
              <div className="community-moderation-actions">
                <button
                  className="button secondary"
                  disabled={busyId === message.id}
                  type="button"
                  onClick={() => void removeMessage(message.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
