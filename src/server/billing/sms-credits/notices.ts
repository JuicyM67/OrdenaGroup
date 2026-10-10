import "server-only";

import { SMS_QUOTA_WARN_RATIO } from "@/config/sms-credits";
import { APP_TZ } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

/**
 * WP-76 (D-053): varningar till ägaren om sms. Två typer, högst en per typ
 * och kalendermånad (i installationens tidszon) via `dedupe_key`:
 *  - `smsCuota80`: 80 % av planens månadskvot är använd.
 *  - `smsAgotados`: kvot och krediter är slut, sms blockeras (e-post är reserven).
 * Mejlet köas i `message_outbox` (regel 4) i samma transaktion som
 * reservationen; klockan i appen härleds ur samma rader (ingen egen tabell,
 * samma mönster som D-036). Ingen kundinformation, bara siffror.
 */

export type SmsNoticeTemplate = "smsCuota80" | "smsAgotados";

const DEDUPE_PREFIX: Record<SmsNoticeTemplate, string> = {
  smsCuota80: "sms_quota_80",
  smsAgotados: "sms_empty",
};

/** `true` om reservationen tar användningen från under till minst 80 %. */
export function crossesWarnLevel(
  used: number,
  taking: number,
  max: number,
): boolean {
  if (max <= 0 || taking <= 0) return false;
  const level = Math.ceil(max * SMS_QUOTA_WARN_RATIO);
  return used < level && used + taking >= level;
}

export async function enqueueSmsNoticeIn(
  q: Queryable,
  businessId: string,
  template: SmsNoticeTemplate,
  data: { usado: number; max: number },
): Promise<void> {
  await q.query(
    `insert into public.message_outbox
       (business_id, booking_id, channel, recipient_kind, template, payload,
        category, dedupe_key)
     values ($1, null, 'email', 'owner', $2, $3::jsonb, 'utility',
             $4 || ':' || $6 || ':' || to_char(now() at time zone $5, 'YYYY-MM'))
     on conflict (dedupe_key) do nothing`,
    [
      businessId,
      template,
      JSON.stringify(data),
      DEDUPE_PREFIX[template],
      APP_TZ,
      businessId,
    ],
  );
}

export async function hasEverBoughtCreditsIn(
  q: Queryable,
  businessId: string,
): Promise<boolean> {
  const r = await q.query<{ ok: boolean }>(
    `select exists (
       select 1 from public.sms_credit_purchases
        where business_id = $1 and paid_at is not null
     ) as ok`,
    [businessId],
  );
  return r.rows[0]?.ok ?? false;
}

export type SmsBellNotice = { readonly kind: SmsNoticeTemplate };

/** Klockan: månadens varning, så länge företaget saknar krediter (har det
 * köpt efter varningen är den inte längre aktuell). Högst en notis. */
export function loadSmsBellNotices(
  businessId: string,
): Promise<SmsBellNotice[]> {
  return withServiceTx(async (q) => {
    // Payloaden töms när mejlet skickats, så notisen bär bara typen.
    const r = await q.query<{ template: SmsNoticeTemplate; balance: number }>(
      `select m.template,
              (select balance from private.sms_credit_balance($1)) as balance
         from public.message_outbox m
        where m.business_id = $1
          and m.recipient_kind = 'owner'
          and m.dedupe_key in (
            'sms_quota_80:' || $3 || ':' || to_char(now() at time zone $2, 'YYYY-MM'),
            'sms_empty:' || $3 || ':' || to_char(now() at time zone $2, 'YYYY-MM'))
        order by (m.template = 'smsAgotados') desc
        limit 1`,
      [businessId, APP_TZ, businessId],
    );
    const row = r.rows[0];
    if (!row || row.balance > 0) return [];
    return [{ kind: row.template }];
  });
}
