// WP-82 (D-067): ramen runt den inbäddade bokningen. Ljust tema = canvas-panel, mörkt tema =
// mörk ram runt canvas-panelen (samma uttryck som appens skal). Dialogläget (`?dialog=1`) fyller
// hela iframen; loadern ritar dialogens hörn. Varumärkesraden finns i båda lägena.
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import type { WidgetTheme } from "@/lib/validation/widgets";

import { WidgetBrandLine } from "./brand-line";
import { WidgetSurface } from "./widget-surface";

export function EmbeddedBookingFrame({
  theme,
  dialog,
  children,
}: {
  theme: WidgetTheme;
  dialog: boolean;
  children: ReactNode;
}) {
  const dark = theme === "dark";
  return (
    // Alltid `light` på ytan: `data-surface="dark"` slår igenom på alla underliggande
    // komponenter (`on-dark:`-varianterna) och bokningen ligger på en ljus canvas-panel.
    <WidgetSurface
      theme="light"
      reportResize={!dialog}
      className={cn(dialog && "min-h-dvh bg-canvas")}
    >
      <div
        className={cn(
          dark && !dialog && "rounded-shell bg-dark p-2",
          !dark && !dialog && "rounded-shell bg-canvas",
        )}
      >
        <div
          className={cn(
            !dialog && "overflow-hidden rounded-hero bg-canvas text-ink",
          )}
        >
          {children}
        </div>
      </div>
      <WidgetBrandLine
        theme={dialog ? "light" : theme}
        className={cn("px-2 pb-1", dialog ? "pt-0 pb-5 text-center" : "pt-2")}
      />
    </WidgetSurface>
  );
}
