"use client";

import { useEffect } from "react";

export function TempoInit() {
  useEffect(() => {
    const init = async () => {
      if (process.env.NEXT_PUBLIC_TEMPO) {
        try {
          const { TempoDevtools } = await import("tempo-devtools");
          // Only initialize if not already initialized to prevent duplicate classes
          if (!document.querySelector("[data-tempo-initialized]")) {
            TempoDevtools.init();
            document.body.setAttribute("data-tempo-initialized", "true");
          }
        } catch (error) {
          console.warn("Failed to initialize Tempo devtools:", error);
        }
      }
    };

    init();
  }, []);

  return null;
}
