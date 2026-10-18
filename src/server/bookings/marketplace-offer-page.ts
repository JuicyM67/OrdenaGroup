import "server-only";

// D-060: bokningssidan via marknadsplatsens erbjudande (`/[slug]?oferta=<id>`,
// CL). Bara visning: erbjudandets tjänst förväljs och dess tider visar
// erbjudandepriset (ordinarie pris överstruket). `createIn` räknar ändå ut
// priset på nytt i transaktionen (inv. 6).
import type { BookingSelection } from "@/components/booking/flow-state";
import type {
  BookingPageData,
  DayAvailability,
} from "@/components/booking/types";

import type { MarketplaceOfferInfo } from "./marketplace-offer";

export function marketplaceOfferPageData(
  data: BookingPageData,
  offer: Pick<MarketplaceOfferInfo, "serviceId" | "priceMinor">,
): BookingPageData {
  const service = data.services.find((s) => s.id === offer.serviceId);
  if (!service) return data;
  const byStaff: Record<string, readonly DayAvailability[]> =
    data.availability[service.id] ?? {};
  const availability: Record<string, DayAvailability[]> = {};
  for (const [staffId, days] of Object.entries(byStaff)) {
    availability[staffId] = days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => {
        // Största rabatten vinner även här (samma regel som `choosePricing`):
        // en billigare blixttid behåller sitt pris.
        if (slot.priceClp <= offer.priceMinor) return slot;
        return {
          id: slot.id,
          start: slot.start,
          priceClp: offer.priceMinor as typeof slot.priceClp,
          originalPriceClp: service.priceClp,
        };
      }),
    }));
  }
  // Tjänstekortet visar också erbjudandepriset (bara visning).
  const services = data.services.map((s) =>
    s.id === service.id && s.priceClp > offer.priceMinor
      ? { ...s, priceClp: offer.priceMinor as typeof s.priceClp }
      : s,
  );
  return {
    ...data,
    services,
    availability: { ...data.availability, [service.id]: availability },
  };
}

/** Hoppa direkt till tidsvalet för erbjudandets tjänst ("Cualquiera"). */
export function marketplaceOfferSelection(
  data: BookingPageData,
  serviceId: string,
): BookingSelection | undefined {
  if (!data.services.some((s) => s.id === serviceId)) return undefined;
  const days = data.availability[serviceId]?.["any"] ?? [];
  const first = days.find((d) => d.state === "open") ?? days[0];
  return {
    serviceId,
    staffId: "any",
    date: first?.date ?? null,
    slotId: null,
  };
}
