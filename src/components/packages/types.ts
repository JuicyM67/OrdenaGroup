// WP-86 (D-072) · Klienttyper för paket. Speglar (duplicerar, importerar inte)
// `src/server/packages/packages.ts` — klientkomponenter importerar aldrig
// `@/server` (samma mönster som `caja/types.ts`). Håll filerna i synk för hand.
import { comun, paquetes } from "@/i18n";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

export type PackageManualMethod = "cash" | "card_terminal" | "transfer";

export type PackageTemplate = {
  id: string;
  name: string;
  sessions: number;
  priceClp: number;
  validityDays: number | null;
  showPublic: boolean;
  active: boolean;
  serviceIds: string[];
};

export type PackageServiceOption = {
  id: string;
  name: string;
  active: boolean;
};

export type CustomerPackage = {
  id: string;
  name: string;
  sessionsTotal: number;
  remaining: number;
  priceClp: number;
  paymentMethod: PackageManualMethod;
  soldAt: string;
  expiresOn: LocalDate | null;
  state: "active" | "expired" | "used_up" | "voided";
  canVoid: boolean;
  serviceNames: string[];
  uses: {
    moveId: string;
    bookingId: string | null;
    at: string;
    serviceName: string | null;
    noShow: boolean;
    reversed: boolean;
  }[];
};

export type BookingPackageInfo = {
  use: { moveId: string; packageName: string; remaining: number } | null;
  available: {
    customerPackageId: string;
    name: string;
    remaining: number;
  } | null;
};

export type PackageErrorCode =
  | "forbidden"
  | "plan_locked"
  | "not_found"
  | "invalid"
  | "sin_servicios"
  | "template_inactive"
  | "customer_anonymized"
  | "no_sessions"
  | "expired"
  | "service_not_included"
  | "wrong_customer"
  | "booking_status"
  | "already_used"
  | "already_paid"
  | "same_day_required"
  | "in_use"
  | "unexpected";

export type PackageActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; code: PackageErrorCode };

export type SaveTemplateInput = {
  id?: string;
  name: string;
  serviceIds: string[];
  sessions: number;
  priceClp: number;
  validityDays: number | null;
  showPublic: boolean;
  active: boolean;
};

export type SellPackageInput = {
  customerId: string;
  templateId: string;
  method: PackageManualMethod;
};

export type PackageCustomerHit = {
  id: string;
  name: string;
  phone: string | null;
};

/** Server actions för försäljning (kundkortet och Caja). */
export type SellPackageActions = {
  sell: (input: SellPackageInput) => Promise<PackageActionResult>;
  /** Bara Caja (kunden väljs i dialogen). */
  searchCustomers?: (q: string) => Promise<PackageCustomerHit[]>;
};

/** Server actions för "Usar paquete"/"Devolver sesión". */
export type BookingPackageActions = {
  redeem: (input: {
    bookingId: string;
    customerPackageId?: string;
  }) => Promise<PackageActionResult>;
  undo: (input: { moveId: string }) => Promise<PackageActionResult>;
};

export function packageErrorText(code: string): string {
  const map = paquetes.errores as Record<string, string>;
  return map[code] ?? comun.algoSalioMal;
}

/** "28 de septiembre de 2027" (giltigheten kan gå över årsskiftet). */
export function formatExpiry(d: LocalDate): string {
  return `${formatLocalDate(d, "dayMonthLong")} de ${d.slice(0, 4)}`;
}
