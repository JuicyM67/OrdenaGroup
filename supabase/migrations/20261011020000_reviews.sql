-- WP-65 · Verifierade recensioner (D-045) · `review_invites`, `reviews`,
-- `businesses.review_requests_enabled`.
-- INV: INV-3 (RLS, inga anon-policies), INV-4 (tenant-isolering, sammansatta
-- FK, D-014).
--
-- Flöde: cron-svepet (`src/server/reviews/requests.ts`, service_role) skapar
-- en `review_invites`-rad per genomförd bokning (bara SHA-256-hashen av
-- token:en, D-029-mönstret) och köar `solicitudResena` i utkorgen. Kunden
-- öppnar `/resena/[token]` (publik, utan konto) — servern (service_role)
-- skapar/uppdaterar `reviews`-raden. Den publika bokningssidan läser
-- recensionerna via servern (service_role), precis som resten av `/[slug]`.
-- Inloggade medlemmar läser via RLS och kan bara svara/anmäla (smala
-- kolumn-grants), aldrig radera eller ändra betyg/text. Dölja/återställa
-- (`hidden_at`) gör bara plattformsadmin via servern (D-038, audit-logg).
set search_path = public, extensions;

-- Ajustes → Reglas: "Pedir reseña después de la cita" (på som standard).
alter table public.businesses
  add column review_requests_enabled boolean not null default true;
grant update (review_requests_enabled) on public.businesses to authenticated;

-- ---------------------------------------------------------------------------
-- review_invites: en inbjudan (token) per bokning. Bara servern.
-- ---------------------------------------------------------------------------
create table public.review_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid not null,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  -- En inbjudan per bokning (svepets dedupe).
  unique (booking_id),
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade,
  constraint review_invites_token_hash_length check (octet_length(token_hash) = 32)
);

alter table public.review_invites enable row level security;
-- Ingen policy för authenticated: tabellen bär bara token-hashar, ingen
-- medlem behöver läsa den. service_role (svepet, `/resena/[token]`).
grant select, insert, delete on public.review_invites to service_role;

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid not null,
  customer_id uuid not null,
  rating smallint not null,
  comment text,
  -- "Ana P." — ögonblicksbild vid inskick (förnamn + initial). `null` efter
  -- anonymisering (visas som "Cliente"/"Kund").
  display_name text,
  -- Företagets offentliga svar (ett, redigerbart).
  reply text,
  replied_at timestamptz,
  -- Företagets anmälan till moderering (ingen radering, D-045).
  reported_at timestamptz,
  report_reason text,
  report_note text,
  -- Plattformsadmin dolde recensionen (D-038/D-045). `null` = synlig.
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  -- En recension per bokning.
  unique (booking_id),
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade,
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete cascade,
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_comment_length check (comment is null or char_length(comment) <= 1000),
  constraint reviews_display_name_length check (display_name is null or char_length(display_name) <= 60),
  constraint reviews_reply_length check (reply is null or char_length(reply) <= 1000),
  constraint reviews_reply_consistency check ((reply is null) = (replied_at is null)),
  constraint reviews_report_reason_check check (
    report_reason is null or report_reason in ('offensive', 'false', 'personal_data', 'not_customer', 'other')
  ),
  constraint reviews_report_note_length check (report_note is null or char_length(report_note) <= 500),
  constraint reviews_report_consistency check ((reported_at is null) = (report_reason is null))
);

create index reviews_business_created_idx on public.reviews (business_id, created_at desc);
create index reviews_customer_idx on public.reviews (business_id, customer_id);
create index reviews_reported_idx on public.reviews (reported_at) where reported_at is not null;

create trigger set_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

alter table public.reviews enable row level security;

-- Läsning: hela teamet (owner + staff), samma bredd som bookings/customers.
create policy "read reviews" on public.reviews
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Svara/anmäla: ägaren eller `can_edit_settings` (D-045). Kolumn-grants
-- nedan begränsar VAD som får ändras (aldrig betyg/text/namn/hidden_at).
create policy "reply reviews" on public.reviews
  for update
  to authenticated
  using (private.has_perm(business_id, 'can_edit_settings'))
  with check (private.has_perm(business_id, 'can_edit_settings'));

grant select on public.reviews to authenticated;
grant update (reply, replied_at, reported_at, report_reason, report_note) on public.reviews to authenticated;
-- service_role: kundens inskick/redigering, publika läsningen, admin
-- (hidden_at). Ingen delete: en recension raderas bara via kaskad
-- (företaget/kunden/bokningen raderas), annars anonymiseras den.
grant select, insert, update on public.reviews to service_role;

-- Säkerhetsgranskning WP-65: kolumn-granten ovan räcker inte ensam — en
-- medlem skulle via PostgREST kunna nollställa/skriva om en anmälan eller
-- bakdatera `replied_at`. För `authenticated` (medlemmar) gäller därför:
-- anmälan får bara gå null → satt (tidpunkten sätts här), aldrig ändras
-- eller nollställas; `replied_at` sätts alltid här (now() när svaret ändras,
-- null när det tas bort, annars oförändrad). service_role (kundens inskick,
-- admin som återställer/avvisar en anmälan) berörs inte.
create function private.reviews_guard_member_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if old.reported_at is not null then
      if new.reported_at is distinct from old.reported_at
         or new.report_reason is distinct from old.report_reason
         or new.report_note is distinct from old.report_note then
        raise exception 'review report is locked' using errcode = '42501';
      end if;
    elsif new.reported_at is not null then
      new.reported_at := now();
    end if;
    if new.reply is distinct from old.reply then
      new.replied_at := case when new.reply is null then null else now() end;
    else
      new.replied_at := old.replied_at;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.reviews_guard_member_update() from public;

create trigger reviews_guard_member_update
  before update on public.reviews
  for each row execute function private.reviews_guard_member_update();

-- ---------------------------------------------------------------------------
-- Dataskydd (Ley 21.719/GDPR, D-045): när en kund anonymiseras — via
-- `anonymizeCustomer` eller `private.run_retention` — nollas recensionens
-- namn, text och företagets svar (fritext som kan peka ut personen).
-- Betyget behålls (anonymt, påverkar snittet). Inbjudningarna raderas.
-- ---------------------------------------------------------------------------
create function private.anonymize_customer_reviews()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.anonymized_at is not null and old.anonymized_at is null then
    update public.reviews
       set display_name = null, comment = null, reply = null, replied_at = null,
           report_note = null
     where business_id = new.business_id and customer_id = new.id;
    delete from public.review_invites ri
     using public.bookings bk
     where ri.business_id = new.business_id
       and bk.business_id = new.business_id
       and bk.id = ri.booking_id
       and bk.customer_id = new.id;
  end if;
  return null;
end;
$$;

revoke all on function private.anonymize_customer_reviews() from public;

create trigger customers_anonymize_reviews
  after update of anonymized_at on public.customers
  for each row execute function private.anonymize_customer_reviews();

-- ---------------------------------------------------------------------------
-- Säkerhetsgranskning WP-65: `private.run_retention` rensar även utgångna
-- `review_invites` (> 60 dagar). `create or replace` med samma returtyp som
-- 20260930120000_run_retention_notes_and_failed.sql; steg 1–3 oförändrade.
-- ---------------------------------------------------------------------------
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

revoke all on function private.run_retention() from public;
grant execute on function private.run_retention() to service_role;
