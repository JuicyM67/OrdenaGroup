// WP-73 (D-048): Inställningar → Plan. Aktuell plan, användning denna månad
// (konton, aktiva tjänster, sms i SE) och vad planen innehåller. Ingen
// "use client": allt räknas på servern (`loadPlanUsage`). Själva bytet av
// plan (Stripe Billing) finns inte än — "Byt plan" går till prissidan och
// "Kontakta oss" till kontaktsidan (IDEAS/BACKLOG).
import { Check, Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strokeCard } from "@/components/ui/icons";
import { market } from "@/config/brand";
import { can, type BusinessPlan, type Feature } from "@/config/plans";
import { href } from "@/config/routes";
import { planes } from "@/i18n";

export type PlanSectionData = {
  plan: BusinessPlan;
  staff: { used: number; limit: number | null };
  services: { used: number; limit: number | null };
  sms: { used: number; limit: number | null };
};

const FEATURES: readonly Feature[] = [
  "unbranded",
  ...(market === "SE" ? (["online_payment"] as const) : []),
  "waitlist",
  "flash",
  "campaigns",
  "full_reports",
  "staff_accounts",
  "priority_support",
];

function usageText(u: { used: number; limit: number | null }): string {
  return u.limit === null
    ? planes.ajustes.sinLimite({ usado: u.used })
    : planes.ajustes.deMax({ usado: u.used, max: u.limit });
}

function UsageRow({
  label,
  usage,
}: {
  label: string;
  usage: { used: number; limit: number | null };
}) {
  const full = usage.limit !== null && usage.used >= usage.limit;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <span className="text-14 text-ink">{label}</span>
      <span
        className={
          full
            ? "text-14 font-bold text-ink"
            : "text-14 font-semibold text-muted"
        }
      >
        {usageText(usage)}
      </span>
    </div>
  );
}

export function PlanSection({
  data,
  hideSmsNotice = false,
}: {
  data: PlanSectionData;
  /** WP-76: sms-kortet ovanför har egen varning (D-053). */
  hideSmsNotice?: boolean;
}) {
  const smsOut =
    !hideSmsNotice &&
    market === "SE" &&
    data.sms.limit !== null &&
    data.sms.used >= data.sms.limit;
  return (
    <div className="flex flex-col gap-5">
      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-13 text-muted">{planes.ajustes.planActual}</p>
          <h2 className="text-24 font-bold text-ink">
            {planes.nombres[data.plan]}
          </h2>
        </div>
        <div className="flex flex-col">
          <p className="text-14 font-semibold text-ink">
            {planes.ajustes.usoTitulo}
          </p>
          <UsageRow label={planes.ajustes.cuentas} usage={data.staff} />
          <UsageRow label={planes.ajustes.servicios} usage={data.services} />
          {market === "SE" ? (
            <UsageRow label={planes.ajustes.sms} usage={data.sms} />
          ) : null}
        </div>
        {smsOut ? (
          <p
            role="status"
            className="rounded-card bg-peach p-4 text-13 text-ink"
          >
            {planes.ajustes.smsAgotados}
          </p>
        ) : null}
      </Card>

      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <h2 className="text-18 font-bold text-ink">{planes.ajustes.incluye}</h2>
        <ul className="flex flex-col gap-2">
          {FEATURES.map((f) => {
            const on = can(data.plan, f);
            return (
              <li key={f} className="flex items-center gap-3 text-14">
                {on ? (
                  <Check
                    aria-hidden="true"
                    className="size-4.5 shrink-0 text-success-fg"
                    strokeWidth={strokeCard}
                  />
                ) : (
                  <Lock
                    aria-hidden="true"
                    className="size-4.5 shrink-0 text-muted"
                    strokeWidth={strokeCard}
                  />
                )}
                <span className={on ? "text-ink" : "text-muted"}>
                  {planes.funciones[f]}
                  {on ? null : (
                    <span className="sr-only">
                      {" "}
                      · {planes.ajustes.noIncluye}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <p className="text-14 leading-body text-ink">
          {planes.ajustes.cambiarAyuda}
        </p>
        <p className="text-13 leading-body text-muted">
          {planes.ajustes.pausado}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="primary" size="md">
            <Link href={href("precios")}>{planes.ajustes.cambiarPlan}</Link>
          </Button>
          <Button asChild variant="secondary" size="md">
            <Link href={href("contacto")}>{planes.ajustes.contacto}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
