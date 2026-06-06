"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  PREDICTION_SUBMIT_CELEBRATION_EVENT,
  type PredictionSubmitCelebrationDetail
} from "@/lib/predictions/submit-celebration";

type FlyingBall = {
  id: string;
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  delayMs: number;
  size: number;
};

const BALL_COUNT = 3;
const FLIGHT_MS = 1150;

function ballsFromOrigin(detail: PredictionSubmitCelebrationDetail): FlyingBall[] {
  const { originX, originY } = detail;
  return Array.from({ length: BALL_COUNT }, (_, index) => {
    const spread = index === 0 ? 0 : (index - 1) * 22;
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      originX: originX + spread,
      originY,
      dx: window.innerWidth - originX + 56 + spread * 0.6,
      dy: -(originY + 72 + index * 18),
      delayMs: index * 75,
      size: index === 0 ? 30 : 22
    };
  });
}

export function PredictionSubmitCelebration() {
  const [balls, setBalls] = useState<FlyingBall[]>([]);

  useEffect(() => {
    function onCelebrate(event: Event) {
      const detail = (event as CustomEvent<PredictionSubmitCelebrationDetail>).detail;
      if (!detail) return;

      const spawned = ballsFromOrigin(detail);
      setBalls((current) => [...current, ...spawned]);

      window.setTimeout(() => {
        setBalls((current) => current.filter((ball) => !spawned.some((entry) => entry.id === ball.id)));
      }, FLIGHT_MS + 320 + spawned[spawned.length - 1]!.delayMs);
    }

    window.addEventListener(PREDICTION_SUBMIT_CELEBRATION_EVENT, onCelebrate);
    return () => window.removeEventListener(PREDICTION_SUBMIT_CELEBRATION_EVENT, onCelebrate);
  }, []);

  if (typeof document === "undefined" || balls.length === 0) return null;

  return createPortal(
    <div aria-hidden className="prediction-submit-fx-layer">
      {balls.map((ball) => (
        <span
          key={ball.id}
          className="prediction-submit-fx-ball"
          style={
            {
              "--fx-dx": `${ball.dx}px`,
              "--fx-dy": `${ball.dy}px`,
              "--fx-size": `${ball.size}px`,
              animationDelay: `${ball.delayMs}ms`,
              left: ball.originX,
              top: ball.originY
            } as CSSProperties
          }
        />
      ))}
    </div>,
    document.body
  );
}
