// Se DESIGN.md §7 "PageHeader". `desktop`: titel + meta under, `mobile`: meta över titeln
// (ordningen i DOM:en följer referensen, se page-header.test.tsx).
import type { ReactNode } from "react";

import { cn } from "./cn";

export type PageHeaderProps = {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  variant: "desktop" | "mobile";
  className?: string;
};

export function PageHeader({
  title,
  meta,
  actions,
  variant,
  className,
}: PageHeaderProps) {
  const isDesktop = variant === "desktop";
  return (
    <header
      className={cn(
        "flex items-center",
        isDesktop ? "h-13 gap-4" : "gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {!isDesktop && meta ? (
          <div className="text-13 text-muted">{meta}</div>
        ) : null}
        <h1
          className={cn(
            "font-display font-bold tracking-display",
            isDesktop ? "text-32" : "mt-0.5 text-30 font-semibold",
          )}
        >
          {title}
        </h1>
        {isDesktop && meta ? (
          <div className="text-14 text-muted">{meta}</div>
        ) : null}
      </div>
      {actions}
    </header>
  );
}
