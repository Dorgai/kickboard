"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildFacebookShareUrl,
  buildPredictionAppDeepLink,
  buildPredictionShareCaption,
  buildPredictionSharePageUrlEmbedded,
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

export function PredictionShareButtons({
  payload,
  disabled = false,
  className = ""
}: PredictionShareButtonsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

        if (response.ok && body.url) {
          setShareLink({
            status: "ready",
            url: body.url,
            mode: body.mode === "embedded" ? "embedded" : "short"
          });
          return;
        }

        setShareLink({
          status: "ready",
          url: buildPredictionSharePageUrlEmbedded(payload),
          mode: "embedded"
        });
        if (!response.ok && body.error) {
          setError(body.error);
        }
      } catch (requestError) {
        if (cancelled || (requestError instanceof Error && requestError.name === "AbortError")) {
          return;
        }
        setShareLink({
          status: "ready",
          url: buildPredictionSharePageUrlEmbedded(payload),
          mode: "embedded"
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
  const appLink = useMemo(
    () => buildPredictionAppDeepLink(payload.fixtureKey),
    [payload.fixtureKey]
  );

  const shareText = useMemo(
    () => (sharePageUrl ? `${caption}\n\n${sharePageUrl}` : caption),
    [caption, sharePageUrl]
  );

  const clearFeedback = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  const linkNotReady = shareLink.status !== "ready" || !sharePageUrl;

  async function copyCaption() {
    clearFeedback();
    if (linkNotReady) {
      setError("Still preparing your share link…");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setNotice("Caption and link copied.");
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  }

  async function shareNative() {
    clearFeedback();
    if (linkNotReady) {
      setError("Still preparing your share link…");
      return;
    }
    if (!navigator.share) {
      await copyCaption();
      setNotice("Caption copied. Paste into Instagram, Stories, or a post.");
      return;
    }
    try {
      await navigator.share({
        title: `Kickboard — ${payload.fixtureLabel}`,
        text: caption,
        url: sharePageUrl
      });
      setNotice("Shared.");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      await copyCaption();
      setNotice("Caption copied. Paste into your social app.");
    }
  }

  function shareFacebook() {
    clearFeedback();
    if (linkNotReady) {
      setError("Still preparing your share link…");
      return;
    }
    const url = buildFacebookShareUrl(sharePageUrl);
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=720");
    setNotice("Opened Facebook share window.");
  }

  async function shareInstagram() {
    clearFeedback();
    await shareNative();
    if (!navigator.share) {
      setNotice("Caption copied. Open Instagram and paste into a story, post, or DM.");
    }
  }

  if (!canShare) return null;

  return (
    <div className={`prediction-share${className ? ` ${className}` : ""}`}>
      <p className="prediction-share-label">Share your pick</p>
      {shareLink.status === "loading" ? (
        <p className="inline-status">Preparing share link…</p>
      ) : null}
      {shareLink.status === "ready" && shareLink.mode === "short" ? (
        <p className="prediction-share-hint">
          Short link ready — safe to paste in texts and social apps.
        </p>
      ) : null}
      <div className="prediction-share-actions">
        <button
          className="button secondary prediction-share-btn prediction-share-btn--facebook"
          disabled={disabled || linkNotReady}
          type="button"
          onClick={shareFacebook}
        >
          Facebook
        </button>
        <button
          className="button secondary prediction-share-btn prediction-share-btn--instagram"
          disabled={disabled || linkNotReady}
          type="button"
          onClick={() => void shareInstagram()}
        >
          Instagram
        </button>
        {canNativeShare ? (
          <button
            className="button secondary prediction-share-btn"
            disabled={disabled || linkNotReady}
            type="button"
            onClick={() => void shareNative()}
          >
            More…
          </button>
        ) : null}
        <button
          className="button secondary prediction-share-btn"
          disabled={disabled || linkNotReady}
          type="button"
          onClick={() => void copyCaption()}
        >
          Copy
        </button>
      </div>
      <p className="prediction-share-hint">
        Friends should open the Kickboard link (not only the caption). You can also send them{" "}
        <a href={appLink}>this match on Kickboard</a>.
      </p>
      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </div>
  );
}
