"use client";

// WP-82 (D-067): knappen "Reservar". I en iframe skickar klicket `open-booking` till loadern,
// som öppnar bokningen i en dialog på företagets sida. Öppnas sidan direkt (inte i en iframe)
// går besökaren i stället till bokningssidan i samma flik.
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { widgets } from "@/i18n";
import type {
  WidgetButtonLabel,
  WidgetSize,
  WidgetTheme,
} from "@/lib/validation/widgets";
import {
  postWidgetMessage,
  WIDGET_MESSAGE_SOURCE,
} from "@/lib/widgets/protocol";

import { WidgetBrandLine } from "./brand-line";

// Alla storlekar är >= 44 px höga (klickyta). Storleken på texten följer höjden.
const SIZE: Record<WidgetSize, string> = {
  small: "h-11 rounded-control px-5 text-14",
  medium: "h-13 rounded-icon px-6 text-15",
  large: "h-15 rounded-icon px-8 text-16",
};

export function BookWidgetButton({
  slug,
  label,
  theme,
  size,
}: {
  slug: string;
  label: WidgetButtonLabel;
  theme: WidgetTheme;
  size: WidgetSize;
}) {
  const dark = theme === "dark";
  function open() {
    if (window.parent === window) {
      window.location.assign(new URL(`/${slug}`, window.location.origin).href);
      return;
    }
    postWidgetMessage({ source: WIDGET_MESSAGE_SOURCE, type: "open-booking" });
  }
  return (
    <div className="flex flex-col items-start gap-2.5 py-1">
      <Button
        variant={dark ? "accent" : "primary"}
        onClick={open}
        className={cn(SIZE[size])}
      >
        <CalendarDays
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={strokeCard}
        />
        {widgets.visitante.boton[label]}
      </Button>
      <WidgetBrandLine theme={theme} />
    </div>
  );
}
