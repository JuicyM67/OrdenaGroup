-- WP-26 · Steg 2 · Lagringsjobbets kärna: `private.run_retention()`
-- F#: F12. COMPLIANCE.md: kunder utan bokning på 24 månader anonymiseras
-- automatiskt; ägarens svar 2026-09-30: utkorgsrader 90 dagar.
--
-- Anropas av /api/cron/retention (WP-26 steg 4, integrations-engineer) med
-- service_role, en gång per dag. Rör alla företag (ett globalt underhålls-
-- jobb, inte en tenant-fråga) — därför `private`, inte en klientanropbar
-- `public`-funktion (samma resonemang som `private.owner_emails`).
--
-- Görs INTE här (öppen fråga i planen, väntar på tabellen): radering av
-- utgångna väntelisteanmälningar (`waitlist_entries` finns inte än, se
-- DATA_MODEL.md "Unika funktioner") — läggs till i den WP som skapar tabellen.
create function private.run_retention()
returns table (anonymized_customers integer, purged_outbox integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anonymized integer;
  v_purged integer;
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
  select count(*) into v_purged from purged;

  -- Bara antal returneras (regel 8: ingen persondata i loggar/cronsvar).
  return query select v_anonymized, v_purged;
end;
$$;

revoke all on function private.run_retention() from public;
grant execute on function private.run_retention() to service_role;
