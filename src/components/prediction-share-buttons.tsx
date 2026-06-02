"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildFacebookShareUrl,
  buildPredictionAppDeepLink,
  buildPredictionShareCaption,
  buildPredictionSharePageUrl,
  type PredictionSharePayload
} from "@/lib/predictions/share";

type PredictionShareButtonsProps = {
  payload: PredictionSharePayload;
  disabled?: boolean;
  className?: string;
};

export function PredictionShareButtons({
  payload,
  disabled = false,
  className = ""
}: PredictionShareButtonsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const canShare = Boolean(
    payload.predictedOutcome ||
      (payload.homeScore !== null && payload.awayScore !== null) ||
      payload.scorerPicks.length > 0
  );

  const sharePageUrl = useMemo(() => buildPredictionSharePageUrl(payload), [payload]);
  const caption = useMemo(() => buildPredictionShareCaption(payload), [payload]);
  const appLink = useMemo(
    () => buildPredictionAppDeepLink(payload.fixtureKey),
    [payload.fixtureKey]
  );

  const shareText = useMemo(() => `${caption}\n\n${sharePageUrl}`, [caption, sharePageUrl]);

  const clearFeedback = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  async function copyCaption() {
    clearFeedback();
    try {
      await navigator.clipboard.writeText(shareText);
      setNotice("Caption and link copied.");
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  }

  async function shareNative() {
    clearFeedback();
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
      <div className="prediction-share-actions">
        <button
          className="button secondary prediction-share-btn prediction-share-btn--facebook"
          disabled={disabled}
          type="button"
          onClick={shareFacebook}
        >
          Facebook
        </button>
        <button
          className="button secondary prediction-share-btn prediction-share-btn--instagram"
          disabled={disabled}
          type="button"
          onClick={() => void shareInstagram()}
        >
          Instagram
        </button>
        {canNativeShare ? (
          <button
            className="button secondary prediction-share-btn"
            disabled={disabled}
            type="button"
            onClick={() => void shareNative()}
          >
            More…
          </button>
        ) : null}
        <button
          className="button secondary prediction-share-btn"
          disabled={disabled}
          type="button"
          onClick={() => void copyCaption()}
        >
          Copy
        </button>
      </div>
      <p className="prediction-share-hint">
        Instagram has no web post button — we copy your caption or use your phone&apos;s share sheet.
        Friends open <a href={appLink}>your match on Kickboard</a>.
      </p>
      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </div>
  );
}
