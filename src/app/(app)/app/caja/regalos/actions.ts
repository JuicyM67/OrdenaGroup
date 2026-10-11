"use server";

// WP-77 (D-058): Kassa → Presentkort, "Lös in presentkort". `userId` och
// `businessId` ur den verifierade sessionen; behörigheten kontrolleras i
// databasen (`gift_card_*_at_till`, 42501) och rate limit i servern.
import { revalidatePath } from "next/cache";

import type {
  TillBookingOption,
  TillCard,
  TillState,
} from "@/components/gift-cards/till-redeem";
import { regalo } from "@/i18n";
import { formatTime, type TimeZone } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServiceTx } from "@/server/db/tx";
import {
  loadTillBookings,
  lookupGiftCardAtTill,
  redeemGiftCardAtTill,
  type TillLookup,
} from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { loadBusinessTz } from "@/server/payments/business-tz";
import { systemClock } from "@/server/scheduling/clock";

const t = regalo.caja;

async function currentMember(): Promise<{
  userId: string;
  businessId: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const current = await getCurrentMember(user.id);
  if (!current) return null;
  return { userId: user.id, businessId: current.business.id };
}

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
    expiresLabel: formatGiftCardDate(new Date(c.expiresAt), tz),
    recipient: c.recipientFirstName,
    theme: c.theme === "lime" || c.theme === "photo" ? c.theme : "lilac",
  };
}

const EMPTY: TillState = {
  code: "",
  card: null,
  bookings: [],
  message: null,
  error: null,
};

export async function tillGiftCardAction(
  _prev: TillState,
  fd: FormData,
): Promise<TillState> {
  const ctx = await currentMember();
  if (!ctx) return { ...EMPTY, error: t.errores.forbidden };
  const now = systemClock();
  const code = String(fd.get("code") ?? "")
    .trim()
    .slice(0, 40);
  const tz = await withServiceTx((q) => loadBusinessTz(q, ctx.businessId));

  const lookup = async (
    message: string | null,
    error: string | null,
  ): Promise<TillState> => {
    const r = await lookupGiftCardAtTill(ctx.userId, ctx.businessId, code, now);
    if (!r.ok) return { ...EMPTY, code, error: t.errores[r.code] };
    const bookings = await loadTillBookings(ctx.userId, ctx.businessId, now);
    const options: TillBookingOption[] = bookings.map((b) => ({
      id: b.id,
      dueMinor: b.dueMinor,
      label: t.reservaOpcion({
        servicio: b.serviceName,
        hora: formatTime(new Date(b.start), tz),
        monto: formatMoney(b.dueMinor),
      }),
    }));
    return {
      code,
      card: toCard(r.card, tz),
      bookings: options,
      message,
      error,
    };
  };

  if (fd.get("intent") !== "redeem") return lookup(null, null);

  const bookingRaw = String(fd.get("bookingId") ?? "");
  const bookingId = bookingRaw === "" ? null : bookingRaw;
  const amountRaw = String(fd.get("amount") ?? "")
    .trim()
    .replace(",", ".");
  let amountMinor: number;
  if (amountRaw === "") {
    // Standard: min(saldo, bokningens att betala).
    const card = await lookupGiftCardAtTill(
      ctx.userId,
      ctx.businessId,
      code,
      now,
    );
    if (!card.ok) return { ...EMPTY, code, error: t.errores[card.code] };
    const due = bookingId
      ? (await loadTillBookings(ctx.userId, ctx.businessId, now)).find(
          (b) => b.id === bookingId,
        )?.dueMinor
      : undefined;
    amountMinor = Math.min(
      card.card.balanceMinor,
      due ?? card.card.balanceMinor,
    );
  } else {
    amountMinor = Math.round(Number(amountRaw) * 100);
  }
  const r = await redeemGiftCardAtTill(
    ctx.userId,
    ctx.businessId,
    { code, amountMinor, bookingId },
    now,
  );
  if (!r.ok) return lookup(null, t.errores[r.code]);
  revalidatePath("/app/caja");
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
