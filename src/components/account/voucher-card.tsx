// WP-69 (D-057): ett värdebevis i kundkontot (Profil.dc.html, "Mina värdebevis"):
// bild, behandling, salong och giltighet, koden i en streckad ruta med värdet,
// "Välj tid" (→ `/[slug]?vardebevis=<id>`) och — inom 14 dagar, oanvänt —
// "Ångra köp" bakom en inbyggd <details> (ingen klient-JS).
import Link from "next/link";

import { OfferImage } from "@/components/marketplace/offer-image";
import { vales } from "@/i18n";
import { formatDate, formatTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import type { MyVoucher } from "@/server/vouchers";
import { formatVoucherDate } from "@/server/vouchers/rules";

const t = vales.cuenta;

function badgeTone(status: MyVoucher["status"]): string {
  switch (status) {
    case "active":
      return "bg-success-bg text-success-fg";
    case "reserved":
      return "bg-pending-bg text-pending-fg";
    default:
      return "bg-line text-muted";
  }
}

export function VoucherCard({
  voucher,
  onWithdraw,
}: {
  voucher: MyVoucher;
  onWithdraw?: (formData: FormData) => Promise<void>;
}) {
  const usable = voucher.status === "active";
  const valid = formatVoucherDate(
    new Date(voucher.expiresAt),
    voucher.timeZone,
  );
  return (
    <li className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-tile">
          <OfferImage src={voucher.imageUrl} alt="" sizes="56px" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-15 text-ink">{voucher.title}</b>
          <span className="truncate text-12 text-muted">
            {voucher.businessName} · {t.validoHasta({ fecha: valid })}
          </span>
        </div>
        {voucher.status !== "active" ? (
          <span
            className={`shrink-0 rounded-badge px-2 py-0.5 text-11 font-bold ${badgeTone(voucher.status)}`}
          >
            {t.estados[voucher.status]}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-tile border border-dashed border-subtle bg-canvas px-3 py-2.5">
        <span
          aria-label={t.codigoAria}
          className="font-mono text-15 font-bold tracking-label text-ink"
        >
          {voucher.code}
        </span>
        <span className="text-12 text-muted">
          {t.valor({ valor: formatMoney(voucher.priceMinor) })}
        </span>
      </div>
      {voucher.status === "reserved" && voucher.bookingStart ? (
        <p className="text-13 font-semibold text-ink-soft">
          {t.reservado({
            fecha: `${formatDate(new Date(voucher.bookingStart), voucher.timeZone, "weekdayDayMonthShort")} ${formatTime(new Date(voucher.bookingStart), voucher.timeZone)}`,
          })}
        </p>
      ) : null}
      {usable ? (
        <Link
          href={`/${voucher.businessSlug}?vardebevis=${voucher.id}`}
          className="flex h-12 items-center justify-center rounded-control bg-ink text-14 font-bold text-on-dark hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.reservar}
        </Link>
      ) : null}
      {voucher.canWithdraw && onWithdraw ? (
        <details className="group text-13">
          <summary className="cursor-pointer self-start font-semibold text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {t.arrepentirse}
          </summary>
          <form
            action={onWithdraw}
            className="mt-2 flex flex-col gap-2 rounded-tile bg-canvas p-3"
          >
            <input type="hidden" name="vale" value={voucher.id} />
            <p className="text-13 leading-body text-ink-soft">
              {t.arrepentirseConfirmar}
            </p>
            <button
              type="submit"
              className="h-10 self-start rounded-control bg-surface px-4 text-13 font-bold text-ink shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {t.arrepentirse}
            </button>
          </form>
        </details>
      ) : null}
    </li>
  );
}
