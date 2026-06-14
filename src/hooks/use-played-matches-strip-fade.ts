"use client";

import { useCallback, useEffect, useState } from "react";

const FADE_BUFFER_PX = 16;

function readHeaderBottom() {
  const header = document.querySelector(".app-header");
  return header?.getBoundingClientRect().bottom ?? 72;
}

function readUpcomingTrackHeight(stripRoot: Element | null) {
  const upcoming = stripRoot?.querySelector(".match-board-strip-track--upcoming");
  if (!upcoming || !(upcoming instanceof HTMLElement)) return 0;
  return upcoming.getBoundingClientRect().height;
}

function resolvePredictionsFadeTarget() {
  return (
    document.querySelector<HTMLElement>(".predictions-panel") ??
    document.getElementById("predictions") ??
    document.querySelector<HTMLElement>(".current-event-predictions-tab")
  );
}

function computePlayedStripOpacity(playedTrack: HTMLElement) {
  const predictions = resolvePredictionsFadeTarget();
  if (!predictions) return 1;

  const stripRoot = playedTrack.closest(".match-board-strip");
  const headerBottom = readHeaderBottom();
  const upcomingHeight = readUpcomingTrackHeight(stripRoot);
  const playedHeight = Math.max(playedTrack.offsetHeight, playedTrack.getBoundingClientRect().height);
  const fadeRange = Math.max(playedHeight + FADE_BUFFER_PX, 64);
  const stickyBottom = headerBottom + upcomingHeight;
  const predictionsTop = predictions.getBoundingClientRect().top;
  const distance = predictionsTop - stickyBottom;

  if (distance >= fadeRange) return 1;
  if (distance <= 0) return 0;
  return distance / fadeRange;
}

/**
 * Fades and collapses the played-matches rail as the predictions section scrolls
 * under the sticky header strip.
 */
export function usePlayedMatchesStripFade(enabled: boolean, watchKey: string, active: boolean) {
  const [playedTrack, setPlayedTrack] = useState<HTMLElement | null>(null);
  const [opacity, setOpacity] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const playedTrackRef = useCallback((node: HTMLDivElement | null) => {
    setPlayedTrack(node);
  }, []);

  useEffect(() => {
    if (!enabled || !active || !playedTrack) {
      setOpacity(1);
      setCollapsed(false);
      return;
    }

    let frame = 0;
    let predictionsObserver: MutationObserver | null = null;

    function update() {
      const track = playedTrack;
      if (!track || !track.isConnected) return;
      const nextOpacity = computePlayedStripOpacity(track);
      setOpacity(nextOpacity);
      setCollapsed(nextOpacity <= 0.02);
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    function attachPredictionsWatch() {
      predictionsObserver?.disconnect();
      predictionsObserver = null;

      const main = document.getElementById("main-content");
      if (!main) return;

      predictionsObserver = new MutationObserver(scheduleUpdate);
      predictionsObserver.observe(main, { childList: true, subtree: true });
    }

    update();
    attachPredictionsWatch();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    document.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      predictionsObserver?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      document.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
    };
  }, [active, enabled, playedTrack, watchKey]);

  return { playedTrackRef, opacity, collapsed };
}
