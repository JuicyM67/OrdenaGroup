// Publik bokningssida (F5). Riktig data sedan WP-20 (D-020s grind för
// `/[slug]` togs bort i samma PR, se docs/decisions/DECISIONS.md).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingScreen } from "@/components/booking/booking-screen";
import type {
  CustomerFormOutput,
  WaitlistFormOutput,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { reserva } from "@/i18n";
import { withServiceTx } from "@/server/db/tx";
import { loadReservaPageData } from "@/server/bookings/page-data";
import { systemClock } from "@/server/scheduling/clock";

import { createBooking, joinWaitlist } from "./actions";
import { resolveBusinessBySlug } from "./business";

// VERCEL_ENV/databasen måste läsas per request (samma skäl som tidigare:
// design-lab/layout.tsx), och tillgängligheten ändras minut för minut.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await resolveBusinessBySlug(slug);
  return {
    title: business
      ? reserva.meta.titulo({ negocio: business.name })
      : undefined,
    // Riktig data, men fortfarande noindex (planens FRÅGA, WP-20-slim):
    // sidan är ny, ingen SEO-strategi bestämd än.
    robots: { index: false, follow: false },
  };
}

export default async function ReservaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const business = await resolveBusinessBySlug(slug);
  if (!business) notFound();

  const data = await withServiceTx((q) =>
    loadReservaPageData(q, {
      businessId: business.id,
      slug,
      now: systemClock(),
    }),
  );
  // Bara en skyddsnät mot en race (företaget togs bort mellan de två
  // frågorna ovan) — `resolveBusinessBySlug` hittade det just innan.
  if (!data) notFound();

  // Bara de här två closurerna är riktiga server actions (qa-granskning
  // WP-13, item 5 — gäller fortfarande): `slug` binds på servern (fri
  // variabel i closuren, aldrig ett klientkontrollerat argument).
  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return createBooking(slug, input);
  }

  async function submitWaitlist(
    input: WaitlistFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return joinWaitlist(slug, input);
  }

  return (
    <BookingScreen
      data={data}
      submitBooking={submitBooking}
      joinWaitlist={submitWaitlist}
    />
  );
}
