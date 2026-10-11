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
  customerFormSchemaFor,
  waitlistFormSchema,
} from "@/components/booking/form-schema";
import type {
  BookingActionErr,
  BookingActionOk,
  BookingActionResult,
} from "@/components/booking/types";
import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import { market } from "@/config/brand";
import { regalo } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
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
import { withServiceTx } from "@/server/db/tx";
import { kickOutbox } from "@/server/messaging/outbox";
import {
  cancelUnpaidBooking,
  createCheckoutForBooking,
  effectiveOnlinePayment,
} from "@/server/payments/stripe/checkout";
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
      /** WP-64 (D-044): Stripe Checkout-länk när kunden ska betala nu. */
      readonly checkoutUrl?: string;
      /** WP-77 (D-058): "Betalt med presentkort: …". */
      readonly giftCardNotice?: string;
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
    /** WP-69 (D-057): värdebeviset, bundet på servern (`page.tsx`). */
    voucher?: { id: string; userId: string } | undefined;
  } = {},
): Promise<CreateBookingActionResult> {
  const parsed = customerFormSchemaFor(market).safeParse(input);
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

  // WP-69: värdebeviset gäller bara för köparen som fortfarande är inloggad.
  if (opts.voucher) {
    const account = await optionalAccount();
    if (account?.userId !== opts.voucher.userId) {
      return { ok: false, code: "invalid_input" };
    }
  }

  // WP-77 (D-058): presentkortskod. Kodgissning: varje försök med kod
  // räknas per IP (10 / timme), samma fel för okänd/annat företag/utgången.
  const giftCardCode = parsed.data.giftCardCode;
  if (giftCardCode) {
    const allowed = await hitRateLimit({
      scope: "gift_card:booking:ip",
      subject: ip,
      windowSeconds: 60 * 60,
      max: 10,
    });
    if (!allowed) {
      return {
        ok: false,
        code: "invalid_input",
        giftCardError: "rate_limited",
      };
    }
  }

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
    ...(opts.voucher ? { voucher: opts.voucher } : {}),
    ...(giftCardCode && !opts.voucher ? { giftCardCode } : {}),
    now,
  });
  if (!result.ok) {
    if (
      result.error === "gift_card_invalid" ||
      result.error === "gift_card_empty"
    ) {
      return {
        ok: false,
        code: "invalid_input",
        // Säkerhetsgranskning #116 (KAN): samma fel för tomt och ogiltigt kort
        // (inget orakel för kodgissning).
        giftCardError: "invalid",
      };
    }
    return { ok: false, code: result.error };
  }
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
    const account = await optionalAccount();
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

  // WP-64 (D-044): betalning online. Servern avgör (företagets läge + att kontot
  // kan ta betalt); klientens `payOnline` räknas bara vid "Valfri". Belopp och
  // avgift räknas i `createCheckoutForBooking` ur bokningsraden, aldrig härifrån.
  // WP-69 (D-057): betald med värdebevis — ingen onlinebetalning, ingen rabattrad.
  if (opts.voucher) {
    return {
      ok: true,
      manageToken:
        result.value.manageToken !== "" ? result.value.manageToken : undefined,
    };
  }
  // WP-77 (D-058): betald (helt eller delvis) med presentkort — resten betalas
  // i salongen (ägarens beslut 2026-10-11), ingen onlinebetalning.
  if (result.value.giftCard) {
    const g = result.value.giftCard;
    return {
      ok: true,
      manageToken:
        result.value.manageToken !== "" ? result.value.manageToken : undefined,
      giftCardNotice: regalo.reserva.aviso({
        pagado: formatMoney(g.heldMinor),
        resto: formatMoney(
          Math.max(
            0,
            result.value.priceClp - result.value.discountClp - g.heldMinor,
          ),
        ),
        saldo: formatMoney(g.balanceMinor),
      }),
    };
  }
  const mode = await withServiceTx((q) =>
    effectiveOnlinePayment(q, business.id),
  );
  let checkoutUrl: string | undefined;
  if (
    mode === "required" ||
    (mode === "optional" && parsed.data.payOnline === true)
  ) {
    const checkout = await createCheckoutForBooking({
      businessId: business.id,
      bookingId: result.value.id,
      now,
    });
    if (checkout.ok) {
      checkoutUrl = checkout.url;
    } else if (
      mode === "required" &&
      (checkout.code === "failed" || checkout.code === "unavailable")
    ) {
      // Obligatorisk betalning gick inte att starta: släpp tiden i stället för
      // att lämna en obetald bokning kvar.
      await cancelUnpaidBooking(business.id, result.value.id, now);
      void kickOutbox();
      return { ok: false, code: "payment_unavailable" };
    }
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
  if (
    discountClp > 0 &&
    discountReason !== "flash" &&
    discountReason !== "voucher"
  ) {
    return {
      ok: true,
      memberDiscountMinor: discountClp,
      discountReason: discountReason ?? "member",
      memberBenefitText: memberBenefitText ?? null,
      manageToken: manageTokenOrUndefined,
      ...(checkoutUrl ? { checkoutUrl } : {}),
    };
  }
  return {
    ok: true,
    manageToken: manageTokenOrUndefined,
    ...(checkoutUrl ? { checkoutUrl } : {}),
  };
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
