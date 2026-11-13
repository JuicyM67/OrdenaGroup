-- WP-105 (D-079): modo soporte. Port av BookingBuddy WP-112 (D-087).
-- En plattformsadmin kan gå in i ett befintligt företags panel (/app) för att
-- rätta saker åt kunden.
--
-- Modell: ett TIDSBEGRÄNSAT medlemskap. Admin får en vanlig `memberships`-rad
-- med `role = 'staff'`, utan personalrad (`staff_id` null), med de sju
-- vanliga behörighetsflaggorna, plus `support_until`. Då gäller samma regler
-- som för en anställd med alla behörigheter: RLS (`private.is_member`/
-- `has_perm`) och serverns kontroller (`loadMember`). Det som bara ägaren får
-- göra (plan och fakturering, teamets medlemskap, export och radering,
-- samtycken) är fortfarande stängt, eftersom rollen inte är `owner`.
--
-- Skillnad mot SE: `can_view_records` (fichas, D-074) sätts INTE. Fichas och
-- consentimiento informado kan innehålla hälsouppgifter (känsliga enligt
-- Ley 21.719) och behövs inte för att konfigurera ett konto.
--
-- Utgång i databasen: `private.is_member`, `private.has_perm` och
-- `private.member_staff_id` räknar inte en rad vars `support_until` passerats.
-- Åtkomsten upphör alltså vid tidsgränsen även om raden ännu inte städats bort.
-- Raden tas bort när admin avslutar (`private.end_support`) och städas av
-- `private.purge_expired_support()` (retention-cronen).
--
-- Additivt: ny nullbar kolumn (null = vanligt medlemskap, oförändrat beteende),
-- tre funktioner ersätts med samma signatur och grants, tre nya funktioner
-- bara för service_role, en ny trigger.

-- ===========================================================================
-- 1. memberships.support_until
-- ===========================================================================
alter table public.memberships
  add column support_until timestamptz;

comment on column public.memberships.support_until is
  'WP-105 (D-079): satt = tillfälligt supportmedlemskap för en plattformsadmin, '
  'giltigt till och med denna tid. null = vanligt medlemskap. Sätts bara av '
  'private.start_support (service_role); authenticated har ingen update-grant '
  'på kolumnen.';

-- ===========================================================================
-- 2. RLS-hjälparna räknar inte ett utgånget supportmedlemskap
-- ===========================================================================
create or replace function private.is_member(b uuid, roles public.member_role[] default null)
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
      and (m.support_until is null or m.support_until > now())
  );
$$;

-- Samma som 20261108030000_ficha_consentimiento.sql, plus utgången.
create or replace function private.has_perm(b uuid, perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m record;
begin
  if perm not in (
    'can_manage_own_bookings', 'can_manage_all_bookings', 'can_cancel_bookings',
    'can_edit_catalog', 'can_manage_team', 'can_view_reports', 'can_edit_settings',
    'can_view_records'
  ) then
    raise exception 'private.has_perm: perm desconocido %', perm;
  end if;

  select role, can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
         can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings,
         can_view_records
    into m
    from public.memberships
   where business_id = b
     and user_id = (select auth.uid())
     and (support_until is null or support_until > now());

  if not found then
    return false;
  end if;

  if m.role = 'owner' then
    return true;
  end if;

  if m.role <> 'staff' then
    return false;
  end if;

  return case perm
    when 'can_manage_own_bookings' then m.can_manage_own_bookings
    when 'can_manage_all_bookings' then m.can_manage_all_bookings
    when 'can_cancel_bookings' then m.can_cancel_bookings
    when 'can_edit_catalog' then m.can_edit_catalog
    when 'can_manage_team' then m.can_manage_team
    when 'can_view_reports' then m.can_view_reports
    when 'can_edit_settings' then m.can_edit_settings
    when 'can_view_records' then m.can_view_records
  end case;
end;
$$;

create or replace function private.member_staff_id(b uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select staff_id
    from public.memberships
   where business_id = b
     and user_id = (select auth.uid())
     and (support_until is null or support_until > now());
$$;

-- ===========================================================================
-- 3. Ägaren kan inte göra om ett supportmedlemskap
-- ===========================================================================
-- Policyn för ägarens uppdateringar låter ägaren ändra `role`/`staff_id`/
-- flaggorna på sina medlemmar. På en supportrad skulle det kunna göra admin
-- till ägare, koppla raden till en personalrad eller slå på
-- `can_view_records`. Ägaren får däremot ta bort raden (avsluta supporten).
create function private.protect_support_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.support_until is not null
     and current_user = 'authenticated'
     and (new.role is distinct from old.role
          or new.staff_id is distinct from old.staff_id
          or new.can_view_records is distinct from old.can_view_records) then
    raise exception 'Una membresía de soporte no se puede modificar' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_support_membership
  before update on public.memberships
  for each row execute function private.protect_support_membership();

-- ===========================================================================
-- 4. Starta, avsluta och städa (bara service_role, dvs. /admin)
-- ===========================================================================
-- service_role saknar delete-grant på memberships, därför security definer.
-- Kontrollerar själv att `p_admin` är plattformsadmin.
--
-- Svar: 'started' (ny eller förnyad supportrad), 'already_member' (admin är
-- redan vanlig medlem i företaget, inget ändras), 'not_found' (företaget
-- finns inte).
create function private.start_support(p_admin uuid, p_business uuid, p_until timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_support_until timestamptz;
begin
  if p_until is null or p_until <= now() or p_until > now() + interval '4 hours' then
    raise exception 'private.start_support: ogiltig sluttid' using errcode = '22023';
  end if;
  if not exists (select 1 from private.platform_admins where user_id = p_admin) then
    raise exception 'private.start_support: inte plattformsadmin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.businesses where id = p_business) then
    return 'not_found';
  end if;

  select support_until into v_support_until
    from public.memberships
   where business_id = p_business and user_id = p_admin
   for update;

  if found then
    if v_support_until is null then
      return 'already_member';
    end if;
    update public.memberships
       set support_until = p_until
     where business_id = p_business and user_id = p_admin;
    return 'started';
  end if;

  insert into public.memberships (
    business_id, user_id, role, staff_id,
    can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
    can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings,
    can_view_records,
    support_until
  ) values (
    p_business, p_admin, 'staff', null,
    true, true, true, true, true, true, true,
    false,
    p_until
  );
  return 'started';
end;
$$;

-- Tar bort adminens supportrad(er): i ett företag, eller i alla (`p_business`
-- null). Rör aldrig ett vanligt medlemskap. Svar: antal borttagna rader.
create function private.end_support(p_admin uuid, p_business uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.memberships
   where user_id = p_admin
     and support_until is not null
     and (p_business is null or business_id = p_business);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.purge_expired_support()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.memberships
   where support_until is not null
     and support_until <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.start_support(uuid, uuid, timestamptz) from public;
revoke all on function private.end_support(uuid, uuid) from public;
revoke all on function private.purge_expired_support() from public;
revoke all on function private.start_support(uuid, uuid, timestamptz) from anon, authenticated;
revoke all on function private.end_support(uuid, uuid) from anon, authenticated;
revoke all on function private.purge_expired_support() from anon, authenticated;
grant execute on function private.start_support(uuid, uuid, timestamptz) to service_role;
grant execute on function private.end_support(uuid, uuid) to service_role;
grant execute on function private.purge_expired_support() to service_role;
