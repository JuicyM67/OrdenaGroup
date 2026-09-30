"use client";

// WP-47 (tillägg A): hovertooltip för ikonknappar utan synlig text (NavRail/AgendaRail,
// topprad). `label` är redan `aria-label` på knappen (regel "riktiga knappar"), så
// tooltipen är rent visuell — `Tooltip.Provider` behövs bara en gång per träd, men Radix
// tillåter flera nästlade (delayDuration ärvs från den närmaste), så varje `Tooltip`
// bär sin egen provider för att komponenten ska gå att använda fristående.
import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export type TooltipProps = {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

export function Tooltip({ label, children, side = "right" }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={8}
            className="z-30 rounded-control bg-ink px-2.5 py-1.5 text-12 font-semibold text-on-dark shadow-popover"
          >
            {label}
            <RadixTooltip.Arrow className="fill-ink" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
