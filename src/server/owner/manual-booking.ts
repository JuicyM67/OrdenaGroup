import "server-only";

/**
 * WP-21b: ägaren skapar en manuell bokning (telefon/walk-in) och flyttar en
 * befintlig bokning från Agenda. Ett tunt lager ovanpå motorn (`createBooking`/
 * `moveBooking`, `src/server/bookings/`), som redan vet hur den ska valideras
 * med `ctx.actor = { kind: "owner", userId }` (SCHEDULING.md, policy 5: ingen
 * `min_notice`/horisont för ägaren, och tiden behöver inte ligga på rutnätet —
 * `createBooking` testas redan med en lös minut, "16:07", i
 * `src/server/bookings/create.db.test.ts`). Den här filen validerar bara
 * gränsen mot klienten (otypad indata från dialogen) och slår ihop dag + tid
 * till en instant (`fromLocal`, "compatible" — samma som resten av systemet,
 * D-017/D-018; dialogen hanterar inte sommartidens två dygn per år särskilt).
 */
import { z } from "zod";

import { clientes } from "@/i18n";
import { APP_TZ, fromLocal } from "@/lib/format/dates";
import {
  localDateSchema,
  localTimeSchema,
  mobileInputSchema,
} from "@/lib/format/schemas";
import { createBooking } from "@/server/bookings/create";
import { moveBooking } from "@/server/bookings/move";
import type { BookingError } from "@/server/bookings/types";
import { withOwnerTx } from "@/server/db/tx";
import { err, ok, type Result } from "@/server/scheduling/result";
import { staffChoiceSchema } from "@/server/scheduling/schemas";

// z.guid() (inte z.uuid()): samma motiv som schemas.ts — seedens "vanity"-id
// (b0000000-…) har inte en giltig RFC 4122-version/variant.
const uuid = z.guid();

// ---------------------------------------------------------------------------
// Katalog (fyller <select> i dialogen "Nueva reserva")
// ---------------------------------------------------------------------------

export type BookableService = {
  id: string;
  name: string;
  /** Aktiva profesionales som utför tjänsten (staff_services ∩ staff.active). */
  staffIds: string[];
};

type CatalogRow = { id: string; name: string; staff_ids: string[] };

/** Företagets aktiva tjänster, med vilka profesionales som utför dem. */
export async function loadOwnerBookableCatalog(
  userId: string,
  businessId: string,
): Promise<BookableService[]> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<CatalogRow>(
      `select sv.id, sv.name,
              coalesce(
                array_agg(ss.staff_id) filter (where st.id is not null and st.active),
                '{}'
              ) as staff_ids
         from public.services sv
         left join public.staff_services ss
           on ss.business_id = sv.business_id and ss.service_id = sv.id
         left join public.staff st
           on st.business_id = sv.business_id and st.id = ss.staff_id
        where sv.business_id = $1 and sv.active
        group by sv.id, sv.name, sv.sort
        order by sv.sort, sv.name`,
      [businessId],
    );
    return r.rows.map((row) => ({
      id: row.id,
      name: row.name,
      staffIds: row.staff_ids,
    }));
  });
}

// ---------------------------------------------------------------------------
// Ny manuell bokning
// ---------------------------------------------------------------------------

const manualBookingInputSchema = z.strictObject({
  serviceId: uuid,
  staffId: staffChoiceSchema,
  date: localDateSchema,
  time: localTimeSchema,
  name: z
    .string()
    .trim()
    .min(1, { error: "name.empty" })
    .max(120, { error: "name.too_long" }),
  phone: mobileInputSchema,
  email: z.union([
    z.literal(""),
    z.email({ error: "email.invalid" }).max(254, { error: "email.invalid" }),
  ]),
  notes: z.string().trim().max(500).optional(),
  /** Rutan i `clientes.consentimientoManual` — aldrig förkryssad (UI). */
  consent: z.boolean(),
});

export type ManualBookingInput = z.input<typeof manualBookingInputSchema>;

export type ManualBookingOk = {
  bookingId: string;
  customerId: string;
  /** Var samtyckesrutan ikryssad? Styr om anroparen ska kalla på
   * `saveManualConsent` (se filkommentaren nedan). */
  consent: boolean;
};

/**
 * Skapar bokningen via motorn (source = "manual", automatiskt via aktören —
 * se `sourceFor` i `src/server/bookings/create.ts`). `now` kommer från
 * anroparen (`page.tsx`, samma mönster som `agenda.ts`/`hoy.ts` i den här
 * mappen — bara `src/server/scheduling/clock.ts` läser systemklockan direkt).
 *
 * Sparar INTE samtycket: anroparen ringer `saveManualConsent` separat, efter
 * att bokningen redan finns (`result.value.consent` säger om rutan var
 * ikryssad) — samma resonemang som `saveBookingConsent`
 * (`src/server/bookings/submit.ts`): inte atomiskt med bokningen, så att ett
 * fel där inte äter upp en redan skapad bokning. `console.*` är förbjudet i
 * `src/server` (hård regel), så felhanteringen (fånga + logga) hör hemma i
 * `page.tsx`-closuren, samma mönster som `src/app/[slug]/actions.ts`.
 */
export async function createManualBooking(
  userId: string,
  businessId: string,
  now: Date,
  input: unknown,
): Promise<Result<ManualBookingOk, BookingError>> {
  const p = manualBookingInputSchema.safeParse(input);
  if (!p.success) return err("invalid_input");

  const start = fromLocal(p.data.date, p.data.time, APP_TZ);

  const result = await createBooking(
    {
      serviceId: p.data.serviceId,
      staffId: p.data.staffId,
      start: start.toISOString(),
      customer: {
        phone: p.data.phone,
        name: p.data.name,
        email: p.data.email || undefined,
      },
      notes: p.data.notes,
    },
    { businessId, actor: { kind: "owner", userId }, now },
  );
  if (!result.ok) return result;

  return ok({
    bookingId: result.value.id,
    customerId: result.value.customerId,
    consent: p.data.consent,
  });
}

/**
 * Manuellt samtycke (telefon/walk-in): bara bekräftelser/påminnelser för den
 * här och kommande bokningar (`clientes.consentimientoManual`) — ALDRIG
 * `consent_marketing_at` (ägaren kan inte ge marknadsföringssamtycke å
 * kundens vägnar, D-014/säkerhetsgranskning, stärkt av triggern
 * `private.customers_guard_consent`, WP-21b). Kanal `manual` på en rad som
 * redan har `web`/`whatsapp` blockeras av samma trigger — updaten kastar
 * 42501 då, vilket rullar vidare som ett kastat fel (anroparen fångar det,
 * se filkommentaren ovan).
 */
export async function saveManualConsent(
  userId: string,
  businessId: string,
  customerId: string,
  now: Date,
): Promise<void> {
  await withOwnerTx(userId, (q) =>
    q.query(
      `update public.customers
          set consent_terms_at = $3, consent_version = $4, consent_channel = 'manual'
        where business_id = $1 and id = $2`,
      [
        businessId,
        customerId,
        now.toISOString(),
        clientes.consentimientoManual.version,
      ],
    ),
  );
}

// ---------------------------------------------------------------------------
// Mover (från popovern)
// ---------------------------------------------------------------------------

const moveOwnerInputSchema = z.strictObject({
  bookingId: uuid,
  date: localDateSchema,
  time: localTimeSchema,
});

export type MoveOwnerInput = z.input<typeof moveOwnerInputSchema>;
export type MoveOwnerOk = { bookingId: string };

/** Flyttar en bokning till en ny dag/tid, samma profesional (dialogen
 * erbjuder inte att byta profesional — utanför WP-21b:s scope). `now` kommer
 * från anroparen, se `createManualBooking` ovan. */
export async function moveOwnerBooking(
  userId: string,
  businessId: string,
  now: Date,
  input: unknown,
): Promise<Result<MoveOwnerOk, BookingError>> {
  const p = moveOwnerInputSchema.safeParse(input);
  if (!p.success) return err("invalid_input");

  const newStart = fromLocal(p.data.date, p.data.time, APP_TZ);
  const result = await moveBooking(
    { bookingId: p.data.bookingId, newStart: newStart.toISOString() },
    { businessId, actor: { kind: "owner", userId }, now },
  );
  if (!result.ok) return result;
  return ok({ bookingId: result.value.booking.id });
}
