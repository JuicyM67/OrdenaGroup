// WP-84 (D-069, port av SE WP-93): tjänstens pris på bokningssidan — "desde
// $15.000" när priset är ett lägsta pris (`priceFrom`), annars bara beloppet.
import { reserva } from "@/i18n";
import { formatMoney } from "@/lib/format/money";

import type { BookingService } from "./types";

export function formatServicePrice(
  service: Pick<BookingService, "priceClp" | "priceFrom">,
): string {
  const precio = formatMoney(service.priceClp);
  return service.priceFrom ? reserva.precioDesde({ precio }) : precio;
}
