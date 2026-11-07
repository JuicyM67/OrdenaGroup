"use client";

// WP-88 (D-074): kunden läser och godkänner en consentimiento — på sin länk
// `/r/[token]` och på engångslänken i salongen (`/r/firma/[token]`). Rutan är
// aldrig förkryssad och knappen fungerar först när rutan är ikryssad.
import { useState } from "react";

import { ConsentCheckbox } from "@/components/booking/consent-checkbox";
import type { PublicConsent } from "@/components/booking/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { consentimientoInformado } from "@/i18n";

export type ConsentAcceptResult =
  | { ok: true }
  | { ok: false; code: "outdated" | "not_found" | "invalid" | "rate_limited" };

export function ConsentAcceptCard({
  consent,
  businessName,
  onAccept,
  defaultOpen = false,
}: {
  consent: PublicConsent;
  businessName: string;
  onAccept: () => Promise<ConsentAcceptResult>;
  /** Visa texten direkt (engångslänken i salongen). */
  defaultOpen?: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<"outdated" | "generic" | null>(null);

  async function handleAccept() {
    if (!checked || busy) return;
    setBusy(true);
    setError(null);
    const r = await onAccept();
    setBusy(false);
    if (r.ok) setDone(true);
    else setError(r.code === "outdated" ? "outdated" : "generic");
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-16 font-bold text-ink">{consent.title}</h2>
        <p className="text-13 text-muted">
          {consentimientoInformado.pendientesAyuda({ negocio: businessName })}
        </p>
      </div>
      <details open={defaultOpen}>
        <summary className="cursor-pointer text-13 font-semibold text-ink underline underline-offset-2">
          {consentimientoInformado.ver}
        </summary>
        <p className="mt-2 max-h-96 overflow-y-auto border-l-2 border-line pl-3 text-14 leading-body whitespace-pre-line text-ink">
          {consent.body}
        </p>
      </details>
      {done ? (
        <p role="status" className="text-14 font-semibold text-ink">
          {consentimientoInformado.aceptado}
        </p>
      ) : (
        <>
          <ConsentCheckbox checked={checked} onChange={setChecked} required>
            {consentimientoInformado.acepto({ titulo: consent.title })}
          </ConsentCheckbox>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="self-start"
            disabled={!checked || busy}
            onClick={() => {
              void handleAccept();
            }}
          >
            {consentimientoInformado.ctaAceptar}
          </Button>
        </>
      )}
      {error ? (
        <p role="alert" className="text-13 text-ink">
          {error === "outdated"
            ? consentimientoInformado.desactualizado
            : consentimientoInformado.error}
        </p>
      ) : null}
    </Card>
  );
}
