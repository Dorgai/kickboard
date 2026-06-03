/** Fireworks + confetti while the welcome dialog is open (new joiners). */

const WELCOME_Z_INDEX = 10060;

const WELCOME_COLORS = [
  "#16a34a",
  "#22c55e",
  "#86efac",
  "#fbbf24",
  "#f59e0b",
  "#fde047",
  "#ffffff",
  "#38bdf8"
];

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function startWelcomeFireworks(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => undefined;

  let cancelled = false;
  let intervalId: number | undefined;
  const timeoutIds: number[] = [];

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      if (!cancelled) fn();
    }, ms);
    timeoutIds.push(id);
  }

  void import("canvas-confetti").then(({ default: confetti }) => {
    if (cancelled) return;

    const defaults = {
      zIndex: WELCOME_Z_INDEX,
      disableForReducedMotion: true,
      colors: WELCOME_COLORS
    };

    function burst(options: Parameters<typeof confetti>[0]) {
      if (cancelled) return;
      void confetti({ ...defaults, ...options });
    }

    function cannon(originX: number, angle: number, particleCount: number) {
      burst({
        particleCount,
        angle,
        spread: 58,
        startVelocity: 58,
        origin: { x: originX, y: 0.72 },
        gravity: 0.9,
        ticks: 200
      });
    }

    function fireworkAt(x: number) {
      burst({
        particleCount: 42,
        spread: 360,
        startVelocity: 28,
        origin: { x, y: randomInRange(0.18, 0.42) },
        gravity: 0.65,
        scalar: 0.95,
        ticks: 120
      });
      burst({
        particleCount: 18,
        spread: 100,
        startVelocity: 22,
        origin: { x, y: 0.55 },
        shapes: ["star"],
        scalar: 1.1
      });
    }

    // Opening salvo
    cannon(0.12, 62, 70);
    cannon(0.88, 118, 70);
    schedule(() => {
      burst({ particleCount: 120, spread: 100, origin: { y: 0.55 }, startVelocity: 48 });
      fireworkAt(0.5);
    }, 180);
    schedule(() => {
      cannon(0.28, 75, 55);
      cannon(0.72, 105, 55);
    }, 420);

    const durationMs = 5200;
    const endAt = Date.now() + durationMs;

    intervalId = window.setInterval(() => {
      if (cancelled) return;
      const timeLeft = endAt - Date.now();
      if (timeLeft <= 0) {
        if (intervalId) window.clearInterval(intervalId);
        intervalId = undefined;
        return;
      }

      const intensity = timeLeft / durationMs;
      fireworkAt(randomInRange(0.15, 0.85));
      burst({
        particleCount: Math.floor(24 * intensity) + 8,
        spread: randomInRange(50, 120),
        origin: { x: randomInRange(0.2, 0.8), y: randomInRange(0.35, 0.55) },
        startVelocity: randomInRange(26, 44),
        scalar: randomInRange(0.85, 1.15)
      });
    }, 380);
  });

  return () => {
    cancelled = true;
    if (intervalId !== undefined) window.clearInterval(intervalId);
    for (const id of timeoutIds) window.clearTimeout(id);
    timeoutIds.length = 0;
  };
}
