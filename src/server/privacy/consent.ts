import "server-only";

import type { Queryable } from "@/server/db/pool";

import type { ConsentChannel, ConsentKind, ConsentSubject } from "./types";

/**
 * En rad i den append-only samtyckesloggen (WP-26 steg 1,
 * supabase/migrations/20260930080000_consent_events.sql). Anropas av
 * `/[slug]/actions.ts`-flödet, manuell bokning och onboarding — alltid inom
 * en `withServiceTx` (RLS/grants tillåter bara `service_role` att skriva,
 * `authenticated` har bara `select`).
 *
 * `customerId` utelämnas (eller `null`) för `subject: "owner"` — kolumnen
 * kräver `subject = "customer"` när den är satt (databasens check-constraint).
 */
export type RecordConsentInput = {
  businessId: string;
  customerId?: string | null;
  subject: ConsentSubject;
  kind: ConsentKind;
  version: string;
  channel: ConsentChannel;
  granted: boolean;
};

export async function recordConsent(
  q: Queryable,
  input: RecordConsentInput,
): Promise<void> {
  await q.query(
    `insert into public.consent_events
       (business_id, customer_id, subject, kind, version, channel, granted)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.businessId,
      input.customerId ?? null,
      input.subject,
      input.kind,
      input.version,
      input.channel,
      input.granted,
    ],
  );
}
