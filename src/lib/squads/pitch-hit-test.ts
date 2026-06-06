import type { SquadLineupSide } from "@/lib/squads/lineup";

export { hitTestPitchRect } from "@/lib/squads/pitch-layout";

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
