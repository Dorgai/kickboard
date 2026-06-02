import type { SquadLineupSide } from "@/lib/squads/lineup";

export function hitTestBenchSide(clientX: number, clientY: number): SquadLineupSide | null {
  const benches = document.querySelectorAll<HTMLElement>("[data-squad-bench-side]");
  for (const bench of benches) {
    const rect = bench.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const side = bench.getAttribute("data-squad-bench-side");
      if (side === "home" || side === "away") return side;
    }
  }
  return null;
}

export function hitTestPitchRect(
  pitch: DOMRect,
  clientX: number,
  clientY: number
): { inside: boolean; side: SquadLineupSide | null } {
  const inside =
    clientX >= pitch.left &&
    clientX <= pitch.right &&
    clientY >= pitch.top &&
    clientY <= pitch.bottom;
  if (!inside) return { inside: false, side: null };
  const yPercent = ((clientY - pitch.top) / pitch.height) * 100;
  return { inside: true, side: yPercent < 50 ? "home" : "away" };
}
