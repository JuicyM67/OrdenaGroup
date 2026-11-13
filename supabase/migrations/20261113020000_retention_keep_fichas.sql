-- WP-91 (D-077): fichas sparas så länge företaget är kund.
--
-- Före: `private.run_retention` anonymiserade varje kund utan bokning på 24
-- månader, och triggern `customers_purge_records` (20261108030000) raderade
-- då kundens ficha. Ett företag som är prestador de salud måste spara ficha
-- clínica i minst 15 år (Ley 20.584, art. 13). Ansvaret är företagets
-- (Términos, "Fichas y datos de salud"), men plattformen får inte själv
-- radera fichan medan kontot är aktivt.
--
-- Efter: samma funktion (samma signatur, returtyp och steg), men en kund med
-- ficha (anteckning, ifyllt fast fält eller consentimiento informado) rörs
-- inte av den automatiska anonymiseringen. Dess consent_events förblir
-- kopplade och rensas därför inte heller av 5-årsregeln (steg 3).
-- Ägarens egen anonymisering och raderingen av ett konto är oförändrade.
--
-- Additivt beteende: inga tabeller eller kolumner ändras.

create or replace function private.run_retention()
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
  --    nolla persondata + samtycke, radera svar, avbryt köade/misslyckade
  --    outbox-rader och töm deras payload, rensa manage_token_hash/notes/
  --    cancel_reason, koppla loss consent_events.
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
       -- WP-91 (D-077): en kund med ficha (anteckningar, fasta fält eller
       -- consentimiento informado) anonymiseras aldrig automatiskt. Den kan
       -- vara en ficha clínica som företaget måste spara i minst 15 år
       -- (Ley 20.584, art. 13). Den tas bort först när företaget själv
       -- anonymiserar kunden eller kontot raderas.
       and not exists (
             select 1 from public.customer_record_entries e
              where e.business_id = c.business_id and e.customer_id = c.id)
       and not exists (
             select 1 from public.customer_records r
              where r.business_id = c.business_id and r.customer_id = c.id
                and (coalesce(btrim(r.allergies), '') <> ''
                     or coalesce(btrim(r.contraindications), '') <> ''
                     or coalesce(btrim(r.observations), '') <> ''))
       and not exists (
             select 1 from public.consent_events ce
              where ce.business_id = c.business_id and ce.customer_id = c.id
                and ce.kind = 'informed')
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
       and mo.status in ('queued', 'failed')
    returning 1
  ),
  cleared_tokens as (
    update public.bookings bk
       set manage_token_hash = null,
           notes = null,
           cancel_reason = null
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

  -- 2. Utkorgsrader (sent/dead/cancelled/failed) äldre än 90 dagar raderas
  --    helt (ingen historik behöver bevaras, till skillnad från payments/Caja).
  with purged as (
    delete from public.message_outbox
     where status in ('sent', 'dead', 'cancelled', 'failed')
       and updated_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_purged_outbox from purged;

  -- 3. Samtyckeslogg: rader som redan saknar kundkoppling (customer_id null)
  --    och är äldre än 5 år raderas helt (ägarens svar 2026-09-30). Rader med
  --    en levande customer_id rörs aldrig här.
  with purged_consent as (
    delete from public.consent_events
     where customer_id is null
       and created_at < now() - interval '5 years'
    returning 1
  )
  select count(*) into v_purged_consent from purged_consent;

  -- 4. WP-65 (D-045): recensionsinbjudningar vars länk gått ut (60 dagar,
  --    `INVITE_VALID_DAYS` i src/server/reviews/public.ts) raderas. Ingen
  --    egen räknare (returtypen är oförändrad, cron-routen läser tre
  --    kolumner). Svepet (`queueReviewRequests`) ser bara bokningar som
  --    slutade de senaste 3 dygnen, så en raderad inbjudan köas aldrig om.
  delete from public.review_invites
   where created_at < now() - interval '60 days';

  -- Bara antal returneras (regel 8: ingen persondata i loggar/cronsvar).
  return query select v_anonymized, v_purged_outbox, v_purged_consent;
end;
$$;
