"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import {
  OPEN_HELP_CENTER_EVENT,
  type HelpCenterOpenDetail
} from "@/lib/help/events";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";
import { X } from "lucide-react";

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
  const { t } = useTranslation();
  const { data: session, status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<HelpChannel>("ai");
  const [conversation, setConversation] = useState<HelpConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      <div className="timeline-modal-panel help-center-panel">
        <header className="timeline-modal-header help-center-header">
          <div className="help-center-header-copy">
            <p className="help-center-eyebrow">{t("helpCenter.eyebrow")}</p>
            <h2 className="help-center-title" id={titleId}>
              <span>{t("helpCenter.heading")}</span>
            </h2>
          </div>
          <button
            aria-label={t("helpCenter.close")}
            className="button secondary help-center-close"
            type="button"
            onClick={close}
          >
            <X aria-hidden size={18} />
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
            {t("helpCenter.channelAi")}
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
            {t("helpCenter.channelAdmin")}
          </button>
        </div>

        <div className="help-center-body">
          {sessionStatus === "loading" ? (
            <p className="inline-status">{t("common.checkingSignIn")}</p>
          ) : !signedIn ? (
            <p className="help-center-guest-note">{t("helpCenter.signInPrompt")}</p>
          ) : (
            <>
              <div className="help-center-thread" ref={threadRef}>
                {!conversation ? (
                  <p className="help-center-placeholder">
                    {channel === "ai"
                      ? t("helpCenter.threadPlaceholderAi")
                      : t("helpCenter.threadPlaceholderAdmin")}
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
                            ? t("helpCenter.roleYou")
                            : message.role === "assistant"
                              ? t("helpCenter.channelAi")
                              : message.role === "admin"
                                ? t("helpCenter.roleAdmin")
                                : t("helpCenter.roleSystem")}
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
                  <span className="sr-only">{t("helpCenter.yourMessage")}</span>
                  <textarea
                    className="help-center-compose-input"
                    disabled={busy}
                    placeholder={
                      channel === "ai" ? t("helpCenter.placeholderAi") : t("helpCenter.placeholderAdmin")
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
                      {t("helpCenter.newThread")}
                    </button>
                  ) : null}
                  <button className="button primary" disabled={busy || !draft.trim()} type="submit">
                    {busy ? t("common.sending") : t("helpCenter.send")}
                  </button>
                </div>
              </form>
            </>
          )}

          {error ? <p className="inline-error help-center-error">{error}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
