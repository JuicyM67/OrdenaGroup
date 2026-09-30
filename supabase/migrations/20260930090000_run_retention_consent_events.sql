-- WP-26 · Lagringsjobbet: samtyckesloggen sparas 5 år utan kundkoppling
-- F#: F12. Ägarens svar 2026-09-30: "samtyckeslogg 5 år utan koppling till
-- kund". `consent_events`-rader är redan frikopplade (customer_id null) av
-- `anonymizeCustomer` (src/server/privacy/customer.ts) och av steg 1 i
-- `private.run_retention()` (20260930080100_run_retention.sql) — den här
-- migrationen lägger till STEG 3: sådana rader raderas helt när de är äldre
-- än 5 år. Rader som fortfarande pekar på en levande kund (customer_id inte
-- null) rörs aldrig av den här klausulen.
--
-- Raderingen sker INUTI den befintliga `security definer`-funktionen (ägs av
-- postgres) — ingen ny/bredare grant på `consent_events` för `service_role`.
-- Tabellen förblir append-only utifrån (se 20260930080000_consent_events.sql:
-- `service_role` har fortfarande bara select/insert + kolumnbegränsad
-- `update (customer_id)`, ingen delete-rättighet).
--
-- `create or replace` kan inte ändra returtypen (en kolumn till); funktionen
-- droppas och skapas om med samma namn/argument.
drop function private.run_retention();

create function private.run_retention()
returns table (
  anonymized_customers integer,
  purged_outbox integer,
  purged_consent_events integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anonymized integer;
  v_purged_outbox integer;
  v_purged_consent integer;
begin
  -- 1. Kunder utan bokning på 24 månader: "utan bokning" = senaste boknings
  --    startdag (oavsett status), eller om kunden aldrig bokat, kundens
  --    created_at. Redan anonymiserade kunder (anonymized_at satt) rörs inte.
  --    Samma steg som anonymizeCustomer (src/server/privacy/customer.ts):
  --    nolla persondata + samtycke, radera svar, avbryt köade outbox-rader
  --    och töm deras payload, rensa manage_token_hash, koppla loss
  --    consent_events.
  with anonymized as (
    update public.customers c
       set name = null,
           phone_e164 = null,
           email = null,
           notes = null,
           consent_terms_at = null,
           consent_marketing_at = null,
           consent_version = null,
           consent_channel = null,
           anonymized_at = now()
     where c.anonymized_at is null
       and coalesce(
             (select max(lower(bk.period))
                from public.bookings bk
               where bk.business_id = c.business_id
                 and bk.customer_id = c.id),
             c.created_at
           ) < now() - interval '24 months'
    returning c.business_id, c.id
  ),
  cleared_customer_answers as (
    delete from public.customer_answers ca
     using anonymized a
     where ca.business_id = a.business_id
       and ca.customer_id = a.id
    returning 1
  ),
  cleared_booking_answers as (
    delete from public.booking_answers ba
     using public.bookings bk
     join anonymized a on a.business_id = bk.business_id and a.id = bk.customer_id
    where ba.business_id = bk.business_id
      and ba.booking_id = bk.id
    returning 1
  ),
  cancelled_outbox as (
    update public.message_outbox mo
       set status = 'cancelled',
           payload = '{}'::jsonb
      from public.bookings bk
      join anonymized a on a.business_id = bk.business_id and a.id = bk.customer_id
     where mo.business_id = bk.business_id
       and mo.booking_id = bk.id
       and mo.status = 'queued'
    returning 1
  ),
  cleared_tokens as (
    update public.bookings bk
       set manage_token_hash = null
      from anonymized a
     where bk.business_id = a.business_id
       and bk.customer_id = a.id
    returning 1
  ),
  decoupled_consent as (
    update public.consent_events ce
       set customer_id = null
      from anonymized a
     where ce.business_id = a.business_id
       and ce.customer_id = a.id
    returning 1
  )
  select count(*) into v_anonymized from anonymized;

  -- 2. Utkorgsrader (sent/dead/cancelled) äldre än 90 dagar raderas helt
  --    (ingen historik behöver bevaras, till skillnad från payments/Caja).
  with purged as (
    delete from public.message_outbox
     where status in ('sent', 'dead', 'cancelled')
       and updated_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_purged_outbox from purged;

  -- 3. Samtyckeslogg: rader som redan saknar kundkoppling (customer_id null)
  --    och är äldre än 5 år raderas helt (ägarens svar 2026-09-30). Rader med
  --    en levande customer_id rörs aldrig här — de frikopplas först (steg 1,
  --    eller när kunden anonymiseras via anonymizeCustomer) och blir då
  --    aktuella för den här klausulen i en SENARE körning.
  with purged_consent as (
    delete from public.consent_events
     where customer_id is null
       and created_at < now() - interval '5 years'
    returning 1
  )
  select count(*) into v_purged_consent from purged_consent;

  -- Bara antal returneras (regel 8: ingen persondata i loggar/cronsvar).
  return query select v_anonymized, v_purged_outbox, v_purged_consent;
end;
$$;

revoke all on function private.run_retention() from public;
grant execute on function private.run_retention() to service_role;
