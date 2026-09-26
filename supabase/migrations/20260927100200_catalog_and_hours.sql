-- WP-01 · Kärnschema · Katalog och öppettider
-- F#: F2 (personal och tjänster), F3 (tillgänglighetens lager: öppettider, personaltider, frånvaro).
-- INV: INV-3, INV-4 (sammansatta FK (business_id, id), se D-014).
--
-- Avvikelse från DATA_MODEL.md (D-014): `staff_services` och `staff_hours` får
-- kolumnen `business_id`, som krävs för RLS och för de sammansatta FK:erna
-- (business_id, staff_id) -> staff (business_id, id) osv. Det gör en rad i
-- företag A omöjlig att koppla till personal/tjänster i företag B, även med
-- service role.
--
-- search_path utökas till extensions för den här sessionen så att `exclude
-- using gist` hittar btree_gist:s operatorklasser (extensionen ligger i
-- schemat extensions, se 20260927100000_core_foundation.sql).
set search_path = public, extensions;

-- staff -------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  -- Färgen är ett tokennamn (src/styles/tokens.css), inte ett hex-värde.
  color text not null check (color in ('staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6')),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create index staff_business_id_idx on public.staff (business_id);

create trigger set_updated_at
  before update on public.staff
  for each row execute function private.set_updated_at();

-- Nu kan memberships.staff_id peka på staff (business_id, id).
alter table public.memberships
  add constraint memberships_staff_fk
  foreign key (business_id, staff_id) references public.staff (business_id, id);

-- services ------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  category text,
  duration_min integer not null,
  price_clp integer not null,
  buffer_after_min integer not null default 0,
  deposit_kind public.deposit_kind not null default 'none',
  deposit_value integer,
  remind_after_weeks integer,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint services_duration_min_check check (duration_min > 0),
  constraint services_price_clp_check check (price_clp >= 0),
  constraint services_buffer_after_min_check check (buffer_after_min >= 0),
  constraint services_deposit_value_check check (deposit_value is null or deposit_value >= 0),
  constraint services_deposit_kind_value_check check (
    (deposit_kind = 'none' and (deposit_value is null or deposit_value = 0))
    or (deposit_kind = 'percent' and deposit_value between 1 and 100)
    or (deposit_kind = 'fixed' and deposit_value <= price_clp)
  ),
  constraint services_remind_after_weeks_check check (remind_after_weeks is null or remind_after_weeks > 0)
);

create index services_business_id_idx on public.services (business_id);

create trigger set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

-- staff_services --------------------------------------------------------
create table public.staff_services (
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null,
  service_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (staff_id, service_id),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services (business_id, id) on delete cascade
);

create index staff_services_business_id_idx on public.staff_services (business_id);

-- business_hours --------------------------------------------------------
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint business_hours_weekday_check check (weekday between 1 and 7),
  constraint business_hours_start_before_end check (start_time < end_time)
);

create index business_hours_business_id_idx on public.business_hours (business_id);

alter table public.business_hours
  add column minutes_range int4range generated always as (
    int4range(
      extract(hour from start_time)::int * 60 + extract(minute from start_time)::int,
      extract(hour from end_time)::int * 60 + extract(minute from end_time)::int
    )
  ) stored;

-- Ingen överlappning mellan intervall samma dag i samma företag. Flera
-- intervall per dag är tillåtna (t.ex. lunch som delar upp dagen).
alter table public.business_hours
  add constraint business_hours_no_overlap
  exclude using gist (business_id with =, weekday with =, minutes_range with &&);

-- staff_hours -----------------------------------------------------------
-- Semantik (FRÅGA 5, godkänd): en profesional utan rader följer företagets
-- öppettider. En profesional med rader arbetar bara inom snittet av sina
-- rader och företagets (snävar in, vidgar aldrig). Motorn (WP-10) räknar
-- snittet; databasen tvingar inte fram det (R6).
create table public.staff_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint staff_hours_weekday_check check (weekday between 1 and 7),
  constraint staff_hours_start_before_end check (start_time < end_time),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade
);

create index staff_hours_business_id_idx on public.staff_hours (business_id);

alter table public.staff_hours
  add column minutes_range int4range generated always as (
    int4range(
      extract(hour from start_time)::int * 60 + extract(minute from start_time)::int,
      extract(hour from end_time)::int * 60 + extract(minute from end_time)::int
    )
  ) stored;

alter table public.staff_hours
  add constraint staff_hours_no_overlap
  exclude using gist (staff_id with =, weekday with =, minutes_range with &&);

-- time_off ----------------------------------------------------------------
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- staff_id = null betyder hela företaget (t.ex. lunch, helgdag).
  staff_id uuid,
  period tstzrange not null,
  kind public.time_off_kind not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade,
  constraint time_off_period_not_empty check (not isempty(period)),
  constraint time_off_period_half_open check (lower_inc(period) and not upper_inc(period))
);

create index time_off_business_id_idx on public.time_off (business_id);
create index time_off_business_id_period_gist_idx on public.time_off using gist (business_id, period);

create trigger set_updated_at
  before update on public.time_off
  for each row execute function private.set_updated_at();

-- RLS och grants ------------------------------------------------------------
-- FRÅGA 4 (godkänd): staff/vendor har i WP-01 ingen åtkomst till katalogen.
-- Bara owner/admin läser och skriver.
alter table public.staff enable row level security;
create policy "owners full access" on public.staff
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.staff to authenticated;

alter table public.services enable row level security;
create policy "owners full access" on public.services
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.services to authenticated;

alter table public.staff_services enable row level security;
create policy "owners full access" on public.staff_services
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.staff_services to authenticated;

alter table public.business_hours enable row level security;
create policy "owners full access" on public.business_hours
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.business_hours to authenticated;

alter table public.staff_hours enable row level security;
create policy "owners full access" on public.staff_hours
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.staff_hours to authenticated;

alter table public.time_off enable row level security;
create policy "owners full access" on public.time_off
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.time_off to authenticated;
