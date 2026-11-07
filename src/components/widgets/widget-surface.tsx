"use client";

// WP-82 (D-067): ytan som varje widget ritas på. Genomskinlig (widgeten smälter in i
// företagets sida); `theme="dark"` sätter `data-surface="dark"` så att knappar och
// fokusringar byter till mörka varianter. Rapporterar höjden till loadern.
import { type ReactNode, useRef } from "react";

import { cn } from "@/components/ui/cn";
import type { WidgetTheme } from "@/lib/validation/widgets";

import { useResizeReporter } from "./use-resize-reporter";

export function WidgetSurface({
  theme,
  reportResize = true,
  className,
  children,
}: {
  theme: WidgetTheme;
  /** `false` i dialogläget (loadern äger höjden). */
  reportResize?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useResizeReporter(ref, reportResize);
  return (
    <div
      ref={ref}
      data-surface={theme === "dark" ? "dark" : undefined}
      className={cn(
        "flow-root font-sans",
        theme === "dark" ? "text-on-dark" : "text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
