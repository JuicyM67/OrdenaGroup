"use client";

// WP-82 (D-067): en widget-iframe rapporterar sin innehållshöjd till loadern på
// företagets sida (`{type:"resize"}`, se src/lib/widgets/protocol.ts). Utanför en iframe
// (direktbesök, förhandsvisning utan ram) gör `postWidgetMessage` ingenting.
import { type RefObject, useEffect } from "react";

import {
  postWidgetMessage,
  WIDGET_MESSAGE_SOURCE,
} from "@/lib/widgets/protocol";

export function useResizeReporter(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof ResizeObserver === "undefined") return;
    let last = -1;
    const report = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      postWidgetMessage({
        source: WIDGET_MESSAGE_SOURCE,
        type: "resize",
        height,
      });
    };
    const observer = new ResizeObserver(report);
    observer.observe(el);
    report();
    return () => {
      observer.disconnect();
    };
  }, [ref, enabled]);
}
