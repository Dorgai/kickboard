"use client";

import { FormEvent, useEffect, useState } from "react";
import { FanChatMessageStatus } from "@/components/fan-chat-message-status";
import type { FanChatMessage } from "@/lib/fan-chat/store";

function canEditMessage(message: FanChatMessage) {
  return (
    message.direction === "outgoing" &&
    !message.broadcastId &&
    message.deliveryStatus !== "pending" &&
    !message.id.startsWith("pending-")
  );
}

export function FanChatMessageItem({
  message,
  busy,
  onEdit
}: {
  message: FanChatMessage;
  busy: boolean;
  onEdit: (messageId: string, body: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const editable = canEditMessage(message);

  useEffect(() => {
    if (!editing) setDraft(message.body);
  }, [editing, message.body]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === message.body.trim()) {
      setEditing(false);
      return;
    }
    await onEdit(message.id, next);
    setEditing(false);
  }

  return (
    <li
      className={`fan-chat-message${message.direction === "outgoing" ? " fan-chat-message--outgoing" : " fan-chat-message--incoming"}`}
    >
      {editing ? (
        <form className="fan-chat-message-edit" onSubmit={handleSave}>
          <textarea
            aria-label="Edit message"
            className="feed-control-input fan-chat-compose-input fan-chat-message-edit-input"
            disabled={busy}
            maxLength={500}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="fan-chat-message-edit-actions">
            <button className="button secondary" disabled={busy} type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || !draft.trim()} type="submit">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="fan-chat-bubble-text">{message.body}</p>
          <p className="fan-chat-bubble-meta">
            <span className="fan-chat-bubble-meta-main">
              {message.direction === "outgoing"
                ? "You"
                : message.senderDisplayName ?? message.senderUsername}{" "}
              · {new Date(message.createdAt).toLocaleString()}
              {message.editedAt ? " · edited" : ""}
            </span>
            <span className="fan-chat-bubble-meta-actions">
              {editable ? (
                <button
                  className="fan-chat-message-edit-btn"
                  disabled={busy}
                  type="button"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              ) : null}
              {message.direction === "outgoing" && message.deliveryStatus ? (
                <FanChatMessageStatus status={message.deliveryStatus} />
              ) : null}
            </span>
          </p>
        </>
      )}
    </li>
  );
}
