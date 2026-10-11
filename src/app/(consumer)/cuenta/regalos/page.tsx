// WP-77 (D-058): Mina presentkort (SE `/konto/presentkort`; CL
// `/cuenta/regalos`, dold). Inloggad köpares presentkort: saldo, utgång,
// status, leverans, "Visa och skriv ut" och "Ångra köp" (14 dagar, oanvänt).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import {
  GiftCardPreview,
  type GiftCardTheme,
} from "@/components/gift-cards/gift-card-preview";
import { giftCardsMarket } from "@/config/gift-cards";
import { regaloHref } from "@/config/routes";
import { regalo } from "@/i18n";
import {
  formatLocalDate,
  toLocalDate,
  type LocalDate,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { loadMyGiftCards } from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { systemClock } from "@/server/scheduling/clock";

import { requireAccount } from "../session";
import { withdrawGiftCardAction } from "./actions";

export const metadata: Metadata = {
  title: regalo.cuenta.meta,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CuentaRegalosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!giftCardsMarket()) notFound();
  const session = await requireAccount();
  const sp = await searchParams;
  const now = systemClock();
  const t = regalo.cuenta;
  const notice =
    sp.angra === "klart"
      ? t.arrepentido
      : sp.angra === "fel"
        ? t.errorArrepentirse
        : null;
  const cards = await loadMyGiftCards(session.userId, now);
  return (
    <AccountShell active="perfil">
      <h1 className="font-display text-30 font-semibold tracking-title text-ink lg:text-36">
        {t.titulo}
      </h1>
      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-tile bg-lime px-4 py-3 text-14 font-semibold text-ink"
        >
          {notice}
        </p>
      ) : null}
      {cards.length === 0 ? (
        <p className="mt-5 rounded-card bg-surface p-5 text-14 leading-body text-ink-soft">
          {t.vacio}
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {cards.map((c) => {
            const theme: GiftCardTheme =
              c.theme === "lime" || c.theme === "photo" ? c.theme : "lilac";
            const status =
              c.status === "active" && c.balanceMinor < c.initialMinor
                ? regalo.estados.parcial
                : regalo.estados[c.status];
            const delivery = c.deliveredAt
              ? t.enviada({
                  fecha: formatGiftCardDate(
                    new Date(c.deliveredAt),
                    c.timeZone,
                  ),
                })
              : c.deliverOn && c.deliverOn >= toLocalDate(now, c.timeZone)
                ? t.programada({
                    fecha: formatLocalDate(
                      c.deliverOn as LocalDate,
                      "dayMonthLong",
                    ),
                  })
                : null;
            return (
              <li
                key={c.id}
                className="flex flex-col gap-3.5 rounded-card bg-surface p-4"
              >
                <GiftCardPreview
                  size="md"
                  theme={theme}
                  photoUrl={null}
                  businessName={c.businessName}
                  label={regalo.compra.tarjeta.etiqueta}
                  amount={formatMoney(c.initialMinor)}
                  to={
                    c.recipientName
                      ? t.para({ nombre: c.recipientName })
                      : undefined
                  }
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-14">
                  <b className="text-ink">
                    {t.saldo({
                      saldo: formatMoney(c.balanceMinor),
                      valor: formatMoney(c.initialMinor),
                    })}
                  </b>
                  <span className="rounded-badge bg-line px-2 py-0.5 text-11 font-bold text-muted">
                    {status}
                  </span>
                </div>
                <p className="text-13 text-muted">
                  <span aria-label={t.codigoAria} className="font-mono">
                    {c.code}
                  </span>
                  {" · "}
                  {t.validoHasta({
                    fecha: formatGiftCardDate(
                      new Date(c.expiresAt),
                      c.timeZone,
                    ),
                  })}
                  {delivery ? ` · ${delivery}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`${regaloHref(c.businessSlug, "tarjeta")}?id=${c.id}`}
                    className="flex h-11 items-center rounded-control bg-ink px-4 text-14 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {t.ver}
                  </Link>
                  {c.canWithdraw ? (
                    <form action={withdrawGiftCardAction}>
                      <input type="hidden" name="tarjeta" value={c.id} />
                      <button
                        type="submit"
                        className="text-13 font-semibold text-alert-fg underline underline-offset-2"
                      >
                        {t.arrepentirse}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
