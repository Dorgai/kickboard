"use client";

import { useEffect, useState, type RefObject } from "react";

const PREDICTIONS_ANCHOR_ID = "predictions";
const FADE_BUFFER_PX = 20;

function readHeaderBottom() {
  const header = document.querySelector(".app-header");
  return header?.getBoundingClientRect().bottom ?? 72;
}

function readUpcomingTrackHeight(stripRoot: Element | null) {
  const upcoming = stripRoot?.querySelector(".match-board-strip-track--upcoming");
  if (!upcoming || !(upcoming instanceof HTMLElement)) return 0;
  return upcoming.getBoundingClientRect().height;
}

function computePlayedStripOpacity(playedTrack: HTMLElement) {
  const predictions = document.getElementById(PREDICTIONS_ANCHOR_ID);
  if (!predictions) return 1;

  const stripRoot = playedTrack.closest(".match-board-strip");
  const headerBottom = readHeaderBottom();
  const upcomingHeight = readUpcomingTrackHeight(stripRoot);
  const playedHeight = playedTrack.getBoundingClientRect().height;
  const fadeRange = Math.max(playedHeight + FADE_BUFFER_PX, 48);
  const anchorTop = headerBottom + upcomingHeight;
  const predictionsTop = predictions.getBoundingClientRect().top;
  const delta = predictionsTop - anchorTop;

  if (delta >= fadeRange) return 1;
  if (delta <= 0) return 0;
  return delta / fadeRange;
}

/**
 * Fades and collapses the played-matches rail as the predictions section scrolls
 * under the sticky header strip.
 */
export function usePlayedMatchesStripFade(
  playedTrackRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  watchKey: string
) {
  const [opacity, setOpacity] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpacity(1);
      setCollapsed(false);
      return;
    }

    const playedTrack = playedTrackRef.current;
    if (!playedTrack) return;

    let frame = 0;

    function update() {
      const track = playedTrackRef.current;
      if (!track) return;
      const nextOpacity = computePlayedStripOpacity(track);
      setOpacity(nextOpacity);
      setCollapsed(nextOpacity <= 0.02);
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [enabled, playedTrackRef, watchKey]);

  return { opacity, collapsed };
}
