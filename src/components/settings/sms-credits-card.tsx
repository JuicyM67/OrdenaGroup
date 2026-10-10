"use client";

// WP-76 (D-053): sms-krediter på Inställningar → Plan (bara SE), efter
// docs/design/reference/sms-krediter/{Main,Mobil}.dc.html (godkänd 2026-10-10).
// Desktop: vänster kolumn = SMS-kortet (kvot + krediter), marknadsföringskortet
// och historiken; höger = "Fyll på SMS" (`grid-cols-list-editor`, samma
// minmax(0,1fr) 380px som D-042). Mobil: samma DOM-ordning som referensen
// (saldo, köp, marknadsföring, historik). Allt räknas på servern; komponenten
// får färdiga siffror/datum och skickar bara paketstorleken till servern.
import { ArrowRight, Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import {
  SMS_CREDIT_PACKAGES,
  SMS_QUOTA_WARN_RATIO,
  smsCreditPrice,
} from "@/config/sms-credits";
import { smsCreditos } from "@/i18n";
import { formatSek } from "@/lib/format/money";

import {
  SmsConfirmDialog,
  SmsDoneDialog,
  SmsUpgradeDialog,
} from "./sms-credits-dialog";

const t = smsCreditos;

/** "1 000" med hårt mellanslag (samma gruppering som `formatSek`). */
function groupInt(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export type SmsHistoryItem = {
  id: string;
  /** "12 augusti 2026" eller "Augusti 2026" (förbrukning per månad). */
  date: string;
  kind: "purchase" | "usage";
  credits: number;
  /** Köp: belopp inkl. moms, formaterat. */
  amount?: string;
  /** Köp: "Återbetald" m.fl. (`null` = betald). */
  statusLabel?: string | null;
  receiptUrl?: string;
};

export type SmsReturnState =
  | { kind: "done"; added: number }
  | { kind: "processing" }
  | { kind: "cancelled" }
  | null;

export type SmsBuyResult =
  { ok: true; url: string } | { ok: false; code: string };

export type SmsCreditsSectionData = {
  planName: string;
  /** "oktober" (gemener, löptext). */
  month: string;
  /** "1 november" */
  refillDate: string;
  quota: { used: number; limit: number | null };
  balance: number;
  /** "12 augusti 2027", `null` utan krediter. */
  oldestExpiry: string | null;
  /** Giltighet för ett köp idag, "10 oktober 2027". */
  validUntil: string;
  history: SmsHistoryItem[];
  /** "Visa alla" (`null` = allt visas redan). */
  historyAllHref: string | null;
  /** Köp möjligt (SE + Stripe + skattesats). */
  purchasable: boolean;
  /** Kampanjer (`null` = planen saknar utskick → uppgraderingsdialog). */
  campaignsHref: string | null;
  campaignsPlanName: string;
  plansHref: string;
  /** "bookingbuddy.se/salong-norrsken" i exempel-sms:et. */
  exampleLink: string;
  returnState: SmsReturnState;
};

function errorText(code: string): string {
  const e = t.errores as Record<string, string>;
  return e[code] ?? t.errores.failed;
}

function QuotaTile({
  data,
  compactLabel,
}: {
  data: SmsCreditsSectionData;
  compactLabel?: boolean;
}) {
  const { used, limit } = data.quota;
  const max = limit ?? 0;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const warn = max > 0 && used >= Math.ceil(max * SMS_QUOTA_WARN_RATIO);
  return (
    <div className="flex flex-col gap-2 rounded-tile bg-surface p-4 lg:gap-3 lg:bg-canvas lg:p-5">
      <span className="text-12 font-semibold text-muted lg:text-13">
        <span className="lg:hidden">{t.incluidosCorto}</span>
        <span className="hidden lg:inline">
          {t.incluidos({ mes: data.month })}
        </span>
      </span>
      {limit === null ? (
        <span className="text-15 font-semibold text-ink">{t.sinLimite}</span>
      ) : max === 0 ? (
        <span className="text-13 leading-relaxed text-muted">
          {t.sinSmsEnPlan}
        </span>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-28 font-bold text-ink lg:text-36">
              {groupInt(used)}
            </span>
            <span className="text-14 font-medium text-muted lg:hidden">
              {t.deMaxCorto({ max: groupInt(max) })}
            </span>
            <span className="hidden text-15 text-muted lg:inline">
              {t.deMax({ max: groupInt(max) })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t.medidor}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(used, max)}
            className="h-1.5 overflow-hidden rounded-badge bg-border lg:h-2"
          >
            <div
              className={cn("h-full", warn ? "bg-full-dot" : "bg-ink")}
              style={{ width: `${pct}%` }}
            />
          </div>
          {compactLabel ? null : (
            <span className="hidden text-13 text-muted lg:inline">
              {t.recarga({ fecha: data.refillDate })}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function CreditsTile({ data }: { data: SmsCreditsSectionData }) {
  return (
    <div className="flex flex-col gap-2 rounded-tile bg-ink p-4 text-on-dark lg:gap-3 lg:p-5">
      <span className="text-12 font-semibold text-on-dark-soft lg:text-13">
        {t.creditos}
      </span>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-baseline lg:gap-1.5">
        <span className="font-display text-28 font-bold text-lime lg:text-36">
          {groupInt(data.balance)}
        </span>
        <span className="text-12 text-on-dark-muted lg:text-15 lg:text-on-dark-soft">
          {t.quedan}
        </span>
      </div>
      {data.oldestExpiry ? (
        <span className="hidden text-13 text-on-dark-muted lg:inline">
          {t.vence({ fecha: data.oldestExpiry })}
        </span>
      ) : null}
      <span className="hidden text-13 text-on-dark-muted lg:inline">
        {t.segmento}
      </span>
    </div>
  );
}

function WarnBanner({ data }: { data: SmsCreditsSectionData }) {
  const { used, limit } = data.quota;
  if (limit === null || limit <= 0) return null;
  if (used < Math.ceil(limit * SMS_QUOTA_WARN_RATIO)) return null;
  const p = { usado: groupInt(used), max: groupInt(limit), mes: data.month };
  const out = used >= limit && data.balance === 0;
  const has = data.balance > 0;
  return (
    <div
      role="status"
      className="flex items-center gap-3.5 rounded-tile bg-peach-50 px-4 py-3.5 text-14 leading-relaxed text-on-peach-soft lg:px-5 lg:py-4"
    >
      <TriangleAlert
        aria-hidden="true"
        className="hidden size-5.5 shrink-0 text-deposit-fg lg:block"
        strokeWidth={2}
      />
      {out ? (
        <p className="flex-1">{t.aviso.agotado}</p>
      ) : (
        <>
          <p className="flex-1 lg:hidden">
            <strong>{t.aviso.corto(p)}</strong>{" "}
            {has ? t.aviso.cortoConCreditos : t.aviso.cortoSinCreditos}
          </p>
          <p className="hidden flex-1 lg:block">
            <strong>{t.aviso.fuerte(p)}</strong>{" "}
            {has ? t.aviso.conCreditos : t.aviso.sinCreditos}
          </p>
        </>
      )}
    </div>
  );
}

function MarketingCard({
  data,
  onUpgrade,
}: {
  data: SmsCreditsSectionData;
  onUpgrade: () => void;
}) {
  const steps = [
    [t.marketing.paso1Fuerte, t.marketing.paso1],
    [t.marketing.paso2Fuerte, t.marketing.paso2],
    [t.marketing.paso3Fuerte, t.marketing.paso3],
  ] as const;
  const cta = (
    <>
      {t.marketing.cta}
      <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
    </>
  );
  const ctaClass = "h-12 self-start rounded-icon px-5 text-15 font-semibold";
  return (
    <section
      aria-labelledby="sms-mk-h"
      className="flex flex-col gap-4 rounded-card bg-lime p-5 text-on-lime-soft lg:p-7"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-12 font-bold tracking-caps uppercase">
          {t.marketing.eyebrow}
        </span>
        <h2
          id="sms-mk-h"
          className="font-display text-22 leading-snug font-bold text-ink lg:text-26"
        >
          {t.marketing.titulo}
        </h2>
      </div>
      <ol className="flex flex-col gap-2.5 text-14 leading-body">
        {steps.map(([strong, rest], i) => (
          <li key={strong} className="flex items-start gap-3">
            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-ink text-13 font-bold text-lime">
              {i + 1}
            </span>
            <span>
              <strong>{strong}</strong> {rest}
            </span>
          </li>
        ))}
      </ol>
      <div className="rounded-control bg-surface/55 px-3.5 py-3 text-13 leading-relaxed text-ink">
        <span className="font-semibold">{t.marketing.ejemploLabel}</span>{" "}
        {t.marketing.ejemplo({ link: data.exampleLink })}{" "}
        <span className="text-on-lime-soft">{t.marketing.ejemploCosto}</span>
      </div>
      {data.campaignsHref ? (
        <Button asChild variant="primary" className={ctaClass}>
          <Link href={data.campaignsHref}>{cta}</Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="primary"
          className={ctaClass}
          onClick={onUpgrade}
        >
          {cta}
        </Button>
      )}
      <span className="text-12">
        {t.marketing.alcance({ n: groupInt(data.balance) })}
      </span>
    </section>
  );
}

function History({ data }: { data: SmsCreditsSectionData }) {
  const delta = (h: SmsHistoryItem) =>
    h.kind === "purchase"
      ? `+${groupInt(h.credits)}`
      : `−${groupInt(h.credits)}`;
  return (
    <section
      aria-labelledby="sms-hist-h"
      className="flex flex-col gap-1 rounded-card bg-surface p-5 lg:gap-4 lg:p-7"
    >
      <h2 id="sms-hist-h" className="font-display text-20 font-bold text-ink">
        {t.historial.titulo}
      </h2>
      {data.history.length === 0 ? (
        <p className="py-3 text-14 text-muted">{t.historial.vacio}</p>
      ) : (
        <>
          {/* Mobil: lista. */}
          <ul className="flex flex-col lg:hidden">
            {data.history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 border-t border-line-strong py-3.5 first:border-t-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-14 font-semibold text-ink">
                    {h.kind === "purchase"
                      ? t.historial.compraCorta({ n: groupInt(h.credits) })
                      : t.historial.uso}
                  </span>
                  <span className="text-12 text-muted">
                    {h.date}
                    {h.statusLabel ? ` · ${h.statusLabel}` : null}
                    {h.receiptUrl ? (
                      <>
                        {" · "}
                        <a
                          href={h.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink underline"
                        >
                          {t.historial.recibo}
                        </a>
                      </>
                    ) : null}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-14 font-semibold",
                    h.kind === "purchase" ? "text-success-fg" : "text-muted",
                  )}
                >
                  {delta(h)}
                </span>
              </li>
            ))}
          </ul>
          {/* Desktop: tabell. */}
          <table className="hidden w-full border-collapse text-14 lg:table">
            <thead>
              <tr className="text-left text-12 text-muted">
                <th scope="col" className="py-2 font-semibold">
                  {t.historial.fecha}
                </th>
                <th scope="col" className="py-2 font-semibold">
                  {t.historial.evento}
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  {t.historial.creditos}
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  {t.historial.recibo}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((h) => (
                <tr key={h.id} className="border-t border-line-strong">
                  <td className="py-3.5 text-ink">{h.date}</td>
                  <td className="py-3.5 text-ink">
                    {h.kind === "purchase"
                      ? t.historial.compra({
                          n: groupInt(h.credits),
                          monto: h.amount ?? "",
                        })
                      : t.historial.uso}
                    {h.statusLabel ? (
                      <span className="text-muted"> · {h.statusLabel}</span>
                    ) : null}
                  </td>
                  <td
                    className={cn(
                      "py-3.5 text-right",
                      h.kind === "purchase"
                        ? "font-semibold text-success-fg"
                        : "text-muted",
                    )}
                  >
                    {delta(h)}
                  </td>
                  <td className="py-3.5 text-right">
                    {h.receiptUrl ? (
                      <a
                        href={h.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink underline hover:text-muted"
                      >
                        {t.historial.ver}
                      </a>
                    ) : (
                      <span className="text-subtle">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {data.historyAllHref ? (
        <Link
          href={data.historyAllHref}
          className="self-start text-13 font-semibold text-ink underline"
        >
          {t.historial.verTodo}
        </Link>
      ) : null}
    </section>
  );
}

export function SmsCreditsSection({
  data,
  onBuy,
}: {
  data: SmsCreditsSectionData;
  onBuy: (packageSize: number) => Promise<SmsBuyResult>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pick, setPick] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(
    data.returnState?.kind === "done" ||
      data.returnState?.kind === "processing",
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const pkg = SMS_CREDIT_PACKAGES[pick] ?? SMS_CREDIT_PACKAGES[0]!;
  const price = smsCreditPrice(pkg);
  const label = t.comprar.paquete({ n: groupInt(pkg.credits) });

  function closeReturn(open: boolean) {
    setDoneOpen(open);
    // Ta bort `?sms=…&session=…` så att dialogen inte visas igen vid omladdning.
    if (!open) router.replace(pathname, { scroll: false });
  }

  async function pay() {
    setBuyError(null);
    const r = await onBuy(pkg.credits);
    if (r.ok) {
      window.location.assign(r.url);
      return;
    }
    setBuyError(errorText(r.code));
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <WarnBanner data={data} />
      {data.returnState?.kind === "cancelled" ? (
        <p
          role="status"
          className="rounded-tile bg-surface px-4 py-3.5 text-14 text-ink"
        >
          {t.cancelado}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-list-editor lg:items-start lg:gap-5">
        {/* SMS: kvot + krediter. */}
        <section
          aria-labelledby="sms-h"
          className="flex flex-col gap-6 lg:col-start-1 lg:rounded-card lg:bg-surface lg:p-7"
        >
          <div className="hidden items-start justify-between gap-4 lg:flex">
            <div className="flex flex-col gap-1.5">
              <h2
                id="sms-h"
                className="font-display text-24 font-bold text-ink"
              >
                {t.titulo}
              </h2>
              <p className="text-14 leading-relaxed text-muted">{t.intro}</p>
            </div>
            <span className="rounded-chip bg-pending-bg px-2.5 py-1.5 text-12 font-semibold whitespace-nowrap text-pending-fg">
              {t.planChip({ plan: data.planName })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:gap-4">
            <QuotaTile data={data} />
            <CreditsTile data={data} />
          </div>
        </section>

        {/* Fyll på SMS. */}
        {data.purchasable ? (
          <aside
            aria-labelledby="sms-buy-h"
            className="flex flex-col gap-3.5 rounded-card bg-surface p-5 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:gap-4.5 lg:p-7"
          >
            <div className="flex flex-col gap-1 lg:gap-1.5">
              <h2
                id="sms-buy-h"
                className="font-display text-20 font-bold text-ink lg:text-22"
              >
                {t.comprar.titulo}
              </h2>
              <p className="text-13 text-muted lg:text-14">
                <span className="lg:hidden">{t.comprar.subCorto}</span>
                <span className="hidden lg:inline">{t.comprar.sub}</span>
              </p>
            </div>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="sr-only">{t.comprar.leyenda}</legend>
              {SMS_CREDIT_PACKAGES.map((p, i) => {
                const on = i === pick;
                return (
                  <button
                    key={p.credits}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPick(i)}
                    className={cn(
                      "flex min-h-16 items-center justify-between gap-3 rounded-control border-2 px-4 py-3 text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      on ? "border-ink bg-canvas" : "border-border bg-surface",
                    )}
                  >
                    <span className="flex flex-col gap-0.5 text-left">
                      <span className="text-15 font-bold lg:text-16">
                        {t.comprar.paquete({ n: groupInt(p.credits) })}
                      </span>
                      <span className="text-12 text-muted lg:text-13">
                        {t.comprar.porSms({
                          precio: formatSek(Math.round(p.netOre / p.credits)),
                        })}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-15 font-bold lg:text-16">
                        {formatSek(p.netOre)}
                      </span>
                      {p.savingOre > 0 ? (
                        <span className="rounded-chip bg-lime-50 px-2 py-0.5 text-11 font-semibold text-on-lime-soft lg:py-0.75 lg:text-12">
                          {t.comprar.ahorro({ monto: formatSek(p.savingOre) })}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </fieldset>
            <dl className="grid grid-cols-2 gap-1.5 border-t border-line-strong pt-3 text-13 lg:gap-2 lg:pt-4 lg:text-14">
              <dt className="text-muted">
                <span className="lg:hidden">{t.comprar.netoCorto}</span>
                <span className="hidden lg:inline">{t.comprar.neto}</span>
              </dt>
              <dd className="text-right text-ink">{formatSek(price.netOre)}</dd>
              <dt className="text-muted">{t.comprar.iva}</dt>
              <dd className="text-right text-ink">{formatSek(price.vatOre)}</dd>
              <dt className="font-bold text-ink">{t.comprar.total}</dt>
              <dd className="text-right font-bold text-ink">
                {formatSek(price.totalOre)}
              </dd>
            </dl>
            <Button
              type="button"
              variant="primary"
              size="2xl"
              className="font-semibold"
              onClick={() => {
                setBuyError(null);
                setConfirmOpen(true);
              }}
            >
              {t.comprar.pagar({ monto: formatSek(price.totalOre) })}
            </Button>
            <p className="flex items-start justify-center gap-2 text-12 leading-relaxed text-muted lg:justify-start">
              <Lock
                aria-hidden="true"
                className="mt-0.5 hidden size-3.5 shrink-0 lg:block"
                strokeWidth={2}
              />
              <span className="lg:hidden">{t.comprar.seguroCorto}</span>
              <span className="hidden lg:inline">{t.comprar.seguro}</span>
            </p>
          </aside>
        ) : (
          <aside
            aria-label={t.comprar.titulo}
            className="rounded-card bg-surface p-5 text-14 text-muted lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:p-7"
          >
            {t.comprar.pronto}
          </aside>
        )}

        <div className="lg:col-start-1">
          <MarketingCard data={data} onUpgrade={() => setUpgradeOpen(true)} />
        </div>
        <div className="lg:col-start-1">
          <History data={data} />
        </div>
      </div>

      <SmsConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        label={label}
        total={formatSek(price.totalOre)}
        vat={formatSek(price.vatOre)}
        validUntil={data.validUntil}
        error={buyError}
        onPay={pay}
      />
      {data.returnState?.kind === "done" ||
      data.returnState?.kind === "processing" ? (
        <SmsDoneDialog
          open={doneOpen}
          onOpenChange={closeReturn}
          added={
            data.returnState.kind === "done"
              ? groupInt(data.returnState.added)
              : null
          }
          balance={groupInt(data.balance)}
          campaignsHref={data.campaignsHref}
          onUpgrade={() => {
            closeReturn(false);
            setUpgradeOpen(true);
          }}
        />
      ) : null}
      <SmsUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        planName={data.campaignsPlanName}
        plansHref={data.plansHref}
      />
    </div>
  );
}
