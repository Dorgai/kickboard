"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FanChatBroadcastSummary, FanChatMessage } from "@/lib/fan-chat/store";

type ConnectionPeer = {
  id: string;
  username: string;
  displayName: string | null;
};

type RecipientOption = {
  value: string;
  label: string;
};

function peerLabel(peer: ConnectionPeer) {
  return peer.displayName?.trim() || peer.username;
}

export function FanChatMessenger() {
  const [connections, setConnections] = useState<ConnectionPeer[]>([]);
  const [recipientId, setRecipientId] = useState<string>("");
  const [messages, setMessages] = useState<FanChatMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<FanChatBroadcastSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const recipientOptions: RecipientOption[] = [
    { value: "all", label: "All connections" },
    ...connections.map((peer) => ({
      value: peer.id,
      label: peerLabel(peer)
    }))
  ];

  const loadConnections = useCallback(async () => {
    const response = await fetch("/api/connections", { cache: "no-store" });
    if (!response.ok) {
      setConnections([]);
      return;
    }
    const payload = (await response.json()) as {
      accepted?: Array<{ peer: ConnectionPeer }>;
    };
    const accepted = (payload.accepted ?? []).map((row) => row.peer);
    setConnections(accepted);
    setRecipientId((current) => {
      if (current === "all" || accepted.some((peer) => peer.id === current)) return current;
      return accepted[0]?.id ?? "all";
    });
  }, []);

  const loadThread = useCallback(async () => {
    if (!recipientId) {
      setMessages([]);
      setBroadcasts([]);
      return;
    }

    if (recipientId === "all") {
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

    const params = new URLSearchParams({ peerId: recipientId });
    const response = await fetch(`/api/fan-chat/messages?${params}`, { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Unable to load messages.");
    }
    const payload = (await response.json()) as { messages?: FanChatMessage[] };
    setMessages(payload.messages ?? []);
    setBroadcasts([]);
  }, [recipientId]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await loadConnections();
      await loadThread();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Fan Chat.");
    } finally {
      setLoading(false);
    }
  }, [loadConnections, loadThread]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    void loadThread().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    });
  }, [recipientId, loadThread, loading]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadThread().catch(() => {
        /* silent poll */
      });
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, broadcasts, recipientId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!recipientId || !draft.trim()) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/fan-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, body: draft })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to send.");
      setDraft("");
      setNotice(payload.message ?? "Sent.");
      await loadThread();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send.");
    } finally {
      setBusy(false);
    }
  }

  const viewingBroadcasts = recipientId === "all";

  return (
    <div className="fan-chat-messenger">
      <p className="fan-chat-messenger-lead">
        Private messages to one connection or everyone you&apos;re connected with. Add friends in{" "}
        <Link href="/#community">Community</Link>.
      </p>

      <label className="feed-control-field fan-chat-recipient-field">
        <span>To</span>
        <select
          className="feed-control-input"
          disabled={busy || loading}
          value={recipientId}
          onChange={(event) => setRecipientId(event.target.value)}
        >
          {recipientOptions.length === 1 ? (
            <option value="all">All connections (none yet)</option>
          ) : (
            recipientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      </label>

      {loading ? <p className="inline-status">Loading messages…</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
      {notice ? <p className="inline-status community-notice">{notice}</p> : null}

      <div className="fan-chat-thread" aria-live="polite">
        {!loading && viewingBroadcasts ? (
          broadcasts.length ? (
            <ul className="fan-chat-broadcast-list">
              {broadcasts.map((item) => (
                <li className="fan-chat-broadcast-item" key={item.broadcastId}>
                  <p className="fan-chat-bubble-text">{item.body}</p>
                  <p className="fan-chat-bubble-meta">
                    Sent to {item.recipientCount} connection{item.recipientCount === 1 ? "" : "s"} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fan-chat-thread-empty">
              No broadcasts yet. Choose <strong>All connections</strong> and send a message below.
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
                    {message.direction === "outgoing" ? "You" : message.senderDisplayName ?? message.senderUsername} ·{" "}
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fan-chat-thread-empty">
              No messages with {recipientOptions.find((option) => option.value === recipientId)?.label ?? "this fan"} yet.
              Say hello below.
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
            disabled={busy || loading || !recipientId}
            maxLength={500}
            placeholder={
              recipientId === "all"
                ? "Message all connections…"
                : "Write a private message…"
            }
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy || loading || !draft.trim() || !recipientId} type="submit">
          {busy ? "Sending…" : recipientId === "all" ? "Send to all" : "Send"}
        </button>
      </form>
    </div>
  );
}
