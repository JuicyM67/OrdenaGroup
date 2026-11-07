"use client";

// WP-86 (D-072): kundkortets paket — kvarvarande sessioner, giltighet,
// användningar och "Vender paquete"/"Anular venta". Läggs in i
// `CustomerDetailScreen` via propen `packagesCard` (egen fil så att kundkortet
// bara får en rad till). Datum formateras via `src/lib/format/dates.ts`.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { caja, comun, paquetes } from "@/i18n";
import { APP_TZ, formatDate, parseInstant } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import { SellPackageDialog } from "./sell-package-dialog";
import {
  formatExpiry,
  packageErrorText,
  type CustomerPackage,
  type PackageActionResult,
  type PackageTemplate,
  type SellPackageActions,
} from "./types";

function dateLabel(iso: string): string {
  const parsed = parseInstant(iso);
  if (!parsed.ok) return iso;
  return formatDate(parsed.value, APP_TZ, "weekdayDayMonthShort");
}

const STATE_CHIP: Record<
  CustomerPackage["state"],
  { label: string; tone: "success" | "neutral" | "pending" }
> = {
  active: { label: paquetes.cliente.activo, tone: "success" },
  expired: { label: paquetes.cliente.vencido, tone: "pending" },
  used_up: { label: paquetes.cliente.agotado, tone: "neutral" },
  voided: { label: paquetes.cliente.anulado, tone: "neutral" },
};

export type CustomerPackagesCardProps = {
  customer: { id: string; name: string };
  packages: CustomerPackage[];
  /** Behörighet och plan för att sälja. */
  canSell: boolean;
  /** Behörighet för "Anular venta". */
  canVoid: boolean;
  /** Utan kassan (`can_view_reports`) visas inga belopp. */
  showMoney: boolean;
  templates: PackageTemplate[];
  sellActions: SellPackageActions;
  onVoid: (input: {
    customerPackageId: string;
  }) => Promise<PackageActionResult>;
};

export function CustomerPackagesCard({
  customer,
  packages,
  canSell,
  canVoid,
  showMoney,
  templates,
  sellActions,
  onVoid,
}: CustomerPackagesCardProps) {
  const router = useRouter();
  const [sellOpen, setSellOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<CustomerPackage | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [sold, setSold] = useState(false);

  async function handleVoid() {
    if (!voidTarget) return;
    const result = await onVoid({ customerPackageId: voidTarget.id });
    if (result.ok) {
      setVoidTarget(null);
      setVoidError(null);
      router.refresh();
    } else {
      setVoidError(packageErrorText(result.code));
    }
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-15 font-bold text-ink">
          {paquetes.cliente.titulo}
        </h2>
        {canSell ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setSold(false);
              setSellOpen(true);
            }}
          >
            {paquetes.vender.cta}
          </Button>
        ) : null}
      </div>
      {sold ? (
        <p role="status" className="text-13 text-muted">
          {paquetes.vender.vendido}
        </p>
      ) : null}

      {packages.length === 0 ? (
        <p className="text-13 text-muted">{paquetes.cliente.vacio}</p>
      ) : (
        <ul className="flex flex-col">
          {packages.map((p) => {
            const chip = STATE_CHIP[p.state];
            const uses = p.uses.filter((u) => !u.reversed);
            return (
              <li
                key={p.id}
                className="flex flex-col gap-1.5 border-b border-line py-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-14 font-bold text-ink">{p.name}</span>
                  <Chip tone={chip.tone} size="sm">
                    {chip.label}
                  </Chip>
                </div>
                {p.state !== "voided" ? (
                  <span className="text-14 font-semibold text-ink">
                    {paquetes.cliente.quedan({
                      n: p.remaining,
                      total: p.sessionsTotal,
                    })}
                  </span>
                ) : null}
                <span className="text-13 text-muted">
                  {p.serviceNames.join(", ")} ·{" "}
                  {p.expiresOn
                    ? paquetes.cliente.vence({
                        fecha: formatExpiry(p.expiresOn),
                      })
                    : paquetes.cliente.sinVencimiento}
                </span>
                <span className="text-12 text-muted">
                  {showMoney
                    ? paquetes.cliente.vendidoEl({
                        fecha: dateLabel(p.soldAt),
                        metodo: caja.metodo[p.paymentMethod],
                        monto: formatMoney(p.priceClp),
                      })
                    : paquetes.cliente.vendidoElSinMonto({
                        fecha: dateLabel(p.soldAt),
                      })}
                </span>
                {uses.length > 0 ? (
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {uses.slice(0, 10).map((u) => (
                      <li key={u.moveId} className="text-12 text-muted">
                        {paquetes.cliente.usoEl({
                          fecha: dateLabel(u.at),
                          servicio: u.serviceName ?? "—",
                        })}
                        {u.noShow ? ` · ${paquetes.cliente.usoNoVino}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {canVoid && p.canVoid ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      setVoidError(null);
                      setVoidTarget(p);
                    }}
                  >
                    {paquetes.cliente.anular}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canSell ? (
        <SellPackageDialog
          open={sellOpen}
          onOpenChange={setSellOpen}
          templates={templates}
          customer={customer}
          actions={sellActions}
          onSold={() => {
            setSold(true);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={voidTarget != null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        title={paquetes.cliente.anularTitulo}
        body={
          <>
            {paquetes.cliente.anularCuerpo}
            {voidError ? (
              <span role="alert" className="mt-2 block text-ink">
                {voidError}
              </span>
            ) : null}
          </>
        }
        confirmLabel={paquetes.cliente.anular}
        cancelLabel={comun.volver}
        onConfirm={handleVoid}
      />
    </Card>
  );
}
