"use client";

import { useEffect, useState } from "react";

/** Mobile/tablet layouts and macOS desktops (Safari/Chrome on Mac). */
export function usePlayedStripScrollFadeViewport() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    function update() {
      const narrow = window.matchMedia("(max-width: 1100px)").matches;
      const macDesktop =
        !narrow &&
        window.matchMedia("(pointer: fine)").matches &&
        /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      setEnabled(narrow || macDesktop);
    }

    update();
    const narrowMedia = window.matchMedia("(max-width: 1100px)");
    narrowMedia.addEventListener("change", update);
    return () => narrowMedia.removeEventListener("change", update);
  }, []);

  return enabled;
}
