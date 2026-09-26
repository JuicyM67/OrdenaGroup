-- WP-01 · Kärnschema · Företag och åtkomst
-- F#: F1 (ägaren skapar sitt företag).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (tenant-isolering via private.is_member).
--
-- `businesses` är tenant-roten (inget business_id-index krävs på den själv).
-- `memberships` kopplar auth.users till ett företag med en roll. `staff_id`
-- får sin sammansatta FK i 20260927100200_catalog_and_hours.sql, när `staff`
-- finns (kolumnen skapas här som nullable uuid).

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  comuna text not null,
  category text not null,
  timezone text not null default 'America/Santiago',
  phone text,
  address text,
  logo_url text,
  accent_color text,
  min_notice_minutes integer not null default 60,
  max_days_ahead integer not null default 30,
  cancel_window_hours integer not null default 3,
  slot_interval_minutes integer not null default 15,
  waitlist_mode public.waitlist_mode not null default 'sequential',
  plan public.business_plan not null default 'free',
  trial_ends_at timestamptz,
  status public.business_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  constraint businesses_slug_not_reserved check (
    slug <> all (array[
      'app', 'api', 'r', 'admin', 'vendedor', 'login', 'design-lab', '_next',
      'www', 'auth', 'static', 'assets', 'support', 'help', 'docs', 'blog',
      'legal', 'terminos', 'privacidad'
    ])
  ),
  -- D-011: solo America/Santiago en v1.
  constraint businesses_timezone_allowed check (timezone = 'America/Santiago'),
  constraint businesses_phone_e164 check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint businesses_accent_color_format check (accent_color is null or accent_color ~ '^#[0-9A-F]{6}$'),
  -- K5: bara https:-länkar (Supabase Storage/CDN), aldrig http:// eller
  -- data:-URI:er i den här kolumnen.
  constraint businesses_logo_url_format check (logo_url is null or logo_url ~ '^https://'),
  constraint businesses_min_notice_minutes_check check (min_notice_minutes >= 0),
  constraint businesses_max_days_ahead_check check (max_days_ahead between 1 and 365),
  constraint businesses_cancel_window_hours_check check (cancel_window_hours >= 0),
  constraint businesses_slot_interval_minutes_check check (slot_interval_minutes in (5, 10, 15, 20, 30, 60))
);

create trigger set_updated_at
  before update on public.businesses
  for each row execute function private.set_updated_at();

create table public.memberships (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  staff_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index memberships_business_id_idx on public.memberships (business_id);
create index memberships_user_id_idx on public.memberships (user_id);

create trigger set_updated_at
  before update on public.memberships
  for each row execute function private.set_updated_at();

-- private.is_member --------------------------------------------------
create function private.is_member(b uuid, roles public.member_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.business_id = b
      and m.user_id = (select auth.uid())
      and (roles is null or m.role = any(roles))
  );
$$;

revoke all on function private.is_member(uuid, public.member_role[]) from public;
grant execute on function private.is_member(uuid, public.member_role[]) to authenticated;

-- Skydda det sista owner-medlemskapet -----------------------------------
-- Säkerhet S4/qa3:
--  1. Om företaget redan är borta (t.ex. mitt i en kaskad-radering av
--     businesses) finns inget kvar att skydda — annars skulle det vara
--     omöjligt att radera ett företag som bara har en owner.
--  2. Låser businessraden (`for update`) innan den räknar kvarvarande
--     owners, så att två samtidiga degraderingar/raderingar av de sista två
--     ägarna inte båda kan se "en kvar" och båda lyckas (vilket skulle
--     lämna företaget utan ägare).
--  3. Ett membership kan aldrig flyttas till ett annat företag via UPDATE
--     (RLS blockerar redan detta för authenticated via with check, men det
--     här gäller även postgres/service_role).
create function private.protect_last_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and exists (select 1 from public.businesses where id = old.business_id) then
      perform 1 from public.businesses where id = old.business_id for update;
      select count(*) into remaining_owners
      from public.memberships
      where business_id = old.business_id
        and role = 'owner'
        and user_id <> old.user_id;
      if remaining_owners = 0 then
        raise exception 'No se puede eliminar al último owner del negocio';
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if new.business_id <> old.business_id then
      raise exception 'No se puede mover un membership a otro negocio' using errcode = '42501';
    end if;
    if old.role = 'owner' and new.role <> 'owner' and exists (select 1 from public.businesses where id = old.business_id) then
      perform 1 from public.businesses where id = old.business_id for update;
      select count(*) into remaining_owners
      from public.memberships
      where business_id = old.business_id
        and role = 'owner'
        and user_id <> old.user_id;
      if remaining_owners = 0 then
        raise exception 'No se puede degradar al último owner del negocio';
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

create trigger protect_last_owner
  before update or delete on public.memberships
  for each row execute function private.protect_last_owner();

-- public.create_business ------------------------------------------------
-- FRÅGA 3 (godkänd): enda vägen att skapa ett företag. security definer så att
-- onboarding (WP-15) aldrig behöver service role. Ingen insert-policy finns på
-- `businesses`/`memberships` för vanliga klienter.
create function public.create_business(
  name text,
  slug text,
  comuna text,
  category text,
  phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_business_id uuid;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;

  insert into public.businesses (name, slug, comuna, category, phone)
  values (name, slug, comuna, category, phone)
  returning id into v_business_id;

  insert into public.memberships (business_id, user_id, role)
  values (v_business_id, v_user, 'owner');

  return v_business_id;
end;
$$;

revoke all on function public.create_business(text, text, text, text, text) from public;
grant execute on function public.create_business(text, text, text, text, text) to authenticated;

-- RLS: businesses --------------------------------------------------------
alter table public.businesses enable row level security;

create policy "members select" on public.businesses
  for select
  to authenticated
  using (private.is_member(id));

create policy "owners update" on public.businesses
  for update
  to authenticated
  using (private.is_member(id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(id, array['owner', 'admin']::public.member_role[]));

-- Ingen insert-policy (bara via create_business) och ingen delete-policy.
--
-- Säkerhet B2/qa4: `authenticated` (ägaren i appen) får bara ändra
-- affärsmässiga fält, kolumn för kolumn. `plan`, `status`, `trial_ends_at`,
-- `id` och `timezone` styrs bara av servern (billing/plan-hantering,
-- WP-26-anonymisering, D-011). En ägare ska inte kunna ge sig själv ett
-- högre plan eller ta bort en `frozen`-spärr genom att uppdatera sin egen
-- rad via Data API.
grant select on public.businesses to authenticated;
grant update (
  name, slug, comuna, category, phone, address, logo_url, accent_color,
  min_notice_minutes, max_days_ahead, cancel_window_hours, slot_interval_minutes,
  waitlist_mode
) on public.businesses to authenticated;

-- Säkerhet S2: service_role (server/billing) har fullt CRUD, inklusive de
-- kolumner som authenticated inte får ändra.
grant select, update on public.businesses to service_role;

-- RLS: memberships --------------------------------------------------------
alter table public.memberships enable row level security;

create policy "select own or admin" on public.memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_member(business_id, array['owner', 'admin']::public.member_role[])
  );

-- Säkerhet S3: `role <> 'admin'` i with check. `admin` är tänkt för intern
-- platformsadministration (F19), inte något en företagsägare ska kunna dela
-- ut till sig själv eller andra via appen (se DATA_MODEL.md, "Roller").
-- Bara service role (intern admin-konsol) sätter role = 'admin'.
create policy "owners insert" on public.memberships
  for insert
  to authenticated
  with check (
    private.is_member(business_id, array['owner', 'admin']::public.member_role[])
    and role <> 'admin'
  );

create policy "owners update" on public.memberships
  for update
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (
    private.is_member(business_id, array['owner', 'admin']::public.member_role[])
    and role <> 'admin'
  );

create policy "owners delete" on public.memberships
  for delete
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

grant select, insert, delete on public.memberships to authenticated;
-- Kolumnbegränsad update: authenticated kan bara ändra en medlems roll eller
-- vilken staff-rad den är kopplad till, aldrig flytta raden till ett annat
-- företag (business_id) eller till en annan användare (user_id) — det är
-- redan blockerat av RLS (INV-4), men kolumngrant är försvar på djupet.
grant update (role, staff_id) on public.memberships to authenticated;

-- Säkerhet S2: service_role har fullt CRUD (kan t.ex. sätta role = 'admin').
grant select, insert, update, delete on public.memberships to service_role;
