// Stegchecklista (WP-92, ägarens referens: "Hey, let's start now!"-kortet): rund bock
// för klara steg, numrerad ring för det aktiva, siffra för resten. Två toner: `dark`
// (onboardingens stegpanel, laddningsvyerna) och `light` (kortet på Start).
// Ren visning — länkar bara när `href` finns (Start-kortet).
import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";

export type ChecklistItem = {
  key: string;
  label: string;
  state: "done" | "current" | "todo";
  href?: string;
};

export function SetupChecklist({
  items,
  tone,
  className,
}: {
  items: readonly ChecklistItem[];
  tone: "dark" | "light";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <ol className={cn("flex flex-col gap-1", className)}>
      {items.map((item, i) => {
        const row = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-12 font-bold transition-colors duration-300 ease-out",
                item.state === "done" && "bg-lime text-ink",
                item.state === "current" &&
                  (dark
                    ? "border-2 border-lime text-lime"
                    : "border-2 border-ink text-ink"),
                item.state === "todo" &&
                  (dark
                    ? "bg-dark-2 text-on-dark-muted"
                    : "bg-canvas text-muted"),
              )}
            >
              {item.state === "done" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "flex-1 text-14",
                item.state === "current" ? "font-bold" : "font-semibold",
                dark
                  ? item.state === "todo"
                    ? "text-on-dark-muted"
                    : "text-on-dark"
                  : item.state === "todo"
                    ? "text-ink-soft"
                    : "text-ink",
                item.state === "done" && !dark && "text-muted line-through",
              )}
            >
              {item.label}
            </span>
            {item.href && item.state !== "done" ? (
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-muted"
                strokeWidth={2}
              />
            ) : null}
          </>
        );
        return (
          <li
            key={item.key}
            aria-current={item.state === "current" ? "step" : undefined}
          >
            {item.href && item.state !== "done" ? (
              <Link
                href={item.href}
                prefetch={false}
                className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-ink"
              >
                {row}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-2 py-2">{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
