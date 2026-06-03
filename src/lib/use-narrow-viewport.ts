"use client";

import { useEffect, useState } from "react";

/** True at viewport widths where we use compact touch layouts (mobile + tablet). */
export function useNarrowViewport(maxWidthPx = 1023) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = `(max-width: ${maxWidthPx}px)`;
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [maxWidthPx]);

  return narrow;
}
