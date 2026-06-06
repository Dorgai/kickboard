"use client";

import { useEffect, useState } from "react";
import type { PitchLayout } from "@/lib/squads/pitch-layout";

/** Horizontal pitch from tablet width up; vertical on phone. */
export function usePitchLayout(minHorizontalWidthPx = 768): PitchLayout {
  const [layout, setLayout] = useState<PitchLayout>("vertical");

  useEffect(() => {
    const query = `(min-width: ${minHorizontalWidthPx}px)`;
    const media = window.matchMedia(query);
    const update = () => setLayout(media.matches ? "horizontal" : "vertical");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [minHorizontalWidthPx]);

  return layout;
}
