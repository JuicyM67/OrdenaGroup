"use client";

// Knappen "Darme de baja" (WP-31, F14): en server action bunden till token:en
// i stängningen (samma mönster som `InvitationForm`/`cancelReservation` i
// `/r/[token]`) — en riktig "use server"-funktion som tar token som ett
// klientkontrollerat argument skulle låta vem som helst avregistrera en
// annan kund. POST, aldrig en GET-effekt (regel: avregistrering är en
// handling, inte en sidladdning).
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { baja } from "@/i18n";

type Estado = "idle" | "enviando" | "listo" | "error";

/** Samma form som `UnsubscribeResult` (`@/server/campaigns/baja.ts`), men
 * utan att importera från `@/server/*` härifrån (gränstest: en "use
 * client"-fil får aldrig referera `@/server/*`, inte ens bara en typ). */
type UnsubscribeOutcome = { ok: true } | { ok: false; code: string };

export function BajaForm({
  negocio,
  alreadyOptedOut,
  onUnsubscribe,
}: {
  negocio: string;
  alreadyOptedOut: boolean;
  onUnsubscribe: () => Promise<UnsubscribeOutcome>;
}) {
  const [estado, setEstado] = useState<Estado>(
    alreadyOptedOut ? "listo" : "idle",
  );

  async function handleClick() {
    setEstado("enviando");
    try {
      const result = await onUnsubscribe();
      setEstado(result.ok ? "listo" : "error");
    } catch {
      setEstado("error");
    }
  }

  if (estado === "listo") {
    return <p className="text-15 text-ink-soft">{baja.listo({ negocio })}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-15 text-ink-soft">{baja.cuerpo({ negocio })}</p>
      {estado === "error" ? (
        <p className="text-13 text-alert">{baja.error}</p>
      ) : null}
      <Button
        type="button"
        size="xl"
        disabled={estado === "enviando"}
        onClick={() => {
          void handleClick();
        }}
      >
        {baja.cta}
      </Button>
    </div>
  );
}
