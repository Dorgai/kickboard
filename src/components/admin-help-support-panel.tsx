"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";
import { adminFetch, type AdminAuthMode } from "@/lib/admin/fetch";

type AdminHelpListItem = {
  id: string;
  userId: string;
  channel: "ai" | "admin";
  subject: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
  userDisplayName: string | null;
  lastMessagePreview: string | null;
  messageCount: number;
};

type AdminHelpDetail = AdminHelpListItem & {
  messages: Array<{
    id: string;
    role: string;
    body: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
};

export function AdminHelpSupportPanel({ auth }: { auth: { mode: AdminAuthMode; token?: string } }) {
  const [channelFilter, setChannelFilter] = useState<"" | "ai" | "admin">("");
  const [conversations, setConversations] = useState<AdminHelpListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminHelpDetail | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "120" });
      if (channelFilter) params.set("channel", channelFilter);

      const response = await adminFetch(`/api/admin/help/conversations?${params}`, undefined, auth);
      const payload = (await response.json()) as {
        error?: string;
        conversations?: AdminHelpListItem[];
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load conversations.");
      setConversations(payload.conversations ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
    } finally {
      setLoading(false);
    }
  }, [auth, channelFilter]);

  const loadDetail = useCallback(
    async (conversationId: string) => {
      setDetailLoading(true);
      setError(null);
      try {
        const response = await adminFetch(
          `/api/admin/help/conversations/${conversationId}`,
          undefined,
          auth
        );
        const payload = (await response.json()) as {
          error?: string;
          conversation?: AdminHelpDetail;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load thread.");
        setDetail(payload.conversation ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load thread.");
      } finally {
        setDetailLoading(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  async function sendAdminReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const response = await adminFetch(
        `/api/admin/help/conversations/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: reply.trim() })
        },
        auth
      );
      const payload = (await response.json()) as {
        error?: string;
        conversation?: AdminHelpDetail;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to send reply.");
      setDetail(payload.conversation ?? null);
      setReply("");
      await loadList();
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Unable to send reply.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-help-panel data-card surface-muted">
        <p className="inline-status">Loading help conversations…</p>
      </section>
    );
  }

  return (
    <section className="admin-help-panel data-card surface-muted" aria-label="Help and support">
      <header className="admin-help-panel-header">
        <div>
          <h3 className="panel-help-row">
            Help & support
            <HelpTooltip label="Admin help inbox" size="sm">
              All MyPicks AI and admin threads are stored here for audit and follow-up.
            </HelpTooltip>
          </h3>
        </div>
        <div className="admin-help-filters feed-tab-bar">
          <button
            aria-pressed={channelFilter === ""}
            className={channelFilter === "" ? "active" : undefined}
            type="button"
            onClick={() => setChannelFilter("")}
          >
            All
          </button>
          <button
            aria-pressed={channelFilter === "ai"}
            className={channelFilter === "ai" ? "active" : undefined}
            type="button"
            onClick={() => setChannelFilter("ai")}
          >
            AI
          </button>
          <button
            aria-pressed={channelFilter === "admin"}
            className={channelFilter === "admin" ? "active" : undefined}
            type="button"
            onClick={() => setChannelFilter("admin")}
          >
            Admin
          </button>
        </div>
      </header>

      <div className="admin-help-layout">
        <ul className="admin-help-conversation-list">
          {conversations.length === 0 ? (
            <li className="inline-status">No conversations yet.</li>
          ) : (
            conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  className={`admin-help-conversation-item${
                    selectedId === conversation.id ? " selected" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <span className="admin-help-conversation-channel">{conversation.channel}</span>
                  <strong>
                    {conversation.userDisplayName ?? conversation.userEmail ?? conversation.userId}
                  </strong>
                  <span className="admin-help-conversation-preview">
                    {conversation.lastMessagePreview ?? "—"}
                  </span>
                  <time dateTime={conversation.updatedAt}>
                    {new Date(conversation.updatedAt).toLocaleString()}
                  </time>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="admin-help-detail">
          {!selectedId ? (
            <p className="inline-status">Select a conversation to read the full thread.</p>
          ) : detailLoading ? (
            <p className="inline-status">Loading thread…</p>
          ) : detail ? (
            <>
              <header className="admin-help-detail-header">
                <p>
                  <strong>{detail.userDisplayName ?? detail.userEmail}</strong> · {detail.channel} ·{" "}
                  {detail.status}
                </p>
                <p className="admin-help-detail-meta">
                  User id <code>{detail.userId}</code> · {detail.messageCount} messages
                </p>
              </header>
              <ul className="admin-help-messages">
                {detail.messages.map((message) => (
                  <li className={`admin-help-message admin-help-message--${message.role}`} key={message.id}>
                    <span className="admin-help-message-role">{message.role}</span>
                    <p>{message.body}</p>
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
              {detail.channel === "admin" ? (
                <form className="admin-help-reply" onSubmit={sendAdminReply}>
                  <label>
                    <span>Reply as admin</span>
                    <textarea
                      disabled={busy}
                      rows={3}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                    />
                  </label>
                  <button className="button primary" disabled={busy || !reply.trim()} type="submit">
                    {busy ? "Sending…" : "Send reply"}
                  </button>
                </form>
              ) : (
                <p className="inline-status">AI threads are read-only here; users continue in Help → MyPicks AI.</p>
              )}
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="inline-status">{error}</p> : null}
    </section>
  );
}
