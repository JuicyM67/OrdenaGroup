// Publik bokningssida (F5). Bara fixturer tills WP-20 kopplar in riktig data.
// Grind D-020: stängd i produktion, öppen i staging via DESIGN_LAB=1.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingScreen } from "@/components/booking/booking-screen";
import type {
  CustomerFormOutput,
  WaitlistFormOutput,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { reserva } from "@/i18n";

import { isDesignLabEnabled } from "../design-lab/gate";
import { fixtureBusinesses } from "../design-lab/reserva/fixtures";
import { createBookingAction, joinWaitlistAction } from "./actions";

// VERCEL_ENV måste läsas per request (samma skäl som design-lab/layout.tsx).
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = fixtureBusinesses[slug];
  return {
    title: business
      ? reserva.meta.titulo({ negocio: business.business.name })
      : undefined,
    // Fixturer, inte riktig data: noindex tills WP-20.
    robots: { index: false, follow: false },
  };
}

export default async function ReservaPage({ params }: { params: Params }) {
  if (
    !isDesignLabEnabled({
      VERCEL_ENV: process.env.VERCEL_ENV,
      DESIGN_LAB: process.env.DESIGN_LAB,
    })
  ) {
    notFound();
  }

  const { slug } = await params;
  const data = fixtureBusinesses[slug];
  if (!data) notFound();

  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return createBookingAction(slug, input);
  }

  async function submitWaitlist(
    input: WaitlistFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return joinWaitlistAction(slug, input);
  }

  return (
    <BookingScreen
      data={data}
      submitBooking={submitBooking}
      joinWaitlist={submitWaitlist}
    />
  );
}
