// WP-69 (D-057): Mina värdebevis (SE `/konto/vardebevis`; CL `/cuenta/vales`,
// dold med marknadsplatsen). Retur från Stripe Checkout (`?kop=klart`) skapar
// värdebeviset direkt om webhooken inte hunnit (idempotent).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { VoucherCard } from "@/components/account/voucher-card";
import { vouchersMarket } from "@/config/marketplace";
import { hrefMarketplace } from "@/config/routes";
import { vales } from "@/i18n";
import { systemClock } from "@/server/scheduling/clock";
import { confirmVoucherReturn, loadMyVouchers } from "@/server/vouchers";

import { requireAccount } from "../session";
import { withdrawVoucherAction } from "./actions";

export const metadata: Metadata = {
  title: vales.cuenta.meta,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CuentaValesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!vouchersMarket()) notFound();
  const session = await requireAccount();
  const sp = await searchParams;
  const now = systemClock();
  let notice: string | undefined;
  if (sp.kop === "klart" && typeof sp.session === "string") {
    const r = await confirmVoucherReturn(session.userId, sp.session, now).catch(
      () => "pending" as const,
    );
    notice =
      r === "created" || r === "already"
        ? vales.cuenta.compraLista
        : vales.cuenta.compraPendiente;
  } else if (sp.angra === "klart") {
    notice = vales.cuenta.arrepentido;
  } else if (sp.angra === "fel") {
    notice = vales.cuenta.errorArrepentirse;
  }
  const vouchers = await loadMyVouchers(session.userId, now);
  const t = vales.cuenta;
  const open = vouchers.filter(
    (v) => v.status === "active" || v.status === "reserved",
  );
  const done = vouchers.filter(
    (v) => v.status !== "active" && v.status !== "reserved",
  );
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
      {vouchers.length === 0 ? (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-card bg-surface p-5">
          <p className="text-14 leading-body text-ink-soft">{t.vacio}</p>
          <Link
            href={hrefMarketplace("descubre")}
            className="flex h-11 items-center rounded-control bg-ink px-4 text-14 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.explorar}
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {[
            { title: t.activos, list: open },
            { title: t.anteriores, list: done },
          ]
            .filter((s) => s.list.length > 0)
            .map((s) => (
              <section key={s.title} className="flex flex-col gap-3">
                <h2 className="font-display text-20 font-semibold text-ink">
                  {s.title}
                </h2>
                <ul className="flex flex-col gap-3">
                  {s.list.map((v) => (
                    <VoucherCard
                      key={v.id}
                      voucher={v}
                      onWithdraw={withdrawVoucherAction}
                    />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </AccountShell>
  );
}
