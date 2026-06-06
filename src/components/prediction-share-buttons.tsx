"use client";

import { Copy, Loader2, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";
import { useToastOptional } from "@/components/toast-provider";
import {
  buildFacebookShareUrl,
  buildPredictionShareCaption,
  type PredictionSharePayload
} from "@/lib/predictions/share";

type PredictionShareButtonsProps = {
  payload: PredictionSharePayload;
  disabled?: boolean;
  className?: string;
};

type ShareLinkState =
  | { status: "loading" }
  | { status: "ready"; url: string; mode: "short" | "embedded" }
  | { status: "error"; message: string };

function IconFacebook({ size = 11 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconInstagram({ size = 11 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.775.132 4.602.333 3.678 1.257 2.753 2.182 2.553 3.354 2.493 4.631 2.433 5.911 2.42 6.32 2.42 12c0 5.741.013 6.15.072 7.43.06 1.277.26 2.45 1.185 3.374.924.924 2.097 1.124 3.374 1.185 1.28.059 1.689.072 7.43.072s6.15-.013 7.43-.072c1.277-.06 2.45-.26 3.374-1.185.924-.924 1.124-2.097 1.185-3.374.059-1.28.072-1.689.072-7.43s-.013-6.15-.072-7.43c-.06-1.277-.26-2.45-1.185-3.374-.924-.924-2.097-1.124-3.374-1.185C18.15.013 17.741 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PredictionShareButtons({
  payload,
  disabled = false,
  className = ""
}: PredictionShareButtonsProps) {
  const toast = useToastOptional();
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLinkState>({ status: "loading" });

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function createShareLink() {
      setShareLink({ status: "loading" });
      try {
        const response = await fetch("/api/predictions/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        const body = (await response.json()) as {
          url?: string;
          mode?: "short" | "embedded";
          error?: string;
        };

        if (cancelled) return;

        if (response.ok && body.url && (body.mode === "short" || body.mode === "embedded")) {
          setShareLink({
            status: "ready",
            url: body.url,
            mode: body.mode
          });
          return;
        }

        setShareLink({
          status: "error",
          message: body.error ?? "Could not create share link."
        });
      } catch (requestError) {
        if (cancelled || (requestError instanceof Error && requestError.name === "AbortError")) {
          return;
        }
        setShareLink({
          status: "error",
          message: "Could not reach the server."
        });
      }
    }

    void createShareLink();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [payload]);

  const canShare = Boolean(
    payload.predictedOutcome ||
      (payload.homeScore !== null && payload.awayScore !== null) ||
      payload.scorerPicks.length > 0
  );

  const sharePageUrl = shareLink.status === "ready" ? shareLink.url : "";
  const caption = useMemo(() => buildPredictionShareCaption(payload), [payload]);

  const shareText = useMemo(
    () => (sharePageUrl ? `${caption}\n\n${sharePageUrl}` : caption),
    [caption, sharePageUrl]
  );

  const linkNotReady =
    shareLink.status !== "ready" || !sharePageUrl || shareLink.mode === "embedded";

  const buttonsDisabled = disabled || linkNotReady;

  const notify = useCallback(
    (message: string, variant: "success" | "warning" = "success") => {
      toast?.showToast({ message, variant });
    },
    [toast]
  );

  const shareHelpLabel =
    shareLink.status === "loading"
      ? "Preparing share link…"
      : shareLink.status === "error"
        ? shareLink.message
        : "Share your pick";

  async function copyCaption() {
    if (linkNotReady) return;
    try {
      await navigator.clipboard.writeText(shareText);
      notify("Caption and link copied.");
    } catch {
      notify("Could not copy.", "warning");
    }
  }

  async function shareNative() {
    if (linkNotReady) return;
    if (!navigator.share) {
      await copyCaption();
      return;
    }
    try {
      await navigator.share({
        title: `MyPicks — ${payload.fixtureLabel}`,
        text: caption,
        url: sharePageUrl
      });
      notify("Shared.");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      await copyCaption();
    }
  }

  function shareFacebook() {
    if (linkNotReady) return;
    const url = buildFacebookShareUrl(sharePageUrl);
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=720");
    notify("Opened Facebook share.");
  }

  if (!canShare) return null;

  return (
    <div
      className={`prediction-share${className ? ` ${className}` : ""}`}
      title={shareHelpLabel}
    >
      <div aria-label={shareHelpLabel} className="prediction-share-actions" role="group">
        {shareLink.status === "loading" ? (
          <span
            aria-hidden
            className="prediction-share-icon-btn prediction-share-icon-btn--loading"
            title="Preparing share link…"
          >
            <Loader2 className="prediction-share-icon-spin" size={11} />
          </span>
        ) : null}
        <button
          aria-label="Share on Facebook"
          className="prediction-share-icon-btn prediction-share-icon-btn--facebook"
          disabled={buttonsDisabled}
          title="Share on Facebook"
          type="button"
          onClick={shareFacebook}
        >
          <IconFacebook />
        </button>
        <button
          aria-label="Share on Instagram"
          className="prediction-share-icon-btn prediction-share-icon-btn--instagram"
          disabled={buttonsDisabled}
          title="Share on Instagram"
          type="button"
          onClick={() => void shareNative()}
        >
          <IconInstagram />
        </button>
        {canNativeShare ? (
          <button
            aria-label="More share options"
            className="prediction-share-icon-btn"
            disabled={buttonsDisabled}
            title="More share options"
            type="button"
            onClick={() => void shareNative()}
          >
            <Share2 size={11} />
          </button>
        ) : null}
        <button
          aria-label="Copy caption and link"
          className="prediction-share-icon-btn"
          disabled={buttonsDisabled}
          title="Copy caption and link"
          type="button"
          onClick={() => void copyCaption()}
        >
          <Copy size={11} />
        </button>
        <HelpTooltip label="How sharing works" size="sm">
          {shareLink.status === "ready" && shareLink.mode === "short"
            ? "Short link ready — safe for texts and social apps. "
            : null}
          Friends should open the MyPicks link, not only the caption.
        </HelpTooltip>
      </div>
    </div>
  );
}
