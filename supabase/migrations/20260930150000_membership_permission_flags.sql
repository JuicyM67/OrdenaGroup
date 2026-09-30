-- WP-46 · Steg 1 (db-engineer) · Behörighetsmodell för personalkonton
-- F#: F1/F3/F6 (rollen "Profesional", ägarens svar 2026-09-30).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (tenant-isolering).
-- Plan: docs/tasks/plans/WP-46.md, steg 1-2. D-034 (förslag i planen).
--
-- Sju fasta booleans på `memberships`, i stället för en fri rollmotor eller
-- jsonb: typade, lätta att uttrycka i RLS (`private.has_perm`, nedan) och
-- lätta att täcka med en matris i pgTAP. `role = 'owner'` har ALLTID alla
-- rättigheter, oavsett vad kolumnerna råkar innehålla (satt av en ägare som
-- själv en gång var den enda personen i företaget, innan flaggorna fanns).
--
-- `can_manage_own_bookings` är den enda flaggan med default `true`: en
-- nyinbjuden profesional ska kunna hantera sin egen agenda direkt (F6), utan
-- att ägaren måste komma ihåg att slå på en växel. Alla andra flaggor är
-- medvetet `false` som standard (principen om minsta privilegium) — ägaren
-- slår på `can_manage_all_bookings`/`can_cancel_bookings`/`can_edit_catalog`/
-- `can_manage_team`/`can_view_reports`/`can_edit_settings` per person vid
-- inbjudan (`member_invitations`, WP-46 steg 4) eller i Ajustes → Equipo
-- (WP-46 steg 6, ui-engineer).
alter table public.memberships
  add column can_manage_own_bookings boolean not null default true,
  add column can_manage_all_bookings boolean not null default false,
  add column can_cancel_bookings boolean not null default false,
  add column can_edit_catalog boolean not null default false,
  add column can_manage_team boolean not null default false,
  add column can_view_reports boolean not null default false,
  add column can_edit_settings boolean not null default false;

-- En personalrad (staff) har högst ETT konto. `staff_id` är fortfarande
-- nullable (en owner-rad, eller en ännu inte kopplad vendor-rad, saknar
-- staff_id) — det partiella indexet ignorerar de raderna helt.
create unique index memberships_business_id_staff_id_uidx
  on public.memberships (business_id, staff_id)
  where staff_id is not null;

-- Ägaren (authenticated, redan owner-gated av RLS-policyn "owners update"
-- nedan) får ändra flaggorna på en medlemsrad, precis som role/staff_id
-- sedan tidigare (B2-mönstret, kolumngrant utöver RLS). Additivt: lägger
-- bara till de sju nya kolumnerna till den befintliga uppsättningen
-- (role, staff_id) från 20260927100100_businesses_memberships.sql.
grant update (
  can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
  can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings
) on public.memberships to authenticated;

-- private.has_perm ----------------------------------------------------------
-- Samma mönster som `private.is_member` (security definer, stable,
-- search_path = ''): en flagga i taget, i stället för en rollista. `owner`
-- kortsluter till `true` INNAN någon kolumn läses (planens D-034: "role =
-- 'owner' har alltid allt, oavsett kolumnerna"). Bara `role = 'staff'` kan
-- få `true` via en flagga — `vendor` (WP-35, utanför scope här) och `admin`
-- (reserverad för F19, se DATA_MODEL.md "Roller") får ALDRIG behörigheter via
-- den här funktionen, även om kolumnerna av misstag skulle vara satta på en
-- sådan rad (de kan bara skapas av service_role ändå).
--
-- `perm` är textbaserad (inte en egen enum) av samma skäl som
-- `private.is_member` tar en rollista: anropsstället läser tydligt ut vilken
-- flagga som krävs. En okänd `perm` kastar hellre ett tydligt fel än att
-- tyst returnera `false` (skulle annars dölja en stavningsbugg i en RLS-
-- policy som "alltid nekar").
create function private.has_perm(b uuid, perm text)
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
    'can_edit_catalog', 'can_manage_team', 'can_view_reports', 'can_edit_settings'
  ) then
    raise exception 'private.has_perm: perm desconocido %', perm;
  end if;

  select role, can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
         can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings
    into m
    from public.memberships
   where business_id = b
     and user_id = (select auth.uid());

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
  end case;
end;
$$;

revoke all on function private.has_perm(uuid, text) from public;
grant execute on function private.has_perm(uuid, text) to authenticated;

-- private.member_staff_id ----------------------------------------------------
-- Den inloggades EGEN staff_id i ett företag (eller null: ägare utan
-- personalrad, eller ingen medlem alls). Används av RLS-policyer som måste
-- jämföra `bookings.staff_id`/liknande mot "mig själv" (`can_manage_own_bookings`)
-- — en ren SELECT-jämförelse i en `using`/`with check`-klausul, som inte kan
-- uttrycka "hämta min rad och plocka ett fält" på annat sätt än en
-- subquery/funktion.
create function private.member_staff_id(b uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select staff_id
    from public.memberships
   where business_id = b
     and user_id = (select auth.uid());
$$;

revoke all on function private.member_staff_id(uuid) from public;
grant execute on function private.member_staff_id(uuid) to authenticated;

-- RLS: memberships, narrowing ------------------------------------------------
-- D-034 (förslaget i planen): `admin` är en reserverad PLATTFORMSROLL (F19,
-- se DATA_MODEL.md "Roller"), inte en företagsbehörighet. Allt som tidigare
-- skulle vara "owner ELLER admin" i den här filens policies blir nu bara
-- "owner". `memberships`/`member_invitations` (WP-46 steg 4)/`consent_events`/
-- export och radering (redan `isOwner`, inte RLS, se
-- src/server/privacy/authz.ts) är ägarens egna verktyg, punkt.
drop policy "select own or admin" on public.memberships;
create policy "select own or owner" on public.memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_member(business_id, array['owner']::public.member_role[])
  );

drop policy "owners insert" on public.memberships;
create policy "owners insert" on public.memberships
  for insert
  to authenticated
  with check (
    private.is_member(business_id, array['owner']::public.member_role[])
    and role <> 'admin'
  );

drop policy "owners update" on public.memberships;
create policy "owners update" on public.memberships
  for update
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]))
  with check (
    private.is_member(business_id, array['owner']::public.member_role[])
    and role <> 'admin'
  );

drop policy "owners delete" on public.memberships;
create policy "owners delete" on public.memberships
  for delete
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]));

-- RLS: consent_events, samma narrowing ---------------------------------------
drop policy "owners select" on public.consent_events;
create policy "owners select" on public.consent_events
  for select
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]));
