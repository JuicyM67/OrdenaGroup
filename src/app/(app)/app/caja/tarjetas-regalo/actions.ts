"use server";

// WP-87 (D-073): Caja → Tarjetas de regalo — vender, usar, anular och raden
// på bokningssidan. `userId` och `businessId` ur den verifierade sessionen
// (aldrig från klienten); behörigheten kontrolleras i servern och i
// databasen (`gift_card_*`, 42501), rate limit på misslyckade uppslag.
import { revalidatePath } from "next/cache";

import type {
  SellState,
  TillBookingOption,
  TillCard,
  TillState,
} from "@/components/gift-cards/types";
import { appHref, tarjetaRegaloHref } from "@/config/routes";
import { regalo } from "@/i18n";
import { formatTime, type TimeZone } from "@/lib/format/dates";
import { formatMoney, parseMoney } from "@/lib/format/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServiceTx } from "@/server/db/tx";
import {
  loadTillBookings,
  lookupGiftCardAtTill,
  redeemGiftCardAtTill,
  sellGiftCard,
  setGiftCardsOnPage,
  voidGiftCard,
  type TillLookup,
} from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { kickOutbox } from "@/server/messaging/outbox";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { loadBusinessTz } from "@/server/payments/business-tz";
import { systemClock } from "@/server/scheduling/clock";

const t = regalo.caja;

async function currentMember(): Promise<{
  userId: string;
  businessId: string;
  slug: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const current = await getCurrentMember(user.id);
  if (!current) return null;
  return {
    userId: user.id,
    businessId: current.business.id,
    slug: current.business.slug,
  };
}

function revalidateGiftCards(): void {
  revalidatePath(appHref("appCajaTarjetas"));
  revalidatePath(appHref("appCaja"));
  revalidatePath(appHref("appAgenda"));
  revalidatePath(appHref("appHoy"));
}

// ---------------------------------------------------------------------------
// Vender
// ---------------------------------------------------------------------------

export async function sellGiftCardAction(
  _prev: SellState,
  fd: FormData,
): Promise<SellState> {
  const ctx = await currentMember();
  if (!ctx) return { status: "error", message: t.errores.forbidden };
  const now = systemClock();
  const r = await sellGiftCard(ctx.userId, ctx.businessId, fd, now);
  if (!r.ok) return { status: "error", message: t.errores[r.code] };
  if (r.emailed) await kickOutbox();
  revalidateGiftCards();
  const tz = await withServiceTx((q) => loadBusinessTz(q, ctx.businessId));
  const theme = fd.get("theme") === "lime" ? "lime" : "lilac";
  const recipient = String(fd.get("recipientName") ?? "").trim();
  return {
    status: "done",
    amountLabel: formatMoney(r.amount),
    code: r.code,
    cardHref: `${tarjetaRegaloHref(ctx.slug)}?t=${encodeURIComponent(r.viewToken)}`,
    expiresLabel: regalo.tarjeta.validaHasta({
      fecha: formatGiftCardDate(r.expiresAt, tz),
    }),
    emailed: r.emailed,
    theme,
    recipient: recipient === "" ? null : recipient.slice(0, 80),
  };
}

// ---------------------------------------------------------------------------
// Usar (canjear)
// ---------------------------------------------------------------------------

function toCard(c: TillLookup, tz: TimeZone): TillCard {
  const active = c.status === "active";
  return {
    last4: c.last4,
    initialMinor: c.initialMinor,
    balanceMinor: c.balanceMinor,
    statusLabel:
      active && c.balanceMinor < c.initialMinor
        ? regalo.estados.parcial
        : regalo.estados[c.status],
    active,
    expiresLabel: formatGiftCardDate(c.expiresAt, tz),
    recipient: c.recipientFirstName,
    theme: c.theme === "lime" ? "lime" : "lilac",
  };
}

export async function tillGiftCardAction(
  prev: TillState,
  fd: FormData,
): Promise<TillState> {
  const empty: TillState = {
    code: "",
    card: null,
    bookings: [],
    bookingId: prev.bookingId,
    message: null,
    error: null,
  };
  const ctx = await currentMember();
  if (!ctx) return { ...empty, error: t.errores.forbidden };
  const now = systemClock();
  const code = String(fd.get("code") ?? "")
    .trim()
    .slice(0, 40);
  const bookingRaw = String(fd.get("bookingId") ?? "");
  const tz = await withServiceTx((q) => loadBusinessTz(q, ctx.businessId));

  const lookup = async (
    message: string | null,
    error: string | null,
  ): Promise<TillState> => {
    const r = await lookupGiftCardAtTill(ctx.userId, ctx.businessId, code, now);
    if (!r.ok) return { ...empty, code, error: t.errores[r.code] };
    const bookings = await loadTillBookings(
      ctx.userId,
      ctx.businessId,
      now,
      prev.bookingId || null,
    );
    const options: TillBookingOption[] = bookings.map((b) => ({
      id: b.id,
      dueMinor: b.dueMinor,
      label: t.reservaOpcion({
        servicio: b.serviceName,
        hora: formatTime(b.start, tz),
        monto: formatMoney(b.dueMinor),
      }),
    }));
    return {
      code,
      card: toCard(r.card, tz),
      bookings: options,
      bookingId: options.some((o) => o.id === prev.bookingId)
        ? prev.bookingId
        : "",
      message,
      error,
    };
  };

  if (fd.get("intent") !== "redeem") return lookup(null, null);

  const bookingId = bookingRaw === "" ? null : bookingRaw;
  const amountRaw = String(fd.get("amount") ?? "").trim();
  let amountMinor: number;
  if (amountRaw === "") {
    // Standard: min(saldo, bokningens att betala).
    const card = await lookupGiftCardAtTill(
      ctx.userId,
      ctx.businessId,
      code,
      now,
    );
    if (!card.ok) return { ...empty, code, error: t.errores[card.code] };
    const due = bookingId
      ? (
          await loadTillBookings(ctx.userId, ctx.businessId, now, bookingId)
        ).find((b) => b.id === bookingId)?.dueMinor
      : undefined;
    amountMinor = Math.min(
      card.card.balanceMinor,
      due ?? card.card.balanceMinor,
    );
  } else {
    const parsed = parseMoney(amountRaw);
    if (!parsed.ok) {
      return lookup(null, t.errores.invalid_amount);
    }
    amountMinor = parsed.value;
  }
  const r = await redeemGiftCardAtTill(
    ctx.userId,
    ctx.businessId,
    { code, amountMinor, bookingId },
    now,
  );
  if (!r.ok) return lookup(null, t.errores[r.code]);
  revalidateGiftCards();
  const message = [
    t.listo({
      monto: formatMoney(r.redeemedMinor),
      saldo: formatMoney(r.balanceMinor),
    }),
    r.withBooking ? t.listoReserva : "",
  ]
    .filter(Boolean)
    .join(" ");
  return lookup(message, null);
}

// ---------------------------------------------------------------------------
// Anular och raden på bokningssidan
// ---------------------------------------------------------------------------

export async function voidGiftCardAction(
  giftCardId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, message: t.errores.forbidden };
  const r = await voidGiftCard(
    ctx.userId,
    ctx.businessId,
    giftCardId,
    systemClock(),
  );
  if (!r.ok) return { ok: false, message: t.errores[r.code] };
  revalidateGiftCards();
  return { ok: true };
}

export async function setGiftCardsOnPageAction(
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false };
  const r = await setGiftCardsOnPage(
    ctx.userId,
    ctx.businessId,
    enabled === true,
  );
  if (r.ok) {
    revalidateGiftCards();
    revalidatePath(`/${ctx.slug}`);
  }
  return r;
}
