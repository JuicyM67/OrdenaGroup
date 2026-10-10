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
