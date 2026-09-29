/**
 * Vy-modell för Reserva (`/{slug}`), se docs/tasks/plans/WP-13.md steg 1.
 *
 * Råa värden bara: instanter som ISO-strängar med offset, `LocalDate`/`LocalTime`,
 * belopp som heltal CLP, telefon i E.164 och `now` injicerat (aldrig `new Date()` i
 * komponenterna). UI räknar aldrig ut priser eller lediga tider (hård regel 2):
 * allt nedan kommer redan färdigt från servern (WP-20) eller fixturerna.
 */
import type { Clp } from "@/lib/format/clp";
import type { IsoWeekday, LocalDate, LocalTime } from "@/lib/format/dates";
// `import type` raderas helt vid kompilering (ingen JS-emission), så den här
// filen kan vara "use client"-säker trots att @/server/bookings/types och
// @/server/booking-questions/* har `import "server-only"` som värde-import
// — se qa-granskningen (item 11).
import type { BookingQuestionDef } from "@/lib/validation/booking-questions";
import type { BookingError } from "@/server/bookings/types";
import type { Database } from "@/types/database";

export type BusinessStatus = Database["public"]["Enums"]["business_status"];

/** Ikonrutans tint på ServiceCard (DESIGN.md §7). */
export type ServiceTint = "lilac" | "peach" | "lime";

export interface BookingService {
  readonly id: string;
  readonly name: string;
  readonly durationMin: number;
  readonly priceClp: Clp;
  readonly tint: ServiceTint;
  /** `null` = utan kategori (WP-40, D-031). Frivilligt fält (befintliga
   * fixturer/tester saknar det) — behandla en saknad nyckel som `null`. */
  readonly categoryId?: string | null;
}

/** Tjänstekategori (WP-40, D-031): egna rader i `service_categories`, bara
 * de som har minst en aktiv tjänst (`page-data.ts` filtrerar bort tomma). */
export interface BookingServiceCategory {
  readonly id: string;
  readonly name: string;
}

export interface BookingStaffMember {
  readonly id: string;
  readonly name: string;
}

/** `"any"` = "Cualquiera" (R8 av WP-02), annars `BookingStaffMember["id"]`. */
export type StaffSelection = "any" | (string & {});

/** Instant som ISO-sträng med offset ("Z" eller "±hh:mm"), se `parseInstant`. */
export type IsoInstant = string;

export interface BookingSlot {
  readonly id: string;
  readonly start: IsoInstant;
  readonly priceClp: Clp;
  readonly originalPriceClp?: Clp;
  readonly discountPct?: number;
}

export interface DayAvailability {
  readonly date: LocalDate;
  readonly state: "open" | "full";
  readonly hasFlash: boolean;
  readonly slots: readonly BookingSlot[];
}

export interface BookingBusiness {
  readonly slug: string;
  readonly name: string;
  readonly comuna: string;
  readonly city: string;
  readonly weekdaysOpen: readonly IsoWeekday[];
  readonly open: LocalTime;
  readonly close: LocalTime;
  readonly cancelWindowHours: number;
  readonly status: BusinessStatus;
}

/** `availability[serviceId][staffId | "any"]` → dagarna för den kombinationen.
 * Stängda dagar skickas inte (steg 1). */
export type BookingAvailability = Record<
  string,
  Record<StaffSelection, readonly DayAvailability[]>
>;

export interface BookingPageData {
  /** Instant (ISO, med offset) för "nu", injicerad — aldrig `new Date()`. */
  readonly now: IsoInstant;
  readonly business: BookingBusiness;
  readonly services: readonly BookingService[];
  readonly staff: readonly BookingStaffMember[];
  readonly availability: BookingAvailability;
  /** WP-40: kategorier med minst en aktiv tjänst. Frivilligt (saknas →
   * behandlas som `[]`, flikarna döljs) så att befintliga fixturer/tester
   * inte behöver uppdateras. */
  readonly categories?: readonly BookingServiceCategory[];
  /** WP-40: aktiva bokningsfrågor per tjänst (redan upplösta mot
   * kategori-mål och klippta till max 5, se `getQuestionsForServiceIn`).
   * Frivilligt av samma skäl som `categories`. */
  readonly questionsByService?: Readonly<
    Record<string, readonly BookingQuestionDef[]>
  >;
}

/** `BookingError` (`@/server/bookings/types`, WP-10) plus `network` (klientfel,
 * anropet nådde aldrig servern) och `waitlist_duplicate` (bara väntelistan,
 * inte en del av `BookingError`). Matchar nycklarna i `errores.reserva` (utom
 * fältfelen `telefono`/`nombreVacio`/`emailInvalido`/`consentimientoRequerido`),
 * typat uttömmande i `errors.ts`. */
export type BookingServerErrorCode =
  BookingError | "network" | "waitlist_duplicate";

/** Kundens uppgifter i datasteget — vanlig typ (ingen Zod), så att
 * `customer-form.tsx`/`booking-screen.tsx` kan importera den utan att dra in
 * `form-schema.ts` (Zod, bara server) i klientbunten (qa-granskning, item 6). */
export interface CustomerContact {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
}

export interface BookingActionOk {
  readonly ok: true;
}

export interface BookingActionErr {
  readonly ok: false;
  readonly code: BookingServerErrorCode;
}

export type BookingActionResult = BookingActionOk | BookingActionErr;
