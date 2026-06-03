"use client";

import { Calendar, Target, Trophy, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  isCheckpointIntervalElapsed,
  markCheckpointDismissed,
  SESSION_CHECKPOINT_CLOSE_EVENT
} from "@/lib/session-checkpoint/storage";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";
import { hasSeenWelcome } from "@/lib/welcome";
import { TeamLabel } from "@/components/team-label";
import { closeDialogOnBackdropClick } from "@/lib/use-dismiss-on-outside-pointer-down";
import type { SessionCheckpointPayload } from "@/lib/session-checkpoint/data";

function formatKickoff(iso: string | null) {
  if (!iso) return "Time TBC";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRelativeUpdated(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SessionCheckpointDialog() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SessionCheckpointPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const prevStatusRef = useRef(status);
  const loginPulseRef = useRef(false);
  const fetchedRef = useRef(false);

  const dismiss = useCallback(() => {
    markCheckpointDismissed();
    setOpen(false);
  }, []);

  const loadAndOpen = useCallback(async () => {
    if (fetchedRef.current && data) {
      setOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/session-checkpoint", { cache: "no-store" });
      const payload = (await response.json()) as SessionCheckpointPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load summary.");
      setData(payload);
      fetchedRef.current = true;
      setOpen(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load summary.");
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (prevStatusRef.current === "unauthenticated" && status === "authenticated") {
      loginPulseRef.current = true;
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    if (!hasSeenWelcome()) return;

    const shouldOpen =
      loginPulseRef.current || isCheckpointIntervalElapsed();

    if (!shouldOpen) return;

    loginPulseRef.current = false;

    const delay = window.setTimeout(() => {
      void loadAndOpen();
    }, 400);

    return () => window.clearTimeout(delay);
  }, [loadAndOpen, session?.user?.onboardingComplete, status]);

  useEffect(() => {
    function onWelcomeDone() {
      if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
      if (!loginPulseRef.current && !isCheckpointIntervalElapsed()) return;
      loginPulseRef.current = false;
      void loadAndOpen();
    }

    window.addEventListener("kickboard:welcome-dismissed", onWelcomeDone);
    return () => window.removeEventListener("kickboard:welcome-dismissed", onWelcomeDone);
  }, [loadAndOpen, session?.user?.onboardingComplete, status]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (status !== "authenticated") {
      fetchedRef.current = false;
      setData(null);
      setOpen(false);
    }
  }, [status]);

  useEffect(() => {
    function onForceClose() {
      setOpen(false);
    }

    window.addEventListener(SESSION_CHECKPOINT_CLOSE_EVENT, onForceClose);
    return () => window.removeEventListener(SESSION_CHECKPOINT_CLOSE_EVENT, onForceClose);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;
    if (!hasSeenWelcome()) return;

    const interval = window.setInterval(() => {
      if (open || loading) return;
      if (!isCheckpointIntervalElapsed()) return;
      void loadAndOpen();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadAndOpen, loading, open, session?.user?.onboardingComplete, status]);

  if (status !== "authenticated" || !session?.user?.onboardingComplete) {
    return null;
  }

  function goPredict(fixtureKey: string) {
    dismiss();
    navigateToPredictFixture(fixtureKey);
  }

  const wallet = data?.wallet;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="timeline-modal session-checkpoint-dialog"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => closeDialogOnBackdropClick(event, dismiss)}
      onClose={dismiss}
    >
      <div className="session-checkpoint-panel timeline-modal-panel">
        <header className="timeline-modal-header session-checkpoint-header">
          <div>
            <p className="session-checkpoint-eyebrow">Your Kickboard check-in</p>
            <h2 id={titleId}>Matches & performance</h2>
          </div>
          <button
            aria-label="Close"
            className="button secondary timeline-modal-close"
            type="button"
            onClick={dismiss}
          >
            <X size={18} />
          </button>
        </header>

        <div className="timeline-modal-body session-checkpoint-body">
          {loading && !data ? <p className="inline-status">Loading your summary…</p> : null}
          {error ? <p className="inline-status">{error}</p> : null}

          {data ? (
            <>
              <section className="session-checkpoint-section" aria-labelledby="checkpoint-upcoming">
                <h3 className="session-checkpoint-section-title" id="checkpoint-upcoming">
                  <Calendar aria-hidden size={18} />
                  Upcoming matches
                </h3>
                {data.upcoming.length === 0 ? (
                  <p className="session-checkpoint-empty">No upcoming fixtures in the schedule right now.</p>
                ) : (
                  <ul className="session-checkpoint-matches">
                    {data.upcoming.map((fixture) => (
                      <li className="session-checkpoint-match" key={fixture.fixtureKey}>
                        <div className="session-checkpoint-match-copy">
                          <div className="session-checkpoint-match-teams" title={fixture.shortLabel}>
                            <TeamLabel layout="stacked" name={fixture.homeTeam} size="xs" />
                            <span className="session-checkpoint-match-vs">vs</span>
                            <TeamLabel layout="stacked" name={fixture.awayTeam} size="xs" />
                          </div>
                          <span className="session-checkpoint-match-kickoff">{formatKickoff(fixture.kickoff)}</span>
                          {fixture.group ? (
                            <span className="session-checkpoint-match-meta">Group {fixture.group}</span>
                          ) : null}
                        </div>
                        <button
                          className={`button ${fixture.hasPrediction ? "secondary" : "primary"}`}
                          type="button"
                          onClick={() => goPredict(fixture.fixtureKey)}
                        >
                          <Target aria-hidden size={16} />
                          {fixture.hasPrediction ? "Edit picks" : "Predict"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="session-checkpoint-section" aria-labelledby="checkpoint-performance">
                <h3 className="session-checkpoint-section-title" id="checkpoint-performance">
                  <Trophy aria-hidden size={18} />
                  Your performance
                </h3>
                {wallet ? (
                  <div className="session-checkpoint-stats">
                    <div className="session-checkpoint-stat session-checkpoint-stat--primary">
                      <span className="session-checkpoint-stat-value">{wallet.balance}</span>
                      <span className="session-checkpoint-stat-label">Points total</span>
                    </div>
                    <div className="session-checkpoint-stat">
                      <span className="session-checkpoint-stat-value">+{wallet.pointsWon}</span>
                      <span className="session-checkpoint-stat-label">Earned</span>
                    </div>
                    <div className="session-checkpoint-stat">
                      <span className="session-checkpoint-stat-value">{wallet.picksWon}</span>
                      <span className="session-checkpoint-stat-label">Won</span>
                    </div>
                    <div className="session-checkpoint-stat">
                      <span className="session-checkpoint-stat-value">{wallet.picksPending}</span>
                      <span className="session-checkpoint-stat-label">Pending</span>
                    </div>
                  </div>
                ) : null}

                {data.recentPicks.length > 0 ? (
                  <>
                    <h4 className="session-checkpoint-recent-title">Recent picks</h4>
                    <ul className="session-checkpoint-recent">
                      {data.recentPicks.map((pick) => (
                        <li className="session-checkpoint-recent-item" key={`${pick.fixtureKey}-${pick.updatedAt}`}>
                          <div>
                            <strong className="session-checkpoint-recent-fixture">{pick.fixtureLabel}</strong>
                            <span>
                              {pick.summary} · {formatRelativeUpdated(pick.updatedAt)}
                            </span>
                          </div>
                          <span className="session-checkpoint-recent-points">
                            {pick.pointsEarned > 0 ? `+${pick.pointsEarned}` : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="session-checkpoint-empty">No picks yet — predict your first match above.</p>
                )}
              </section>
            </>
          ) : null}
        </div>

        <footer className="session-checkpoint-footer">
          <button className="button primary" type="button" onClick={dismiss}>
            Continue
          </button>
          <p className="session-checkpoint-footnote">Shown after sign-in and every 2 hours while you use Kickboard.</p>
        </footer>
      </div>
    </dialog>
  );
}
