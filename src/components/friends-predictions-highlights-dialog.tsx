"use client";

import { Users, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import type { FriendsDailyHighlightsPayload } from "@/lib/connections/friends-daily-highlights";
import {
  FRIENDS_HIGHLIGHTS_BLOW_UP_MS,
  FRIENDS_HIGHLIGHTS_VISIBLE_MS,
  hasSeenFriendsHighlightsToday,
  markFriendsHighlightsShown
} from "@/lib/friends-highlights/daily-storage";
import { writeLocationHash } from "@/lib/navigation/location-hash";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";
import { SESSION_CHECKPOINT_CLOSE_EVENT } from "@/lib/session-checkpoint/storage";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";
import { hasSeenWelcome } from "@/lib/welcome";

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FriendsPredictionsHighlightsDialog() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const userId = session?.user?.id ?? null;
  const onboardingComplete = Boolean(session?.user?.onboardingComplete);

  const [open, setOpen] = useState(false);
  const [blowingUp, setBlowingUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FriendsDailyHighlightsPayload | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const fetchedRef = useRef(false);
  const openingRef = useRef(false);
  const visibleTimerRef = useRef<number | null>(null);
  const blowUpTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    for (const ref of [visibleTimerRef, blowUpTimerRef, closeTimerRef]) {
      if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    }
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    setBlowingUp(false);
    setOpen(false);
    if (userId) markFriendsHighlightsShown(userId);
  }, [clearTimers, userId]);

  const startBlowUp = useCallback(() => {
    if (!open || blowingUp) return;
    setBlowingUp(true);
    blowUpTimerRef.current = window.setTimeout(() => {
      finish();
    }, FRIENDS_HIGHLIGHTS_BLOW_UP_MS);
  }, [blowingUp, finish, open]);

  const scheduleAutoDismiss = useCallback(() => {
    clearTimers();
    visibleTimerRef.current = window.setTimeout(() => {
      startBlowUp();
    }, FRIENDS_HIGHLIGHTS_VISIBLE_MS);
  }, [clearTimers, startBlowUp]);

  const tryOpen = useCallback(async () => {
    if (openingRef.current || open || loading) return;
    if (status !== "authenticated" || !userId || !onboardingComplete) return;
    if (!hasSeenWelcome()) return;
    if (hasSeenFriendsHighlightsToday(userId)) return;

    openingRef.current = true;
    setLoading(true);
    try {
      if (!fetchedRef.current) {
        const response = await fetch("/api/connections/daily-highlights", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as FriendsDailyHighlightsPayload;
        setData(payload);
        fetchedRef.current = true;
      }

      if (hasSeenFriendsHighlightsToday(userId)) return;
      setOpen(true);
      scheduleAutoDismiss();
    } finally {
      setLoading(false);
      openingRef.current = false;
    }
  }, [loading, onboardingComplete, open, scheduleAutoDismiss, status, userId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (status !== "authenticated" || !userId || !onboardingComplete) return;
    if (!hasSeenWelcome()) return;
    if (hasSeenFriendsHighlightsToday(userId)) return;

    const delay = window.setTimeout(() => {
      void tryOpen();
    }, 4500);

    return () => window.clearTimeout(delay);
  }, [onboardingComplete, status, tryOpen, userId]);

  useEffect(() => {
    function onWelcomeDone() {
      window.setTimeout(() => void tryOpen(), 5000);
    }
    function onCheckpointClosed() {
      window.setTimeout(() => void tryOpen(), 700);
    }

    window.addEventListener("kickboard:welcome-dismissed", onWelcomeDone);
    window.addEventListener(SESSION_CHECKPOINT_CLOSE_EVENT, onCheckpointClosed);
    return () => {
      window.removeEventListener("kickboard:welcome-dismissed", onWelcomeDone);
      window.removeEventListener(SESSION_CHECKPOINT_CLOSE_EVENT, onCheckpointClosed);
    };
  }, [tryOpen]);

  useEffect(() => {
    if (status !== "authenticated" || !userId || !onboardingComplete) return;

    const interval = window.setInterval(() => {
      if (open || loading || blowingUp) return;
      if (!hasSeenWelcome() || hasSeenFriendsHighlightsToday(userId)) return;
      void tryOpen();
    }, 90_000);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (open || loading || blowingUp) return;
      if (!hasSeenWelcome() || hasSeenFriendsHighlightsToday(userId)) return;
      void tryOpen();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [blowingUp, loading, onboardingComplete, open, status, tryOpen, userId]);

  useEffect(() => {
    if (status !== "authenticated") {
      fetchedRef.current = false;
      setData(null);
      setOpen(false);
      clearTimers();
    }
  }, [clearTimers, status]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (status !== "authenticated" || !userId || !onboardingComplete) {
    return null;
  }

  if (hasSeenFriendsHighlightsToday(userId) && !open && !loading && !blowingUp) {
    return null;
  }

  function dismissNow() {
    if (blowingUp) return;
    startBlowUp();
  }

  function goCommunity() {
    writeLocationHash("community");
    finish();
  }

  function goHighlight(fixtureKey: string | null) {
    finish();
    if (fixtureKey) {
      navigateToPredictFixture(fixtureKey);
      return;
    }
    writeLocationHash("predictions");
  }

  const peerCount = data?.peerCount ?? 0;
  const highlights = data?.highlights ?? [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`timeline-modal friends-highlights-dialog${blowingUp ? " friends-highlights-dialog--blow-up" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        dismissNow();
      }}
      onClick={(event) => closeDialogOnBackdropClick(event, dismissNow)}
      onClose={() => {
        if (userId && !hasSeenFriendsHighlightsToday(userId)) {
          markFriendsHighlightsShown(userId);
        }
      }}
    >
      <div className="friends-highlights-panel timeline-modal-panel kickboard-hero-backdrop">
        <header className="timeline-modal-header friends-highlights-header">
          <div>
            <p className="friends-highlights-eyebrow">{t("friendsHighlights.eyebrow")}</p>
            <h2 id={titleId}>{t("friendsHighlights.title")}</h2>
            <p className="friends-highlights-lead">
              {peerCount > 0
                ? t("friendsHighlights.leadWithFriends", { count: peerCount })
                : t("friendsHighlights.leadNoFriends")}
            </p>
          </div>
          <button
            aria-label={t("friendsHighlights.close")}
            className="button secondary timeline-modal-close"
            type="button"
            onClick={dismissNow}
          >
            <X aria-hidden size={16} />
          </button>
        </header>

        <div className="timeline-modal-body friends-highlights-body">
          {loading && !data ? (
            <p className="inline-status">{t("friendsHighlights.loading")}</p>
          ) : null}

          {!loading && highlights.length > 0 ? (
            <ol className="friends-highlights-list">
              {highlights.map((item) => (
                <li key={item.id}>
                  <button
                    className="friends-highlights-item"
                    type="button"
                    onClick={() => goHighlight(item.fixtureKey)}
                  >
                    <span className="friends-highlights-item-copy">
                      <strong>{item.headline}</strong>
                      <span>{item.detail}</span>
                    </span>
                    <time dateTime={item.occurredAt}>{formatRelativeTime(item.occurredAt)}</time>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}

          {!loading && highlights.length === 0 ? (
            <div className="friends-highlights-empty">
              <Users aria-hidden className="friends-highlights-empty-icon" size={28} strokeWidth={1.75} />
              <p>{peerCount > 0 ? t("friendsHighlights.emptyWithFriends") : t("friendsHighlights.emptyNoFriends")}</p>
              <button className="button secondary" type="button" onClick={goCommunity}>
                {t("friendsHighlights.findFriends")}
              </button>
            </div>
          ) : null}

          <p className="friends-highlights-timer" role="status">
            {blowingUp ? t("friendsHighlights.blowingUp") : t("friendsHighlights.autoDismiss")}
          </p>
        </div>
      </div>
    </dialog>
  );
}
