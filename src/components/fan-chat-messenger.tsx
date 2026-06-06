"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { handleKickboardCommunityNav } from "@/lib/navigation/location-hash";
import { HelpTooltip } from "@/components/help-tooltip";
import { FanChatMessageStatus } from "@/components/fan-chat-message-status";
import type { FanChatBroadcastSummary, FanChatInboxThread, FanChatMessage } from "@/lib/fan-chat/store";
import { CONNECTIONS_CHANGED_EVENT } from "@/lib/social/events";

function peerLabel(thread: Pick<FanChatInboxThread, "peerDisplayName" | "peerUsername">) {
  return thread.peerDisplayName?.trim() || thread.peerUsername;
}

function previewText(body: string | null) {
  if (!body) return "No messages yet";
  return body.length > 56 ? `${body.slice(0, 53)}…` : body;
}

export function FanChatMessenger() {
  const [threads, setThreads] = useState<FanChatInboxThread[]>([]);
  const [activePeerId, setActivePeerId] = useState<string>("");
  const [messages, setMessages] = useState<FanChatMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<FanChatBroadcastSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const viewingBroadcasts = activePeerId === "all";
  const activeThread = threads.find((thread) => thread.peerId === activePeerId);

  const loadInbox = useCallback(async () => {
    const response = await fetch("/api/fan-chat/messages?scope=inbox", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Unable to load conversations.");
    }
    const payload = (await response.json()) as { threads?: FanChatInboxThread[] };
    const nextThreads = payload.threads ?? [];
    setThreads(nextThreads);
    return nextThreads;
  }, []);

  const loadThread = useCallback(async (peerId: string) => {
    if (!peerId) {
      setMessages([]);
      setBroadcasts([]);
      return;
    }

    if (peerId === "all") {
      const response = await fetch("/api/fan-chat/messages?scope=broadcasts", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to load broadcasts.");
      }
      const payload = (await response.json()) as { broadcasts?: FanChatBroadcastSummary[] };
      setBroadcasts(payload.broadcasts ?? []);
      setMessages([]);
      return;
    }

    const params = new URLSearchParams({ peerId });
    const response = await fetch(`/api/fan-chat/messages?${params}`, { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Unable to load messages.");
    }
    const payload = (await response.json()) as { messages?: FanChatMessage[] };
    setMessages((current) => {
      const pending = current.filter((message) => message.deliveryStatus === "pending");
      return [...(payload.messages ?? []), ...pending];
    });
    setBroadcasts([]);
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    const nextThreads = await loadInbox();
    setActivePeerId((current) => {
      if (current === "all") return current;
      if (current && nextThreads.some((thread) => thread.peerId === current)) return current;
      const firstUnread = nextThreads.find((thread) => thread.unreadCount > 0);
      if (firstUnread) return firstUnread.peerId;
      return nextThreads[0]?.peerId ?? "";
    });
  }, [loadInbox]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await refreshAll();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load Fan Chat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshAll]);

  useEffect(() => {
    function onConnectionsChanged() {
      void refreshAll().catch(() => undefined);
    }
    window.addEventListener(CONNECTIONS_CHANGED_EVENT, onConnectionsChanged);
    return () => window.removeEventListener(CONNECTIONS_CHANGED_EVENT, onConnectionsChanged);
  }, [refreshAll]);

  useEffect(() => {
    if (loading || !activePeerId) return;
    void loadThread(activePeerId)
      .then(() => loadInbox())
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
      });
  }, [activePeerId, loadInbox, loadThread, loading]);

  useEffect(() => {
    if (!activePeerId) return;
    const interval = window.setInterval(() => {
      void loadThread(activePeerId)
        .then(() => loadInbox())
        .catch(() => undefined);
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [activePeerId, loadInbox, loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, broadcasts, activePeerId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!activePeerId || !draft.trim()) return;

    const body = draft.trim();

    if (viewingBroadcasts) {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/fan-chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: activePeerId, body })
        });
        const payload = (await response.json()) as { error?: string; message?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to send.");
        setDraft("");
        setNotice(payload.message ?? "Sent.");
        await loadThread(activePeerId);
        await loadInbox();
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "Unable to send.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const pendingId = `pending-${Date.now()}`;
    const optimistic: FanChatMessage = {
      id: pendingId,
      senderId: "self",
      recipientId: activePeerId,
      broadcastId: null,
      body,
      createdAt: new Date().toISOString(),
      senderUsername: "you",
      senderDisplayName: "You",
      recipientUsername: activeThread?.peerUsername ?? "",
      recipientDisplayName: activeThread?.peerDisplayName ?? null,
      direction: "outgoing",
      deliveryStatus: "pending"
    };

    setMessages((current) => [...current, optimistic]);
    setDraft("");
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/fan-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: activePeerId, body })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to send.");
      setNotice(payload.message ?? "Sent.");
      await loadThread(activePeerId);
      await loadInbox();
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== pendingId));
      setDraft(body);
      setError(sendError instanceof Error ? sendError.message : "Unable to send.");
    } finally {
      setBusy(false);
    }
  }

  const totalUnread = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  return (
    <div className="fan-chat-messenger fan-chat-messenger--inbox">
      {loading ? <p className="inline-status">Loading conversations…</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
      {notice ? <p className="inline-status community-notice">{notice}</p> : null}

      <div className="fan-chat-inbox-layout">
        <aside aria-label="Conversations" className="fan-chat-inbox-list">
          <p className="fan-chat-inbox-list-heading">
            <span className="panel-help-row">
              <span>Conversations</span>
              <HelpTooltip label="How Fan Chat works" size="sm">
                Message your connections in private threads. Add friends in{" "}
                <Link
                  href="/#community"
                  scroll={false}
                  onClick={handleKickboardCommunityNav}
                >
                  Community
                </Link>{" "}
                and accept requests to unlock chat.
              </HelpTooltip>
            </span>
            {totalUnread > 0 ? (
              <span className="fan-chat-inbox-unread-total">{totalUnread} unread</span>
            ) : null}
          </p>

          <ul className="fan-chat-inbox-threads">
            <li>
              <button
                className={`fan-chat-inbox-thread${viewingBroadcasts ? " fan-chat-inbox-thread--active" : ""}`}
                disabled={busy}
                type="button"
                onClick={() => setActivePeerId("all")}
              >
                <span className="fan-chat-inbox-thread-name">All connections</span>
                <span className="fan-chat-inbox-thread-preview">Broadcast to everyone you&apos;re connected with</span>
              </button>
            </li>
            {threads.length === 0 && !loading ? (
              <li className="fan-chat-inbox-empty">
                No connections yet. Accept a request in Community to start chatting.
              </li>
            ) : null}
            {threads.map((thread) => (
              <li key={thread.peerId}>
                <button
                  className={`fan-chat-inbox-thread${activePeerId === thread.peerId ? " fan-chat-inbox-thread--active" : ""}${thread.unreadCount > 0 ? " fan-chat-inbox-thread--unread" : ""}`}
                  disabled={busy}
                  type="button"
                  onClick={() => setActivePeerId(thread.peerId)}
                >
                  <span className="fan-chat-inbox-thread-row">
                    <span className="fan-chat-inbox-thread-name">{peerLabel(thread)}</span>
                    {thread.unreadCount > 0 ? (
                      <span className="fan-chat-inbox-unread-badge">{thread.unreadCount}</span>
                    ) : null}
                  </span>
                  <span className="fan-chat-inbox-thread-preview">
                    {thread.lastDirection === "outgoing" ? "You: " : ""}
                    {previewText(thread.lastMessageBody)}
                  </span>
                  {thread.lastMessageAt ? (
                    <span className="fan-chat-inbox-thread-time">
                      {new Date(thread.lastMessageAt).toLocaleString()}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="fan-chat-inbox-pane">
          {!activePeerId && !loading ? (
            <p className="fan-chat-thread-empty">Choose a conversation to read or send messages.</p>
          ) : null}

          {activePeerId ? (
            <>
              <header className="fan-chat-inbox-pane-header">
                <h3>
                  {viewingBroadcasts
                    ? "Broadcast"
                    : peerLabel(activeThread ?? { peerDisplayName: null, peerUsername: "Fan" })}
                </h3>
              </header>

              <div className="fan-chat-thread" aria-live="polite">
                {!loading && viewingBroadcasts ? (
                  broadcasts.length ? (
                    <ul className="fan-chat-broadcast-list">
                      {broadcasts.map((item) => (
                        <li className="fan-chat-broadcast-item" key={item.broadcastId}>
                          <p className="fan-chat-bubble-text">{item.body}</p>
                          <p className="fan-chat-bubble-meta">
                            Sent to {item.recipientCount} connection
                            {item.recipientCount === 1 ? "" : "s"} ·{" "}
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fan-chat-thread-empty">
                      No broadcasts yet. Write a message below to reach all connections at once.
                    </p>
                  )
                ) : null}

                {!loading && !viewingBroadcasts ? (
                  messages.length ? (
                    <ul className="fan-chat-message-list">
                      {messages.map((message) => (
                        <li
                          className={`fan-chat-message${message.direction === "outgoing" ? " fan-chat-message--outgoing" : " fan-chat-message--incoming"}`}
                          key={message.id}
                        >
                          <p className="fan-chat-bubble-text">{message.body}</p>
                          <p className="fan-chat-bubble-meta">
                            <span className="fan-chat-bubble-meta-main">
                              {message.direction === "outgoing"
                                ? "You"
                                : message.senderDisplayName ?? message.senderUsername}{" "}
                              · {new Date(message.createdAt).toLocaleString()}
                            </span>
                            {message.direction === "outgoing" && message.deliveryStatus ? (
                              <FanChatMessageStatus status={message.deliveryStatus} />
                            ) : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fan-chat-thread-empty">
                      No messages with {activeThread ? peerLabel(activeThread) : "this fan"} yet. Say hello below.
                    </p>
                  )
                ) : null}

                <div ref={threadEndRef} />
              </div>

              <form className="fan-chat-compose" onSubmit={handleSend}>
                <label className="feed-control-field fan-chat-compose-field">
                  <span>Message</span>
                  <textarea
                    className="feed-control-input fan-chat-compose-input"
                    disabled={busy || loading}
                    maxLength={500}
                    placeholder={
                      viewingBroadcasts
                        ? "Message all connections…"
                        : `Message ${activeThread ? peerLabel(activeThread) : "your connection"}…`
                    }
                    rows={3}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={busy || loading || !draft.trim()}
                  type="submit"
                >
                  {busy ? "Sending…" : viewingBroadcasts ? "Send to all" : "Send"}
                </button>
              </form>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
