import "server-only";

import { market as installationMarket, type Market } from "@/config/brand";
import { LEGAL_VERSION } from "@/i18n/legal/types";
import { withServiceTx } from "@/server/db/tx";
import { recordConsent } from "@/server/privacy/consent";
import { err, type Result } from "@/server/scheduling/result";

import { createBooking } from "./create";
import type { BookingError, CreatedBooking } from "./types";

export type CreateCustomerBookingInput = {
  businessId: string;
  serviceId: string;
  staffId: string;
  /** ISO-instant (kommer direkt från `BookingSlot.id`, se page-data.ts). */
  start: string;
  name: string;
  phone: string;
  email?: string | undefined;
  /** Ett omförsök (samma nyckel) returnerar den befintliga bokningen som
   * lyckad i stället för att försöka skapa en till (granskningsfynd, se
   * `create.ts`). Klientgenererad (`crypto.randomUUID()`, form-schema.ts). */
  idempotencyKey: string;
  /** WP-40: svar på bokningsfrågorna, `{ [questionId]: värde }`. Valideras
   * av servern mot tjänstens frågor (`createIn`); fel → `invalid_input`. */
  answers?: Record<string, unknown> | undefined;
  now: Date;
  /** Installationens marknad; injiceras bara i tester. */
  market?: Market | undefined;
};

/** D-030: i CL krävs kundens e-post i Reserva tills WhatsApp finns (e-post
 * är den enda kanalen för bekräftelse och påminnelse). SE oförändrat. */
export function customerEmailRequired(m: Market): boolean {
  return m === "CL";
}

/**
 * Kundens bokning från `/{slug}` (WP-20): anropar bara motorns
 * `createBooking`. I CL krävs e-post (D-030) → annars `invalid_input`. Samtycket sparas separat av `saveBookingConsent` — se den
 * funktionen för varför de inte körs i en enda transaktion.
 */
export async function createCustomerBooking(
  input: CreateCustomerBookingInput,
): Promise<Result<CreatedBooking, BookingError>> {
  const m = input.market ?? installationMarket;
  if (customerEmailRequired(m) && !input.email?.trim()) {
    return err("invalid_input");
  }
  return createBooking(
    {
      serviceId: input.serviceId,
      staffId: input.staffId,
      start: input.start,
      customer: {
        phone: input.phone,
        name: input.name,
        email: input.email,
      },
      idempotencyKey: input.idempotencyKey,
      answers: input.answers ?? {},
    },
    {
      businessId: input.businessId,
      actor: { kind: "customer" },
      now: input.now,
    },
  );
}

export type SaveBookingConsentInput = {
  businessId: string;
  customerId: string;
  marketing: boolean;
  consentVersion: string;
  now: Date;
};

/**
 * Sparar samtycket på kundraden i en egen transaktion, efter att bokningen
 * redan committats (`createCustomerBooking`), och loggar det i den
 * append-only samtyckesloggen (`consent_events`, WP-26 steg 1) i SAMMA
 * transaktion: `terms` (alltid, rutan är obligatorisk i Reserva) och
 * `marketing` (`granted` = rutans värde, så att även ett nej finns som
 * bevis). Loggens version är `LEGAL_VERSION` (serverns egen, aldrig
 * klientens `consentVersion`).
 *
 * WP-26 (IDEAS 2026-09-28, security-reviewer WP-20): Reserva verifierar inte
 * telefonnumret, så den som bokar kan vara vem som helst. Har kundraden redan
 * ett samtycke som ägaren registrerat (`consent_channel = 'manual'`) skrivs
 * cachen på `customers` INTE över — ägarens register gäller. Händelsen loggas
 * ändå (kanal `web`), eftersom den faktiskt skickades; loggen är historik,
 * cachen är det som styr utskick.
 *
 * Känd begränsning (dokumenterad i docs/tasks/plans/WP-20.md): inte atomisk
 * med bokningen. Anroparen (`src/app/[slug]/actions.ts`) fångar ett fel här
 * själv och svarar ändå att bokningen lyckades — kunden har trots allt en
 * riktig bokning, och att visa ett fel skulle bara bjuda in ett omförsök som
 * (via `idempotencyKey`) ändå bara försöker spara samtycket på nytt, inte
 * skapa en andra bokning. Motorns egen transaktion (bokning + kund) är
 * alltid atomisk.
 *
 * Säkerhetsgranskning WP-26 (punkt 10): `customers.consent_version` sätts
 * till `LEGAL_VERSION` (serverns egen konstant), aldrig till
 * `input.consentVersion` — annars kunde en klient skriva ett godtyckligt
 * versionsvärde in i cachen (fältet finns kvar i indatatypen bara för att
 * inte bryta anroparen, `src/app/[slug]/actions.ts`, som ligger utanför den
 * här WP:ns mapp-ägarskap; värdet läses inte längre).
 */
export async function saveBookingConsent(
  input: SaveBookingConsentInput,
): Promise<void> {
  const nowIso = input.now.toISOString();
  await withServiceTx(async (q) => {
    const exists = await q.query(
      `select 1 from public.customers
        where business_id = $1 and id = $2 and anonymized_at is null`,
      [input.businessId, input.customerId],
    );
    if (exists.rows.length === 0) return;

    await q.query(
      `update public.customers
          set consent_terms_at = $3,
              consent_marketing_at = $4,
              consent_version = $5,
              consent_channel = 'web'
        where business_id = $1 and id = $2
          and consent_channel is distinct from 'manual'`,
      [
        input.businessId,
        input.customerId,
        nowIso,
        input.marketing ? nowIso : null,
        LEGAL_VERSION,
      ],
    );

    const base = {
      businessId: input.businessId,
      customerId: input.customerId,
      subject: "customer",
      version: LEGAL_VERSION,
      channel: "web",
    } as const;
    await recordConsent(q, { ...base, kind: "terms", granted: true });
    await recordConsent(q, {
      ...base,
      kind: "marketing",
      granted: input.marketing,
    });
  });
}
