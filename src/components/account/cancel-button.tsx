"use client";

// WP-67 (D-054): Avboka från kontot (ägarens beslut 2026-10-10). Två steg
// (bekräfta inline), sedan serverns svar som text. Samma regler som länken
// `/r/[token]`: kräver företaget godkännande blir det en förfrågan.
import { useState } from "react";

import { cuenta } from "@/i18n";

/** Samma form som `AccountCancelResult` (`src/server/accounts/account.ts`) —
 * en klientfil får inte importera från `@/server` (gränstestet). */
type AccountCancelResult =
  { ok: true; pending: boolean } | { ok: false; code: string };

type Fase = "idle" | "confirm" | "sending" | "done" | "error";

export function CancelButton({
  bookingId,
  needsApproval,
  cancelWindowHours,
  onCancel,
  tone = "light",
}: {
  bookingId: string;
  needsApproval: boolean;
  cancelWindowHours: number;
  onCancel: (bookingId: string) => Promise<AccountCancelResult>;
  tone?: "light" | "dark";
}) {
  const t = cuenta.reservas;
  const [fase, setFase] = useState<Fase>("idle");
  const [msg, setMsg] = useState("");

  const base =
    "flex h-11 flex-1 items-center justify-center rounded-control px-4 text-13 font-bold transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40";
  const secondary =
    tone === "dark"
      ? "bg-dark-2 text-on-dark focus-visible:outline-lime"
      : "border border-border bg-surface text-ink focus-visible:outline-ink";

  async function run() {
    setFase("sending");
    let r: AccountCancelResult;
    try {
      r = await onCancel(bookingId);
    } catch {
      r = { ok: false, code: "error" };
    }
    if (r.ok) {
      setMsg(r.pending ? t.solicitada : t.cancelada);
      setFase("done");
    } else {
      setMsg(
        r.code === "outside_cancel_window"
          ? t.fueraDePlazo({ horas: cancelWindowHours })
          : t.errorCancelar,
      );
      setFase("error");
    }
  }

  if (fase === "done" || fase === "error") {
    return (
      <p
        role="status"
        className={`text-13 font-semibold ${tone === "dark" ? "text-on-dark" : "text-ink"}`}
      >
        {msg}
      </p>
    );
  }

  if (fase === "confirm" || fase === "sending") {
    return (
      <div className="flex w-full flex-col gap-2">
        <p
          className={`text-13 ${tone === "dark" ? "text-on-dark-soft" : "text-ink-soft"}`}
        >
          {t.confirmarCancelar}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={fase === "sending"}
            onClick={() => void run()}
            className={`${base} bg-alert text-surface focus-visible:outline-ink`}
          >
            {t.confirmarSi}
          </button>
          <button
            type="button"
            disabled={fase === "sending"}
            onClick={() => setFase("idle")}
            className={`${base} ${secondary}`}
          >
            {t.confirmarNo}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFase("confirm")}
      className={`${base} ${secondary}`}
    >
      {needsApproval ? t.solicitarCancelacion : t.cancelar}
    </button>
  );
}
