-- WP-30 · Horas flash (F13) (db-engineer) · `flash_slots`
-- Plan: docs/tasks/plans/WP-23-30.md, "Horas flash".
-- INV: INV-1 (egen exclusion constraint, samma mönster som bookings.no_overlap),
-- INV-3, INV-4 (sammansatt FK, D-014).
--
-- `starts_at`/`ends_at` (inte bara `start`/`end`, som planens korta
-- stödordval): `end` är ett reserverat ord i SQL-grammatiken (CASE...END) och
-- skulle kräva citerad identifierare överallt (migrationer, typer, kod) —
-- `starts_at`/`ends_at` är samma betydelse, bara skrivna som alla andra
-- `_at`-tidsstämplar i schemat (created_at, sent_at, ...).
--
-- `service_ids uuid[] null = alla` (planens ord): ingen FK på en array-kolumn
-- (Postgres stöder inte sammansatta FK mot ett arrayelement) — servern
-- validerar vid skapande att varje id finns i `services` för samma
-- `business_id`, databasen garanterar bara att KOLUMNEN finns.
set search_path = public, extensions;

create type public.flash_slot_status as enum ('active', 'booked', 'cancelled');

create table public.flash_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null,
  service_ids uuid[],
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  discount_pct smallint not null,
  status public.flash_slot_status not null default 'active',
  booking_id uuid,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade,
  -- Kolumn-listform (samma gotcha som överallt annars i schemat): bookings
  -- raderas aldrig i praktiken (bara status -> 'cancelled'), så det här är en
  -- teoretisk gren, men hanteras ändå konsekvent med resten av schemat.
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete set null (booking_id),
  constraint flash_slots_discount_pct_check check (discount_pct between 1 and 90),
  constraint flash_slots_period_check check (ends_at > starts_at),
  constraint flash_slots_booking_id_requires_booked check ((status = 'booked') = (booking_id is not null)),
  constraint flash_slots_service_ids_not_empty check (service_ids is null or cardinality(service_ids) > 0)
);

-- INV-1-mönstret för horas flash: två AKTIVA flash-tider för samma
-- profesional får inte överlappa i tid (bokade/avbrutna tider är historik,
-- blockerar inte nya). `tstzrange` byggs av start/slut i uttrycket självt —
-- btree_gist (installerat i 20260927100000) ger operatorklassen för
-- likhet på staff_id och && på intervallet.
alter table public.flash_slots
  add constraint flash_slots_no_overlap
  exclude using gist (staff_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status = 'active');

-- Planens uttryckliga index.
create index flash_slots_business_id_starts_at_active_idx on public.flash_slots (business_id, starts_at)
  where status = 'active';

create trigger set_updated_at
  before update on public.flash_slots
  for each row execute function private.set_updated_at();

alter table public.flash_slots enable row level security;

-- Läsning: hela kalenderns medlemmar (owner + staff).
create policy "read flash_slots" on public.flash_slots
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Skrivning: samma regel som `write bookings` (20260930150100) — owner/
-- can_manage_all_bookings hanterar vem som helsts flash-tider, en
-- can_manage_own_bookings-profesional bara sina EGNA (staff_id = sig själv),
-- i både `using` och `with check` så att man inte kan skapa/flytta en
-- flash-tid till en kollega.
create policy "write flash_slots" on public.flash_slots
  for all
  to authenticated
  using (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or (
      private.has_perm(business_id, 'can_manage_own_bookings')
      and staff_id = private.member_staff_id(business_id)
    )
  )
  with check (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or (
      private.has_perm(business_id, 'can_manage_own_bookings')
      and staff_id = private.member_staff_id(business_id)
    )
  );

grant select, insert, update, delete on public.flash_slots to authenticated;
-- Säkerhet S2: service_role sätter status = 'booked' + booking_id i samma
-- transaktion som den publika bokningssidan skapar bokningen
-- (`/{slug}?flash=<id>`), och kan avbryta/expirera flash-tider från cron.
grant select, insert, update, delete on public.flash_slots to service_role;
