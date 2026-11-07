// WP-82 (D-067): hela bokningen som iframe på företagets egen sida (`?dialog=1` i dialogen
// från knappen). Samma skärm, data och server action som /[slug] (WhatsApp-samtycket D-063,
// villkor och rate limit gäller som vanligt), i läget `embedded`: ingen fast mobilbar,
// ingen webbläsarhistorik, kundkonto läses eller skrivs aldrig här (`noAccount`).
// Profilvyn visas inte (bokningen börjar på tjänstevalet). Marknadsplatsens `?oferta=`
// (D-060) och `?o=` binds inte här: widgeten bokar till ordinarie pris.
import { notFound } from "next/navigation";

import { BookingScreen } from "@/components/booking/booking-screen";
import type {
  CustomerFormOutput,
  WaitlistFormOutput,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { EmbeddedBookingFrame } from "@/components/widgets/embedded-booking-frame";
import {
  parseWidgetParams,
  WIDGET_SLUG_PATTERN,
} from "@/lib/validation/widgets";
import { createBooking, joinWaitlist } from "@/app/[slug]/actions";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import { loadReservaPageData } from "@/server/bookings/page-data";
import { withServiceTx } from "@/server/db/tx";
import { systemClock } from "@/server/scheduling/clock";

// Tillgängligheten ändras minut för minut (som /[slug]).
export const dynamic = "force-dynamic";

export default async function EmbedReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { theme } = parseWidgetParams(sp);
  const dialog = sp.dialog === "1";
  if (!WIDGET_SLUG_PATTERN.test(slug)) notFound();
  const business = await resolveBusinessBySlug(slug);
  if (!business) notFound();
  const data = await withServiceTx((q) =>
    loadReservaPageData(q, {
      businessId: business.id,
      slug,
      now: systemClock(),
    }),
  );
  if (!data) notFound();

  // Samma mönster som /[slug]: `slug` binds på servern, aldrig ur klienten.
  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return createBooking(slug, input, { noAccount: true });
  }
  async function submitWaitlist(
    input: WaitlistFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return joinWaitlist(slug, input);
  }

  return (
    <EmbeddedBookingFrame theme={theme} dialog={dialog}>
      <BookingScreen
        data={data}
        submitBooking={submitBooking}
        joinWaitlist={submitWaitlist}
        embedded={dialog ? "dialog" : "inline"}
      />
    </EmbeddedBookingFrame>
  );
}
