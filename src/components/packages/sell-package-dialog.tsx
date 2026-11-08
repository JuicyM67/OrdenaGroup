"use client";

// WP-86 (D-072): "Vender paquete" — kundkortet (kunden given) och Caja
// (kunden söks i dialogen). Samma Radix Dialog-mönster som
// `caja/mark-paid-dialog.tsx` (bottenark på mobil, centrerad från `sm`).
// Klienten väljer bara kund, mall och metod; namn, sessioner, pris och
// giltighet sätts av databasen från mallen.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { appHref } from "@/config/routes";
import { caja, comun, paquetes } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { formatPhone, isE164 } from "@/lib/format/phone";

import {
  packageErrorText,
  type PackageCustomerHit,
  type PackageManualMethod,
  type PackageTemplate,
  type SellPackageActions,
} from "./types";

const METHODS: readonly PackageManualMethod[] = [
  "cash",
  "card_terminal",
  "transfer",
];

export type SellPackageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Aktiva mallar. */
  templates: readonly PackageTemplate[];
  /** Kundkortet: kunden är given. Caja: `undefined` → sök. */
  customer?: { id: string; name: string };
  actions: SellPackageActions;
  onSold?: () => void;
};

export function SellPackageDialog({
  open,
  onOpenChange,
  templates,
  customer,
  actions,
  onSold,
}: SellPackageDialogProps) {
  const descriptionId = useId();
  const { panelRef, handleProps } = useSheetDrag(() => onOpenChange(false));
  const [picked, setPicked] = useState<PackageCustomerHit | null>(null);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<PackageCustomerHit[] | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(
    () => templates[0]?.id ?? null,
  );
  const [method, setMethod] = useState<PackageManualMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const target = customer ?? picked;
  const template = templates.find((t) => t.id === templateId) ?? null;
  const searchCustomers = actions.searchCustomers;

  // Sök med en kort fördröjning; svar för en gammal söktext ignoreras.
  useEffect(() => {
    if (customer || !searchCustomers || picked) return;
    const term = search.trim();
    if (term.length < 2) return;
    let stale = false;
    const t = setTimeout(() => {
      void searchCustomers(term).then((r) => {
        if (!stale) setHits(r);
      });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [customer, searchCustomers, picked, search]);

  function reset() {
    setPicked(null);
    setSearch("");
    setHits(null);
    setTemplateId(templates[0]?.id ?? null);
    setMethod("cash");
    setError(null);
  }

  async function handleConfirm() {
    if (!target || !templateId || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await actions.sell({
      customerId: target.id,
      templateId,
      method,
    });
    setSubmitting(false);
    if (result.ok) {
      reset();
      onOpenChange(false);
      onSold?.();
      return;
    }
    setError(packageErrorText(result.code));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
          <Dialog.Content
            ref={panelRef}
            aria-describedby={descriptionId}
            className="flex max-h-full w-full max-w-sm translate-y-0 flex-col gap-4 overflow-y-auto rounded-t-panel bg-canvas p-6 shadow-popover transition-transform duration-200 ease-out sm:rounded-panel sheet-closed:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong sm:hidden"
              {...handleProps}
            />
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold">
                {paquetes.vender.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description
              id={descriptionId}
              className="text-13 text-muted"
            >
              {paquetes.vender.descripcion}
            </Dialog.Description>

            {templates.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-14 text-ink">
                  {paquetes.vender.sinPlantillas}
                </p>
                <Button
                  asChild
                  variant="secondary"
                  size="md"
                  className="self-start"
                >
                  <Link href={appHref("appAjustesPaquetes")}>
                    {paquetes.vender.irAjustes}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {target ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-13 font-semibold text-muted">
                        {paquetes.vender.clienteLabel}
                      </span>
                      <span className="text-15 font-bold text-ink">
                        {target.name}
                      </span>
                    </div>
                    {!customer ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPicked(null);
                          setHits(null);
                        }}
                      >
                        {paquetes.vender.cambiarCliente}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <TextField
                      label={paquetes.vender.buscarLabel}
                      hint={paquetes.vender.buscarAyuda}
                      value={search}
                      autoComplete="off"
                      onChange={(e) => {
                        setSearch(e.target.value);
                        if (e.target.value.trim().length < 2) setHits(null);
                      }}
                    />
                    {hits && hits.length === 0 ? (
                      <p className="text-13 text-muted">
                        {paquetes.vender.sinResultados}
                      </p>
                    ) : null}
                    {hits && hits.length > 0 ? (
                      <ul className="flex flex-col">
                        {hits.map((h) => (
                          <li key={h.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start gap-0.5 rounded-control px-3 py-2 text-left hover:bg-surface"
                              onClick={() => setPicked(h)}
                            >
                              <span className="text-14 font-semibold text-ink">
                                {h.name}
                              </span>
                              {h.phone && isE164(h.phone) ? (
                                <span className="text-12 text-muted">
                                  {formatPhone(h.phone)}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-13 font-semibold text-ink">
                    {paquetes.vender.paqueteLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <Pill
                        key={t.id}
                        selected={templateId === t.id}
                        onClick={() => setTemplateId(t.id)}
                      >
                        {t.name}
                      </Pill>
                    ))}
                  </div>
                  {template ? (
                    <span className="text-13 text-muted">
                      {paquetes.ajustes.resumen({
                        sesiones: template.sessions,
                        precio: formatMoney(template.priceClp),
                      })}{" "}
                      ·{" "}
                      {template.validityDays === null
                        ? paquetes.ajustes.sinVencimiento
                        : paquetes.ajustes.venceEnDias({
                            dias: template.validityDays,
                          })}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-13 font-semibold text-ink">
                    {paquetes.vender.metodoLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {METHODS.map((m) => (
                      <Pill
                        key={m}
                        selected={method === m}
                        onClick={() => setMethod(m)}
                      >
                        {caja.metodo[m]}
                      </Pill>
                    ))}
                  </div>
                </div>

                {template ? (
                  <p className="font-display text-18 font-semibold text-ink">
                    {paquetes.vender.total({
                      monto: formatMoney(template.priceClp),
                    })}
                  </p>
                ) : null}
              </>
            )}

            {error ? (
              <p role="alert" className="text-13 text-ink">
                {error}
              </p>
            ) : null}

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                {comun.cerrar}
              </Button>
              {templates.length > 0 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={submitting || !target || !templateId}
                  onClick={() => void handleConfirm()}
                >
                  {paquetes.vender.confirmar}
                </Button>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
