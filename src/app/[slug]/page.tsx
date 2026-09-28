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

import { isDesignLabEnabled, type DesignLabEnv } from "../design-lab/gate";
import { fixtureBusinesses } from "../design-lab/reserva/fixtures";
import { createBooking, joinWaitlist } from "./actions";

// VERCEL_ENV måste läsas per request (samma skäl som design-lab/layout.tsx).
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

function gateEnv(): DesignLabEnv {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    DESIGN_LAB: process.env.DESIGN_LAB,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  // Grinden även här (qa-granskning, item 16): annars läcker företagsnamnet i
  // <title> för en okänd/stängd sida innan sidkomponenten hinner 404:a.
  if (!isDesignLabEnabled(gateEnv())) {
    return { robots: { index: false, follow: false } };
  }
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
  if (!isDesignLabEnabled(gateEnv())) {
    notFound();
  }

  const { slug } = await params;
  const data = fixtureBusinesses[slug];
  if (!data) notFound();

  // Bara de här två closurerna är riktiga server actions (qa-granskning,
  // item 5): `slug` binds på servern (fri variabel i closuren, aldrig ett
  // klientkontrollerat argument), och grinden körs igen inne i closuren —
  // en anropare som fått tag i själva action-referensen (t.ex. från
  // `.next/server/server-reference-manifest.json`) kan varken välja ett
  // annat företag eller komma förbi grinden om miljön stängts efter att
  // sidan laddades.
  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    if (!isDesignLabEnabled(gateEnv())) {
      return { ok: false, code: "business_unavailable" };
    }
    return createBooking(slug, input);
  }

  async function submitWaitlist(
    input: WaitlistFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    if (!isDesignLabEnabled(gateEnv())) {
      return { ok: false, code: "business_unavailable" };
    }
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
