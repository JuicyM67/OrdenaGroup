/**
 * Riktiga bokningar (WP-20): validerar indata på nytt med Zod-schemat,
 * slår upp `businessId` på sluggen och anropar motorn. Ersätter WP-13:s
 * fixture-stubbar helt.
 *
 * Säkerhet (qa-granskning WP-13, item 5 — gäller fortfarande): **inte**
 * `"use server"` här. Dessa är vanliga funktioner som tar `slug` som en
 * vanlig parameter — om filen vore en server-action-modul skulle `slug`
 * vara en del av det klientanropsbara kontraktet, och vem som helst skulle
 * kunna anropa `createBooking(vilketFöretagSomHelst, …)` direkt. De enda
 * riktiga server actionsen är de inbäddade closurerna i `page.tsx` (och
 * design lab:s `page.tsx`), som binder `slug` på servern.
 * `import "server-only"` stoppar ett klientimport-misstag.
 */
import "server-only";

import {
  bookingFormSchema,
  waitlistFormSchema,
} from "@/components/booking/form-schema";
import type {
  BookingActionErr,
  BookingActionOk,
  BookingActionResult,
} from "@/components/booking/types";
import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import {
  claimBookingForAccount,
  linkAccountRows,
} from "@/server/accounts/account";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import {
  createCustomerBooking,
  saveBookingConsent,
} from "@/server/bookings/submit";
import { pgErrorCode } from "@/server/db/errors";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { kickOutbox } from "@/server/messaging/outbox";
import { systemClock } from "@/server/scheduling/clock";
import { joinWaitlist as joinWaitlistServer } from "@/server/waitlist/join";

/** Pilotblockerare (säkerhetsgranskning WP-27): en IP kan skapa högst
 * `BOOKING_IP_MAX` bokningsförsök per `BOOKING_IP_WINDOW_SECONDS`. Räknas
 * oavsett resultat (även avvisade försök), innan något annat görs — det
 * skyddar även `resolveBusinessBySlug`/motorn från att spammas. Den andra
 * gränsen (max framtida bokningar per telefon+företag) ligger i
 * `createCustomerBooking` (submit.ts), som redan har `businessId`/`phone`. */
const BOOKING_IP_WINDOW_SECONDS = 10 * 60;
const BOOKING_IP_MAX = 10;

/** WP-54: lyckat svar med medlemspriset (bara när servern gav rabatt).
 * `memberDiscountMinor` = avdraget i minor units (pris att betala =
 * tjänstens pris − rabatten); `memberBenefitText` = företagets förmånstext
 * eller `null`. Aldrig något från klienten. */
export type CreateBookingActionResult =
  | (BookingActionOk & {
      readonly memberDiscountMinor?: number;
      readonly memberBenefitText?: string | null;
      /**
       * WP-61 (pilotfynd #1): kundens EGEN `/r/[token]`-token (samma som i
       * bekräftelsemejlet) — inte "riktig tokentextsäkerhet av ett annat slag"
       * mer än mejlet redan är: kunden äger redan den här bokningen. Saknas
       * (`undefined`) vid ett idempotent omförsök (`findByIdempotencyKey`,
       * `src/server/bookings/create.ts`, kan inte återskapa den hashade
       * token) — `Confirmation` döljer länken då i stället för att länka till
       * fel/tom token.
       */
      readonly manageToken?: string;
    })
  | BookingActionErr;

/**
 * WP-31: `offerToken` binds på servern (closuren i `page.tsx`, från `?o=`),
 * aldrig ur klientens formulär. `createIn` validerar den i transaktionen.
 */
export async function createBooking(
  slug: string,
  input: unknown,
  opts: {
    offerToken?: string | undefined;
    /** D-060: marknadsplatsens erbjudande (CL), bundet på servern (`page.tsx`). */
    marketplaceOfferId?: string | undefined;
    /** WP-82 (D-067): inbäddad bokning (`/embed`) läser eller skriver aldrig en kundsession. */
    noAccount?: boolean | undefined;
  } = {},
): Promise<CreateBookingActionResult> {
  const parsed = bookingFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  // slotId är instanten direkt (page-data.ts sätter BookingSlot.id = start):
  // saknas den kan motorn inte räkna ut en starttid.
  if (!parsed.data.slotId) return { ok: false, code: "invalid_input" };

  const ip = await getClientIp();
  const ipAllowed = await hitRateLimit({
    scope: "booking:ip",
    subject: ip,
    windowSeconds: BOOKING_IP_WINDOW_SECONDS,
    max: BOOKING_IP_MAX,
  });
  if (!ipAllowed) return { ok: false, code: "rate_limited" };

  const business = await resolveBusinessBySlug(slug);
  if (!business) return { ok: false, code: "not_found" };

  const now = systemClock();
  const result = await createCustomerBooking({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    staffId: parsed.data.staffId,
    start: parsed.data.slotId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    idempotencyKey: parsed.data.idempotencyKey,
    // WP-40 (D-031): servern (`createIn`) validerar på nytt mot sin egen
    // frågelista för tjänsten — klientens `answers` litas aldrig på.
    answers: parsed.data.answers,
    offerToken: opts.offerToken,
    ...(opts.marketplaceOfferId
      ? { marketplaceOfferId: opts.marketplaceOfferId }
      : {}),
    now,
  });
  if (!result.ok) return { ok: false, code: result.error };
  // WP-16: bekräftelsen skickas direkt efter svaret, utan att vänta på cron.
  void kickOutbox();

  // Granskningsfynd: bokningen är redan committad här — svara alltid att den
  // lyckades, även om samtycket (en separat transaktion, submit.ts) inte
  // sparas. Ett omförsök (samma idempotencyKey) når `createCustomerBooking`s
  // idempotens-gren och kör den här skrivningen igen. `pgErrorCode` läser
  // bara SQLSTATE (aldrig namn/telefon/e-post) — se src/server/db/errors.ts.
  try {
    await saveBookingConsent({
      businessId: business.id,
      customerId: result.value.customerId,
      marketing: parsed.data.marketing,
      whatsapp: parsed.data.whatsapp,
      consentVersion: parsed.data.consentVersion,
      now,
    });
  } catch (e) {
    // Utanför src/server (console.* är bara förbjudet där) — ingen persondata.
    console.error(
      "createBooking: kunde inte spara samtycket (bokningen lyckades ändå)",
      {
        businessId: business.id,
        bookingId: result.value.id,
        sqlstate: pgErrorCode(e),
      },
    );
  }

  // WP-67 (D-054): inloggad med kundkonto → bokningen blir kontots
  // (`account_user_id`) och kundraden kopplas. Fel här påverkar aldrig bokningen.
  try {
    const account = opts.noAccount ? null : await optionalAccount();
    if (account) {
      await claimBookingForAccount(
        account.userId,
        business.id,
        result.value.id,
      );
      await linkAccountRows(account.userId);
    }
  } catch {
    // Kopplas ändå vid nästa besök i kontot (`loadMyBookings`).
  }

  // `discountClp > 0` = medlemspris eller (WP-31) erbjudande, se
  // `discountReason`. Vid ett idempotent omförsök läses förmånstexten inte
  // om → `null`. `memberDiscountMinor` bär rabatten oavsett orsak.
  const { discountClp, memberBenefitText, discountReason, manageToken } =
    result.value;
  // WP-61: tom sträng vid ett idempotent omförsök (`findByIdempotencyKey`,
  // create.ts, kan inte återskapa den hashade token) — `undefined` i stället
  // för `""` så `Confirmation` kan avgöra med ett enkelt `if (manageToken)`.
  const manageTokenOrUndefined = manageToken !== "" ? manageToken : undefined;
  // WP-30: flashpriset syns redan på tiden (servern satte `priceClp` på
  // sloten) — ingen extra rabattrad i bekräftelsen.
  if (discountClp > 0 && discountReason !== "flash") {
    return {
      ok: true,
      memberDiscountMinor: discountClp,
      // D-060: marknadsplatsens erbjudande visas som "erbjudande" i bekräftelsen.
      discountReason:
        discountReason === "marketplace"
          ? "offer"
          : (discountReason ?? "member"),
      memberBenefitText: memberBenefitText ?? null,
      manageToken: manageTokenOrUndefined,
    };
  }
  return { ok: true, manageToken: manageTokenOrUndefined };
}

/**
 * WP-23 (F8): kunden går med i väntelistan när dagen är full
 * (`loadReservaPageData` skickar fulla dagar som `state: "full"`). Formuläret
 * valideras här; `joinWaitlist` i `src/server/waitlist/join.ts` gör rate
 * limit per IP, kontrollerar att dagen verkligen är full, skapar/återanvänder
 * kunden och loggar samtycket `waitlist`.
 */
export async function joinWaitlist(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = waitlistFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const r = await joinWaitlistServer(slug, {
    serviceId: parsed.data.serviceId,
    day: parsed.data.date,
    staffId: parsed.data.staffId === "any" ? null : parsed.data.staffId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    ...(parsed.data.email ? { email: parsed.data.email } : {}),
    consentWaitlist: parsed.data.termsAccepted,
    consentWhatsapp: parsed.data.whatsapp,
    idempotencyKey: parsed.data.idempotencyKey,
  });
  // Inget meddelande köas vid anmälan (bara när en tid erbjuds).
  if (r.ok) return { ok: true };
  // `not_full`: dagen fick en ledig tid medan formuläret var öppet — samma
  // besked som en tid som inte längre går ("slot_taken" → tillbaka till valen).
  return {
    ok: false,
    code: r.code === "not_full" ? "slot_taken" : r.code,
  };
}
