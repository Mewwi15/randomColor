"use client";

import { useEffect } from "react";

/** Safari's keyboard can resize the visual viewport without resizing CSS viewport units. */
export function ViewportSize() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      // Preserve normal pinch-to-zoom instead of reflowing the activity while zoomed.
      if (Math.abs(viewport.scale - 1) > 0.01 || viewport.height <= 0) return;
      root.style.setProperty("--app-height", `${Math.round(viewport.height)}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      viewport.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      root.style.removeProperty("--app-height");
    };
  }, []);
  return null;
}
