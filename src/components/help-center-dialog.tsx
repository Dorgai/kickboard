"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  OPEN_HELP_CENTER_EVENT,
  type HelpCenterOpenDetail
} from "@/lib/help/events";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";

type HelpChannel = "ai" | "admin";

type HelpMessage = {
  id: string;
  role: "user" | "assistant" | "admin" | "system";
  body: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type HelpConversation = {
  id: string;
  channel: HelpChannel;
  subject: string | null;
  status: string;
  messages: HelpMessage[];
};

export function HelpCenterDialog() {
  const { data: session, status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<HelpChannel>("ai");
  const [conversation, setConversation] = useState<HelpConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const signedIn = Boolean(session?.user?.onboardingComplete);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<HelpCenterOpenDetail>).detail;
      if (detail?.channel) setChannel(detail.channel);
      setOpen(true);
    }
    window.addEventListener(OPEN_HELP_CENTER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_HELP_CENTER_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/help/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { aiConfigured?: boolean }) => setAiConfigured(payload.aiConfigured ?? false))
      .catch(() => setAiConfigured(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConversation(null);
      setDraft("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length, open]);

  const sendMessage = useCallback(async () => {
    const message = draft.trim();
    if (!message || busy) return;

    setBusy(true);
    setError(null);

    try {
      if (!conversation) {
        const response = await fetch("/api/help/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, message })
        });
        const payload = (await response.json()) as {
          error?: string;
          conversation?: HelpConversation;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unable to send.");
        setConversation(payload.conversation ?? null);
      } else {
        const response = await fetch(`/api/help/conversations/${conversation.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });
        const payload = (await response.json()) as {
          error?: string;
          conversation?: HelpConversation;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unable to send.");
        setConversation(payload.conversation ?? null);
      }
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send.");
    } finally {
      setBusy(false);
    }
  }, [busy, channel, conversation, draft]);

  function close() {
    setOpen(false);
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="timeline-modal help-center-dialog"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => closeDialogOnBackdropClick(event, close)}
      onClose={close}
    >
      <div className="help-center-panel">
        <header className="help-center-header">
          <div>
            <p className="help-center-eyebrow">Help</p>
            <h2 id={titleId}>Questions & support</h2>
          </div>
          <button className="button secondary help-center-close" type="button" onClick={close}>
            Close
          </button>
        </header>

        <div className="help-center-channel-tabs feed-tab-bar" role="tablist">
          <button
            aria-pressed={channel === "ai"}
            className={channel === "ai" ? "active" : undefined}
            type="button"
            onClick={() => {
              setChannel("ai");
              setConversation(null);
            }}
          >
            Kickboard AI
          </button>
          <button
            aria-pressed={channel === "admin"}
            className={channel === "admin" ? "active" : undefined}
            type="button"
            onClick={() => {
              setChannel("admin");
              setConversation(null);
            }}
          >
            Ask admin
          </button>
        </div>

        {channel === "ai" && aiConfigured === false ? (
          <p className="help-center-note inline-status">
            AI uses our built-in guides. Set <code>OPENAI_API_KEY</code> on the server for richer
            answers.
          </p>
        ) : null}

        {sessionStatus === "loading" ? (
          <p className="inline-status">Checking sign-in…</p>
        ) : !signedIn ? (
          <p className="inline-status">
            Sign in and complete onboarding to save your help conversations and reach an admin.
          </p>
        ) : (
          <>
            <div className="help-center-thread" ref={threadRef}>
              {!conversation ? (
                <p className="help-center-placeholder">
                  {channel === "ai"
                    ? "Ask how Predictions, Coach Board, Community, or sign-in work."
                    : "Describe your issue — admins see every message in Admin → Help."}
                </p>
              ) : (
                <ul className="help-center-messages">
                  {conversation.messages.map((message) => (
                    <li
                      className={`help-center-message help-center-message--${message.role}`}
                      key={message.id}
                    >
                      <span className="help-center-message-role">
                        {message.role === "user"
                          ? "You"
                          : message.role === "assistant"
                            ? "Kickboard AI"
                            : message.role === "admin"
                              ? "Admin"
                              : "System"}
                      </span>
                      <p>{message.body}</p>
                      <time dateTime={message.createdAt}>
                        {new Date(message.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form
              className="help-center-compose"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <label className="help-center-compose-label">
                <span className="sr-only">Your message</span>
                <textarea
                  disabled={busy}
                  placeholder={
                    channel === "ai"
                      ? "Ask Kickboard AI…"
                      : "Message for admins (account, bugs, policy)…"
                  }
                  rows={3}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
              <div className="help-center-compose-actions">
                {conversation ? (
                  <button
                    className="button secondary"
                    disabled={busy}
                    type="button"
                    onClick={() => setConversation(null)}
                  >
                    New thread
                  </button>
                ) : null}
                <button className="button primary" disabled={busy || !draft.trim()} type="submit">
                  {busy ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </>
        )}

        {error ? <p className="inline-status">{error}</p> : null}
      </div>
    </dialog>
  );
}
