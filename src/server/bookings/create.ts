import "server-only";

import { can } from "@/config/plans";
import type { E164 } from "@/lib/format/phone";
import { validateAnswers } from "@/lib/validation/booking-questions";
import { saveBookingAnswersIn } from "@/server/booking-questions/answers";
import { getQuestionsForServiceIn } from "@/server/booking-questions/catalog";
import {
  isIdempotencyKeyViolation,
  isNoOverlapViolation,
} from "@/server/db/errors";
import { lockStaffForBooking } from "@/server/db/locks";
import type { Queryable } from "@/server/db/pool";
import { toTstzrange } from "@/server/db/tstzrange";
import { savepoint } from "@/server/db/tx";
import { staffOffersService } from "@/server/scheduling/availability";
import { checkStart } from "@/server/scheduling/core/validate";
import { loadSnapshot } from "@/server/scheduling/load";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  createBookingRequestSchema,
  createContextSchema,
  parseContext,
  type CreateBookingRequest,
  type CreateContext,
} from "@/server/scheduling/schemas";
import type { Actor, StaffChoice } from "@/server/scheduling/types";

import { actorMember, canManageStaffBookings } from "./authz";
import { findOrCreateCustomer } from "./customers";
import { emitBookingEvent } from "./events";
import { memberDiscountIn, memberDiscountMinor } from "./member";
import { offerDiscountIn, redeemOfferIn } from "./offer";
import { createManageToken } from "./token";
import type { BookingError, CreatedBooking } from "./types";

const MIN = 60_000;

type BookingSource = "web" | "manual" | "waitlist";

/** Källan sätts av servern: kund = web, ägare = manual, väntelista via ctx. */
function sourceFor(
  actor: Actor,
  ctxSource: "waitlist" | undefined,
): BookingSource {
  if (ctxSource) return ctxSource;
  return actor.kind === "owner" ? "manual" : "web";
}

/**
 * Skapar en bokning (F4). Klientens val är bara en önskan (inv. 6): allt
 * räknas om här i en transaktion — tjänst och profesional i företaget,
 * företagets status (kund), notice/horisont (kund), öppettider, frånvaro,
 * bokningar och buffert, och priset från services.price_clp.
 *
 * Samtidighet: kandidaterna låses per profesional (advisory lock, sorterad
 * ordning) före insert, så att två krockande inserts serialiseras och ger
 * 23P01 i stället för deadlock. `no_overlap` har sista ordet (23P01 → nästa
 * "any"-kandidat eller `slot_taken`). 40P01/40001 kör om hela transaktionen
 * en gång och ger sedan `slot_taken`.
 *
 * WP-45 (D-033): kundens bokning från bokningssidan (`source = 'web'`) blir
 * `requested` om inte företaget har `auto_confirm_bookings`; ägarens
 * (manuella) bokningar är alltid `confirmed`. WP-23: väntelistans bokning
 * (`source = 'waitlist'`, kunden tar erbjudandet) följer samma regel som
 * webben. En förfrågan blockerar tiden precis som en bekräftad (`no_overlap`).
 * `deposit_clp = 0` (WP-25/30).
 *
 * WP-54: `discount_clp` = medlemsrabatten (`./member.ts`) om kunden
 * (business_id + telefon) är medlem och företaget har `member_discount_pct`,
 * annars 0. Gäller alla källor (web, manuell, väntelista). Inga andra
 * rabatter sätts vid skapandet; skulle det komma fler tas den största
 * (`Math.max`), de kombineras aldrig.
 *
 * WP-31 (F14): `offerToken` (erbjudandelänken) valideras här i
 * transaktionen (`./offer.ts`, raden låses). Gäller bara om bokande kund är
 * mottagaren; största rabatten vinner (lika → medlem, token förbrukas inte).
 * Vinner erbjudandet sätts `campaign_recipient_id` och mottagarraden
 * markeras inlöst i samma transaktion. Ogiltig/förbrukad token → bokningen
 * skapas ändå, utan erbjudanderabatt (aldrig ett fel för kunden).
 *
 * WP-30 (F13): matchar bokningen en aktiv flash-tid (samma profesional,
 * start i [starts_at, ends_at), tjänsten tillåten) låses raden, flash-
 * profesionalen provas först ("Cualquiera"), och flash-tiden blir `booked`
 * (`booking_id`) i samma transaktion; `bookings.flash_slot_id` sätts.
 * Rabatten = största av medlem/flash/erbjudande (lika: medlem, flash,
 * erbjudande — token förbrukas bara när erbjudandet ensamt är störst).
 */
export async function createBooking(
  request: CreateBookingRequest,
  ctx: CreateContext,
): Promise<Result<CreatedBooking, BookingError>> {
  const c = parseContext(createContextSchema, ctx);
  const p = createBookingRequestSchema.safeParse(request);
  if (!p.success) return err("invalid_input");
  const input = {
    ...p.data,
    businessId: c.businessId,
    actor: c.actor,
    now: c.now,
    source: sourceFor(c.actor, c.source),
  };
  const result = await runAs(input.actor, (q) => createIn(q, input), {
    onConflict: err("slot_taken"),
    onForbidden: err("forbidden"),
  });
  // WP-16: efter commit (enqueueBookingEvent kastar aldrig). Ett omförsök med
  // samma idempotensnyckel ger den befintliga bokningen utan token
  // (`manageToken === ""`) och köar inget nytt — första försöket gjorde det.
  if (result.ok && result.value.manageToken !== "") {
    await emitBookingEvent({
      type: "created",
      bookingId: result.value.id,
      businessId: result.value.businessId,
      token: result.value.manageToken,
      by: input.actor.kind,
      status: result.value.status,
    });
  }
  return result;
}

export type CreateInput = {
  businessId: string;
  serviceId: string;
  staffId: StaffChoice;
  start: Date;
  customer: { phone: E164; name: string; email?: string | undefined };
  notes?: string | undefined;
  source: BookingSource;
  actor: Actor;
  now: Date;
  /** WP-20 (granskningsfynd): ett omförsök med samma nyckel returnerar den
   * befintliga bokningen i stället för att försöka skapa en till. */
  idempotencyKey?: string | undefined;
  /** WP-40 (D-031): `{ [questionId]: värde }`. Kund: valideras alltid (tomt
   * = inga svar, obligatoriska frågor krävs). Ägare: bara om satt (manuell
   * bokning frågar inte). Fel → `invalid_input`, inget sparas. */
  answers?: Record<string, unknown> | undefined;
  /** WP-31: erbjudandelänkens token (klartext). */
  offerToken?: string | undefined;
  /** WP-23: väntelisteposten som bokningen kommer från (`claimWaitlistOffer`). */
  waitlistEntryId?: string | undefined;
};

type IdempotencyRow = {
  id: string;
  staff_id: string;
  service_id: string;
  customer_id: string;
  status: CreatedBooking["status"];
  s: number;
  pe: number;
  price_clp: number;
  discount_clp: number;
  campaign_recipient_id: string | null;
  flash_slot_id: string | null;
};

/**
 * Den bokning som redan finns för `(business_id, idempotencyKey)` — ett
 * omförsök (svaret tappades förra gången, men bokningen committades).
 * `manageToken` kan inte återskapas (bara hashen sparas, R6/qa) och lämnas
 * tom (`""`): `src/app/[slug]/actions.ts` gör om det till `undefined` innan
 * det når `BookingActionOk.manageToken` (WP-61) — "Ver mi reserva" döljs då
 * i stället för att länka till en tom/felaktig token.
 */
async function findByIdempotencyKey(
  q: Queryable,
  businessId: string,
  idempotencyKey: string,
): Promise<CreatedBooking | undefined> {
  const r = await q.query<IdempotencyRow>(
    `select id, staff_id, service_id, customer_id, price_clp, discount_clp,
            campaign_recipient_id, flash_slot_id, status::text as status,
            extract(epoch from lower(period))::float8 * 1000 as s,
            extract(epoch from upper(period))::float8 * 1000 as pe
       from public.bookings
      where business_id = $1 and idempotency_key = $2`,
    [businessId, idempotencyKey],
  );
  const x = r.rows[0];
  if (!x) return undefined;
  return {
    id: x.id,
    businessId,
    staffId: x.staff_id,
    serviceId: x.service_id,
    customerId: x.customer_id,
    start: new Date(Math.round(x.s)).toISOString(),
    end: new Date(Math.round(x.pe)).toISOString(),
    priceClp: x.price_clp,
    discountClp: x.discount_clp,
    ...(x.discount_clp > 0
      ? {
          discountReason:
            x.campaign_recipient_id !== null
              ? ("offer" as const)
              : x.flash_slot_id !== null
                ? ("flash" as const)
                : ("member" as const),
        }
      : {}),
    depositClp: 0,
    status: x.status,
    manageToken: "",
  };
}

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function createIn(
  q: Queryable,
  input: CreateInput,
): Promise<Result<CreatedBooking, BookingError>> {
  const start = input.start.getTime();

  // Omförsök (granskningsfynd): kollas allra först, före `loadSnapshot`/
  // `checkStart`. En riktig omförsök (svaret tappades, klienten skickar om
  // exakt samma formulär) skulle annars underkännas av motorns egen
  // tillgänglighetskontroll — den redan committade bokningen gör ju att
  // exakt den kandidaten/tiden inte längre "fits" (`checkStart` ser den som
  // upptagen av sig själv och svarar `slot_taken`, aldrig en nyckelkrock).
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(
      q,
      input.businessId,
      input.idempotencyKey,
    );
    if (existing) return ok(existing);
  }

  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { around: input.start },
  });
  if (!loaded.ok) return loaded;
  if (input.actor.kind === "customer" && !loaded.value.businessActive) {
    return err("business_unavailable");
  }
  if (!staffOffersService(loaded.value, input.staffId)) {
    return err("service_not_offered");
  }
  const { snapshot, priceClp, autoConfirm } = loaded.value;
  const status: CreatedBooking["status"] =
    input.source !== "manual" && input.actor.kind === "customer" && !autoConfirm
      ? "requested"
      : "confirmed";

  // WP-40: svaren valideras mot serverns frågelista för tjänsten (klientens
  // lista litas aldrig på) — okänd fråga, fråga från ett annat företag eller
  // en annan tjänst avvisas. Skrivs efter insert, i samma transaktion.
  // WP-23: väntelistans bokning (kunden tar erbjudandet med ett klick)
  // ställer inga frågor — som ägarens manuella bokning.
  const mustAnswer =
    (input.actor.kind === "customer" && input.source !== "waitlist") ||
    input.answers !== undefined;
  const questions = mustAnswer
    ? await getQuestionsForServiceIn(q, input.businessId, input.serviceId)
    : [];
  const validated = mustAnswer
    ? validateAnswers(questions, input.answers)
    : { ok: true as const, value: [] };
  if (!validated.ok) return err("invalid_input");

  const check = checkStart(
    {
      snapshot,
      staff: input.staffId,
      audience: input.actor.kind,
      now: input.now,
    },
    start,
  );
  if (!check.ok) return check;

  // WP-46: en medlem (ägare/personal) får bara boka på profesionales hen
  // får hantera (`./authz.ts`); "Cualquiera" filtreras till dem. OBS: att
  // skapa/återanvända kundraden kräver dessutom `can_manage_all_bookings`
  // i RLS (policyn "manage customers insert") — en 42501 därifrån blir
  // `forbidden` via `runAs({ onForbidden })`.
  const member = await actorMember(q, input.actor, input.businessId);
  const allowed =
    member === undefined
      ? check.value
      : check.value.filter((id) => canManageStaffBookings(member, id));
  if (allowed.length === 0) return err("forbidden");

  await lockStaffForBooking(q, input.businessId, allowed);

  // WP-30: aktiva flash-tider som bokningen träffar (raden låst). Flash-
  // profesionalen provas först så att "Cualquiera" landar på flash-tiden.
  const flashes = await matchingFlashSlotsIn(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    staffIds: allowed,
    start,
  });
  const flashByStaff = new Map(flashes.map((f) => [f.staffId, f]));
  const candidates = [
    ...allowed.filter((id) => flashByStaff.has(id)),
    ...allowed.filter((id) => !flashByStaff.has(id)),
  ];

  const customerId = await findOrCreateCustomer(
    q,
    input.businessId,
    input.customer,
  );
  // WP-54: servern avgör medlemsrabatten (aldrig klienten). Ingen annan
  // rabatt sätts här — största vinner om fler tillkommer, aldrig summan.
  const memberDiscount = await memberDiscountIn(
    q,
    input.businessId,
    customerId,
    priceClp,
  );
  const offer = input.offerToken
    ? await offerDiscountIn(q, {
        businessId: input.businessId,
        customerId,
        token: input.offerToken,
        priceMinor: priceClp,
        now: input.now,
      })
    : undefined;
  const memberMinor = Math.max(0, memberDiscount?.discountMinor ?? 0);
  const offerMinor = offer?.discountMinor ?? 0;
  // Rabatten beror på profesionalen (flash-tiden gäller bara hens tid).
  const pricingFor = (staffId: string): Pricing => {
    const flash = flashByStaff.get(staffId);
    return choosePricing({
      memberMinor,
      offerMinor,
      flashMinor: flash ? memberDiscountMinor(priceClp, flash.pct) : 0,
      flashSlotId: flash?.id ?? null,
      offerRecipientId: offer?.recipientId ?? null,
    });
  };
  const { token, hash } = createManageToken();
  const periodEnd = start + snapshot.service.durationMin * MIN;
  const blockedEnd = periodEnd + snapshot.service.bufferAfterMin * MIN;

  let booked: { id: string; staffId: string; pricing: Pricing } | undefined;
  for (const staffId of candidates) {
    const pricing = pricingFor(staffId);
    try {
      const id = await savepoint(q, async () => {
        const r = await q.query<{ id: string }>(
          `insert into public.bookings
             (business_id, staff_id, service_id, customer_id, period, blocked,
              status, source, price_clp, discount_clp, deposit_clp,
              manage_token_hash, notes, idempotency_key, created_at,
              campaign_recipient_id, flash_slot_id, waitlist_entry_id,
              contact_email)
           values ($1, $2, $3, $4, $5::tstzrange, $6::tstzrange,
                   $12::public.booking_status, $7::public.booking_source,
                   $8, $14, 0, $9, $10, $11, $13, $15, $16, $17, $18)
           returning id`,
          [
            input.businessId,
            staffId,
            input.serviceId,
            customerId,
            toTstzrange({ start, end: periodEnd }),
            toTstzrange({ start, end: blockedEnd }),
            input.source,
            priceClp,
            hash,
            input.notes ?? null,
            input.idempotencyKey ?? null,
            status,
            // WP-45: förfrågans 24 h räknas från den injicerade klockan.
            input.now,
            pricing.discountClp,
            pricing.campaignRecipientId,
            pricing.flashSlotId,
            input.waitlistEntryId ?? null,
            // WP-67 (D-054, säkerhetsgranskning B1): e-posten som angavs vid
            // JUST den här bokningen — kundkonton ser bokningar per bokning,
            // inte per kundrad (som matchas på telefon).
            input.customer.email?.trim() || null,
          ],
        );
        return r.rows[0]!.id;
      });
      booked = { id, staffId, pricing };
      break;
    } catch (e) {
      // Nyckelkrock (sällsynt här — den vanliga vägen fångas redan av
      // kontrollen ovan, före låsningen): en konkurrerande omförsök hann
      // committa mellan den kontrollen och det här insert-försöket.
      if (isIdempotencyKeyViolation(e)) {
        const existing = input.idempotencyKey
          ? await findByIdempotencyKey(
              q,
              input.businessId,
              input.idempotencyKey,
            )
          : undefined;
        if (existing) return ok(existing);
        throw e; // raden borta samtidigt (extremt osannolikt): programmeringsfel.
      }
      if (!isNoOverlapViolation(e)) throw e;
      // Någon hann före: prova nästa profesional ("Cualquiera"). Kan också
      // bero på en konkurrerande omförsök med samma nyckel (samma kandidat,
      // samma tid) — sista kontrollen nedan täcker det fallet.
    }
  }
  if (booked) {
    // Samma transaktion som bokningen: ett fel här kastas och rullar tillbaka
    // även bokningen. Ingen svarsrad skrivs för en bokning som aldrig blev
    // av (23P01 ovan) eller för ett omförsök (returnerat före insert).
    const { discountClp, discountReason, campaignRecipientId, flashSlotId } =
      booked.pricing;
    if (flashSlotId !== null) {
      // Raden är låst sedan `matchingFlashSlotsIn`; villkoret är sista spärren.
      const r = await q.query(
        `update public.flash_slots
            set status = 'booked', booking_id = $3
          where business_id = $1 and id = $2 and status = 'active'`,
        [input.businessId, flashSlotId, booked.id],
      );
      if ((r.rowCount ?? 0) !== 1) {
        throw new Error("createIn: flash-tiden redan bokad");
      }
    }
    if (campaignRecipientId !== null) {
      // Raden är låst sedan `offerDiscountIn`; villkoret är sista spärren.
      // Hann någon ändå före rullas hela bokningen tillbaka hellre än att
      // ge rabatten två gånger (kastar → transaktionen avbryts).
      const redeemed = await redeemOfferIn(q, {
        businessId: input.businessId,
        recipientId: campaignRecipientId,
        bookingId: booked.id,
        now: input.now,
      });
      if (!redeemed) throw new Error("createIn: erbjudandet redan inlöst");
    }
    if (validated.value.length > 0) {
      await saveBookingAnswersIn(q, {
        businessId: input.businessId,
        bookingId: booked.id,
        customerId,
        questions,
        answers: validated.value,
      });
    }
    return ok({
      id: booked.id,
      businessId: input.businessId,
      staffId: booked.staffId,
      serviceId: input.serviceId,
      customerId,
      start: new Date(start).toISOString(),
      end: new Date(periodEnd).toISOString(),
      priceClp,
      discountClp,
      ...(discountReason ? { discountReason } : {}),
      ...(discountReason === "member" && memberDiscount
        ? { memberBenefitText: memberDiscount.benefitText }
        : {}),
      depositClp: 0,
      status,
      manageToken: token,
    });
  }
  // Sista skyddsnätet (granskningsfynd): alla kandidater gav `no_overlap`
  // mot en konkurrerande omförsök som committade EFTER kontrollen ovan men
  // FÖRE insert-försöken — den ger alltså aldrig en 23505 att fånga i
  // `catch`, bara `no_overlap` mot sin egen, redan committade rad.
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(
      q,
      input.businessId,
      input.idempotencyKey,
    );
    if (existing) return ok(existing);
  }
  return err("slot_taken");
}

type Pricing = {
  discountClp: number;
  discountReason: CreatedBooking["discountReason"];
  campaignRecipientId: string | null;
  flashSlotId: string | null;
};

/**
 * Största rabatten vinner, aldrig summan. Lika → medlem, sedan flash, sist
 * erbjudandet (token förbrukas bara när erbjudandet ensamt är störst).
 * `flashSlotId` sätts alltid när bokningen träffar en flash-tid (tiden är
 * förbrukad även om en annan rabatt var större).
 */
export function choosePricing(x: {
  memberMinor: number;
  offerMinor: number;
  flashMinor: number;
  flashSlotId: string | null;
  offerRecipientId: string | null;
}): Pricing {
  const best = Math.max(0, x.memberMinor, x.offerMinor, x.flashMinor);
  const reason: CreatedBooking["discountReason"] =
    best === 0
      ? undefined
      : x.memberMinor === best
        ? "member"
        : x.flashMinor === best
          ? "flash"
          : "offer";
  return {
    discountClp: best,
    discountReason: reason,
    campaignRecipientId: reason === "offer" ? x.offerRecipientId : null,
    flashSlotId: x.flashSlotId,
  };
}

type FlashMatch = { id: string; staffId: string; pct: number };

/**
 * WP-30: aktiva flash-tider för (en av) profesionalerna där `start` ligger i
 * [starts_at, ends_at) och tjänsten är tillåten (`service_ids` null = alla).
 * Låser raderna (`for update`) så att två samtidiga bokningar av samma
 * flash-tid serialiseras (`no_overlap` avgör ändå vem som får tiden).
 */
/** WP-73 (D-048): har företagets plan blixttider? Annars ignoreras aktiva
 * flash-rader (pausade efter nedgradering, eller skrivna direkt). */
async function planHasFlashIn(
  q: Queryable,
  businessId: string,
): Promise<boolean> {
  const r = await q.query<{ plan: string }>(
    `select plan::text as plan from public.businesses where id = $1`,
    [businessId],
  );
  return can(r.rows[0]?.plan ?? "free", "flash");
}

async function matchingFlashSlotsIn(
  q: Queryable,
  input: {
    businessId: string;
    serviceId: string;
    staffIds: readonly string[];
    start: number;
  },
): Promise<FlashMatch[]> {
  if (!(await planHasFlashIn(q, input.businessId))) return [];
  const r = await q.query<{ id: string; staff_id: string; pct: number }>(
    `select id, staff_id, discount_pct::int as pct
       from public.flash_slots
      where business_id = $1 and status = 'active'
        and staff_id = any($2::uuid[])
        and starts_at <= $3::timestamptz and $3::timestamptz < ends_at
        and (service_ids is null or $4::uuid = any(service_ids))
      order by starts_at
      for update`,
    [
      input.businessId,
      input.staffIds,
      new Date(input.start).toISOString(),
      input.serviceId,
    ],
  );
  const seen = new Set<string>();
  const out: FlashMatch[] = [];
  for (const x of r.rows) {
    if (seen.has(x.staff_id)) continue; // no_overlap: högst en per profesional
    seen.add(x.staff_id);
    out.push({ id: x.id, staffId: x.staff_id, pct: x.pct });
  }
  return out;
}
