"use client";

// WP-82 (D-067): översta raden i bokningsdialogen (`?dialog=1`): titel och egen stäng-knapp.
// Loadern stänger även på Esc och klick utanför, men knappen måste finnas i innehållet så att
// den går att nå med tangentbord och skärmläsare inne i iframen.
import { X } from "lucide-react";
import { useEffect } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { strokeCard } from "@/components/ui/icons";
import { widgets } from "@/i18n";
import {
  postWidgetMessage,
  WIDGET_MESSAGE_SOURCE,
} from "@/lib/widgets/protocol";

export function EmbeddedTopBar() {
  // Fokus ligger i iframen när dialogen öppnas, så Esc når aldrig företagets sida:
  // iframen skickar själv `close` (loadern lyssnar dessutom på Esc på sin sida).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        postWidgetMessage({ source: WIDGET_MESSAGE_SOURCE, type: "close" });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  return (
    <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-center justify-between gap-3 bg-canvas px-5 py-3">
      <p className="font-display text-22 font-semibold tracking-title text-ink">
        {widgets.visitante.dialogo.titulo}
      </p>
      <IconButton
        label={widgets.visitante.dialogo.cerrar}
        tone="surface"
        onClick={() => {
          postWidgetMessage({ source: WIDGET_MESSAGE_SOURCE, type: "close" });
        }}
      >
        <X aria-hidden="true" className="size-5" strokeWidth={strokeCard} />
      </IconButton>
    </div>
  );
}
