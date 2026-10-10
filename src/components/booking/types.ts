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
  /** WP-41: tjänstens beskrivning på profilen (≤ 500 tecken). Frivilligt
   * (saknas/`null` = ingen beskrivning). */
  readonly description?: string | null;
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
  /** WP-41: roll ("Estilista senior"). Frivilligt, `null` = ingen roll. */
  readonly title?: string | null;
  /** WP-44: profilbild, redan filtrerad till vår bucket/företagets mapp
   * (`page-data.ts`). Frivilligt, `null`/saknas = initialer. */
  readonly photoUrl?: string | null;
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
  /** WP-51: rubro (`negocio.rubros`, p. ej. "barberia"), mostrado en el
   * encabezado del perfil junto a la comuna ("Barbería · Providencia",
   * `ProfilDesktop.dc.html`/`ProfilMobil.dc.html`: "Frisör · Götgatan 12").
   * Frivilligt (fixturer/tester saknar det) — behandla en saknad nyckel som
   * `null`, samma mönster som `categoryId` i `BookingService`. */
  readonly category?: string | null;
  readonly city: string;
  readonly weekdaysOpen: readonly IsoWeekday[];
  readonly open: LocalTime;
  readonly close: LocalTime;
  readonly cancelWindowHours: number;
  readonly status: BusinessStatus;
  /** WP-45 (D-033): av → CTA/bekräftelsen visar varianten "Enviar
   * solicitud" (`reserva.antesDeConfirmar.ctaEnviarSolicitud`,
   * `reserva.confirmacionSolicitud`). */
  readonly autoConfirmBookings: boolean;
  /** WP-64 (D-044): betalning online vid bokning. Frivilligt (saknas = "off");
   * servern sätter "off" när Stripe saknas eller kontot inte kan ta betalt. */
  readonly onlinePayment?: "off" | "optional" | "required";
}

/** WP-41: en rad i `business_hours` (väggtid, `end` får vara "24:00"). */
export interface BookingProfileHours {
  readonly weekday: IsoWeekday;
  readonly start: LocalTime;
  readonly end: LocalTime;
}

/** WP-41: företagsprofilen på `/{slug}`. Allt färdigberäknat på servern. */
export interface BookingProfile {
  readonly about: string | null;
  /** Publika https-URL:er (bucket `business-media`) eller `null`. */
  readonly coverUrl: string | null;
  readonly logoUrl: string | null;
  /** Handtag utan "@". */
  readonly instagram: string | null;
  /** WP-51: mismas reglas que instagram (handtag utan "@", 1–30 tecken). */
  readonly tiktok: string | null;
  readonly facebook: string | null;
  /** WP-51: länkar redan byggda på servern utifrån handtaget ovan
   * (`page-data.ts`) — klienten konstruerar aldrig sociala URL:er själv.
   * `null` om inget handtag är satt. */
  readonly instagramUrl: string | null;
  readonly tiktokUrl: string | null;
  readonly facebookUrl: string | null;
  readonly address: string | null;
  /** E.164. */
  readonly phone: string | null;
  /** Galleriets publika URL:er i ägarens ordning (max 12). */
  readonly gallery: readonly string[];
  /** Öppettider per veckodag, sorterade (veckodag, start). Stängd dag saknas. */
  readonly hours: readonly BookingProfileHours[];
  /** Öppet just nu (öppettider minus stängning för hela företaget). */
  readonly openNow:
    | { readonly open: true; readonly closesAt: LocalTime }
    | { readonly open: false };
  /** Första lediga tid (någon tjänst, "Cualquiera", 14 dagar framåt). */
  readonly nextAvailable: {
    readonly start: IsoInstant;
    readonly serviceId: string;
  } | null;
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
  /** WP-41: profilen. Frivilligt (fixturer/tester utan profil). */
  readonly profile?: BookingProfile;
}

/** `BookingError` (`@/server/bookings/types`, WP-10) plus `network` (klientfel,
 * anropet nådde aldrig servern), `waitlist_duplicate` (bara väntelistan,
 * inte en del av `BookingError`) och `rate_limited` (säkerhetsgranskning
 * WP-27: för många försök från samma IP, eller för många framtida bokningar
 * på samma telefon — `src/app/[slug]/actions.ts`/`src/server/bookings/
 * submit.ts`, inte heller en del av `BookingError` eftersom motorn
 * (`create.ts`) aldrig returnerar den). Matchar nycklarna i `errores.reserva`
 * (utom fältfelen `telefono`/`nombreVacio`/`emailInvalido`/
 * `consentimientoRequerido`), typat uttömmande i `errors.ts`. */
/** `forbidden` (WP-46) gäller bara inloggade medlemmar, aldrig kunden. */
export type BookingServerErrorCode =
  | Exclude<BookingError, "forbidden">
  | "network"
  | "waitlist_duplicate"
  | "rate_limited"
  | "payment_unavailable";

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
  /** WP-54: medlemsrabatt i minor units (servern räknar). */
  readonly memberDiscountMinor?: number;
  /** WP-31: orsaken till `memberDiscountMinor` (medlem eller erbjudande). */
  readonly discountReason?: "member" | "offer";
  readonly memberBenefitText?: string | null;
  /** WP-61 (pilotfynd #1): kundens egen `/r/[token]`-token, för
   * "Ver mi reserva"/"Ver mi solicitud" i `Confirmation`. `undefined` vid ett
   * idempotent omförsök (`src/app/[slug]/actions.ts`) eller när anroparen
   * (t.ex. väntelistan) inte har någon bokning att länka till. */
  readonly manageToken?: string;
  /** WP-64 (D-044): kunden ska vidare till Stripe Checkout (hostad sida). */
  readonly checkoutUrl?: string;
}

export interface BookingActionErr {
  readonly ok: false;
  readonly code: BookingServerErrorCode;
}

export type BookingActionResult = BookingActionOk | BookingActionErr;
