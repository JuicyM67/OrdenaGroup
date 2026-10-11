import "server-only";

// WP-69 (D-057): bokningssidan i värdebevisläge (`/[slug]?vardebevis=<id>`).
// Helt serverdrivet (D-039: ingen ny klient-JS): sidans data begränsas till
// värdebevisets tjänst, tider efter utgången tas bort (besöket ska ske före),
// blixtpriser visas inte (värdebeviset betalar hela tjänsten), väntelistan
// och onlinebetalningen är av. `createIn` validerar ändå allt igen.
import type { BookingSelection } from "@/components/booking/flow-state";
import type {
  BookingPageData,
  DayAvailability,
} from "@/components/booking/types";

export function voucherPageData(
  data: BookingPageData,
  voucher: { serviceId: string; expiresAt: Date },
): BookingPageData {
  const limit = voucher.expiresAt.getTime();
  const service = data.services.find((s) => s.id === voucher.serviceId);
  if (!service) {
    return { ...data, services: [], availability: {} };
  }
  const byStaff: Record<string, readonly DayAvailability[]> =
    data.availability[service.id] ?? {};
  const availability: Record<string, DayAvailability[]> = {};
  for (const [staffId, days] of Object.entries(byStaff)) {
    availability[staffId] = days.flatMap((day) => {
      if (day.state !== "open") return [];
      const slots = day.slots
        .filter((s) => new Date(s.start).getTime() < limit)
        .map((s) => ({ id: s.id, start: s.start, priceClp: service.priceClp }));
      return slots.length > 0
        ? [{ date: day.date, state: "open" as const, hasFlash: false, slots }]
        : [];
    });
  }
  return {
    ...data,
    business: { ...data.business, onlinePayment: "off", waitlist: false },
    services: [service],
    categories: [],
    availability: { [service.id]: availability },
  };
}

/** Hoppa direkt till tidsvalet för värdebevisets tjänst ("Cualquiera"). */
export function voucherSelection(
  data: BookingPageData,
  serviceId: string,
): BookingSelection {
  const first = data.availability[serviceId]?.["any"]?.[0];
  return {
    serviceId,
    staffId: "any",
    date: first?.date ?? null,
    slotId: null,
  };
}
