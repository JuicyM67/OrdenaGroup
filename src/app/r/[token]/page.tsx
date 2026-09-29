// Kundens länk `/r/[token]` (WP-16 steg 5, D-029): se bokningen och avboka
// den inom fönstret. `token` läses ur URL:en och binds på servern i
// closuren `cancelReservation` (samma mönster som `[slug]/page.tsx`s
// `createBooking`/`joinWaitlist` — qa-granskning WP-13, item 5): en riktig
// server action ("use server") som tar `token` som ett klientkontrollerat
// argument skulle låta vem som helst skicka in ett annat företags token.
// Token loggas aldrig (varken här eller i `manage.ts`).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ManageScreen } from "@/components/booking/manage-screen";
import type { ManageCancelResult } from "@/components/booking/manage-view";
import { gestion } from "@/i18n";
import { cancelByToken, loadBookingByToken } from "@/server/bookings/manage";
import { kickOutbox } from "@/server/messaging/outbox";
import { systemClock } from "@/server/scheduling/clock";

// Bokningens status (och om avbokningsfönstret fortfarande är öppet) ändras
// minut för minut — samma skäl som `/[slug]` (`design-lab/layout.tsx`).
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { token } = await params;
  const booking = await loadBookingByToken(token, systemClock());
  return {
    title: booking ? `${gestion.titulo} · ${booking.business.name}` : undefined,
    // Länken är personlig (avbokningsbar) — aldrig indexerad.
    robots: { index: false, follow: false },
  };
}

export default async function ManagePage({ params }: { params: Params }) {
  const { token } = await params;
  const now = systemClock();
  const booking = await loadBookingByToken(token, now);
  if (!booking) notFound();

  async function cancelReservation(): Promise<ManageCancelResult> {
    "use server";
    const result = await cancelByToken(token, systemClock());
    if (!result.ok) return { ok: false, code: result.error };
    // WP-16: samma mönster som `[slug]/actions.ts` — bekräftelsen/avin till
    // ägaren går ut direkt efter svaret, utan att vänta på cron.
    void kickOutbox();
    return { ok: true };
  }

  return (
    <ManageScreen
      booking={booking}
      now={now.toISOString()}
      onCancel={cancelReservation}
    />
  );
}
