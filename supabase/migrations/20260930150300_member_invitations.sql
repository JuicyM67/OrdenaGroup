-- WP-46 · Steg 4 (db-engineer) · `member_invitations`
-- F#: F1/F6 (ägaren bjuder in personal). INV: INV-3, INV-4 (D-014).
-- Plan: docs/tasks/plans/WP-46.md, steg 4. D-034 (förslag i planen): bara
-- ägaren bjuder in och sätter behörigheter (Ägarens svar punkt 2).
--
-- En rad per inbjudan. `staff_id` är NOT NULL (till skillnad från
-- `memberships.staff_id`): en inbjudan är ALLTID till en specifik
-- personalrad (Ägarens svar: personalkonton, inte fria konton). De sju
-- behörighetsflaggorna är samma kolumner/defaultvärden som
-- `memberships` (20260930150000), kopierade till membership-raden av
-- `accept_invitation` (nästa migration) när inbjudan accepteras.
create table public.member_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  staff_id uuid not null,
  can_manage_own_bookings boolean not null default true,
  can_manage_all_bookings boolean not null default false,
  can_cancel_bookings boolean not null default false,
  can_edit_catalog boolean not null default false,
  can_manage_team boolean not null default false,
  can_view_reports boolean not null default false,
  can_edit_settings boolean not null default false,
  -- FRÅGA 6/D-029-mönstret (samma som bookings.manage_token_hash): bara en
  -- SHA-256-hash sparas. Klartexten finns bara i inbjudningslänken/mejlet
  -- (`message_outbox.payload`, tills raden blir sent/dead/cancelled).
  token_hash bytea not null unique,
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  -- D-014: sammansatt FK, en inbjudan i företag A kan inte peka på en
  -- personalrad i företag B.
  foreign key (business_id, staff_id) references public.staff (business_id, id),
  constraint member_invitations_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- K1 (samma resonemang som bookings_manage_token_hash_length): en SHA-256-
  -- hash är alltid exakt 32 byte.
  constraint member_invitations_token_hash_length check (octet_length(token_hash) = 32),
  -- En inbjudan kan inte både accepteras OCH återkallas (ömsesidigt
  -- uteslutande slutstatus).
  constraint member_invitations_accepted_xor_revoked check (
    accepted_at is null or revoked_at is null
  )
);

create index member_invitations_business_id_idx on public.member_invitations (business_id);

-- Högst EN "levande" (varken accepterad eller återkallad) inbjudan per
-- personalrad åt gången — "väntande inbjudningar (skicka igen/återkalla)"
-- i Ajustes → Equipo (WP-46 steg 6) antar en enda rad att visa/återanvända.
-- Gäller inte tidsmässigt UTGÅNGNA rader (de räknas ändå som "levande" tills
-- ägaren uttryckligen skickar igen eller återkallar — `now()` kan inte stå i
-- ett indexvillkor, det är inte immutable).
create unique index member_invitations_business_staff_pending_uidx
  on public.member_invitations (business_id, staff_id)
  where accepted_at is null and revoked_at is null;

create trigger set_updated_at
  before update on public.member_invitations
  for each row execute function private.set_updated_at();

-- private.plan_staff_limit ---------------------------------------------------
-- HOOK (WP-46-uppdraget: "om ingen gräns finns i schemat än, dokumentera och
-- gör en tydlig hook"). Ägarens svar punkt 4 i planen: "Personalkonton ingår
-- i de planer som tillåter flera medarbetare (följer planens personalgräns,
-- D-009). Planen med en medarbetare kan inte bjuda in." MEN varken D-009
-- (docs/decisions/DECISIONS.md — handlar bara om att PRISET är per företag,
-- inte om HUR MÅNGA medarbetare varje plan-nivå tillåter) eller något annat
-- dokument (docs/product/, DATA_MODEL.md) anger en konkret siffra per
-- `business_plan`-värde ('free', 'emprende', 'equipo', 'local'). Att gissa
-- en siffra här vore att fatta ett produktbeslut som inte är mitt att ta.
--
-- Lösningen: en enda, centraliserad funktion som `member_invitations_guard_limit`
-- (nedan) och `accept_invitation` (nästa migration) BÅDA anropar. Den
-- returnerar `null` (obegränsat, alltså ingen spärr alls i dag) för alla
-- planer. Den dagen produkten bestämmer de riktiga gränserna blir det EN ny
-- migration som bara byter ut kroppen här (t.ex. en `case`-sats eller en
-- liten uppslagstabell) — själva inbjudnings-/accept-flödet rör man inte.
create function private.plan_staff_limit(p_plan public.business_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select null::integer;
$$;

revoke all on function private.plan_staff_limit(public.business_plan) from public;
grant execute on function private.plan_staff_limit(public.business_plan) to authenticated, service_role;

-- private.staff_seat_count ----------------------------------------------
-- "Upptagna platser": accepterade personalkonton (memberships med
-- role = 'staff' och en kopplad personalrad — matchar det partiella unika
-- indexet i steg 1, en personalrad har högst ett konto) PLUS väntande,
-- icke-utgångna inbjudningar (en inbjudan som ännu inte accepterats
-- reserverar ändå en plats, annars kunde ägaren bjuda in fler personer än
-- planen tillåter genom att skicka flera inbjudningar samtidigt).
create function private.staff_seat_count(b uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.memberships
      where business_id = b and role = 'staff' and staff_id is not null)
    + (select count(*) from public.member_invitations
        where business_id = b and accepted_at is null and revoked_at is null and expires_at > now())
  )::integer;
$$;

revoke all on function private.staff_seat_count(uuid) from public;
grant execute on function private.staff_seat_count(uuid) to authenticated, service_role;

-- Spärren vid ny inbjudan -----------------------------------------------
-- `security definer` (som `protect_last_owner`-mönstret): läser/låser
-- `businesses` oavsett anroparens egna grants, så att spärren gäller
-- likadant för `authenticated` (ägarens app, framtida WP) och `service_role`.
-- `for update` på businessraden serialiserar samtidiga inbjudningar mot
-- samma gräns (samma skydd mot kapplöpning som `protect_last_owner`).
create function private.member_invitations_guard_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.business_plan;
  v_limit integer;
  v_used integer;
begin
  select plan into v_plan from public.businesses where id = new.business_id for update;
  v_limit := private.plan_staff_limit(v_plan);
  if v_limit is not null then
    v_used := private.staff_seat_count(new.business_id);
    if v_used >= v_limit then
      raise exception 'El plan actual no permite más cuentas de personal' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger member_invitations_guard_limit
  before insert on public.member_invitations
  for each row execute function private.member_invitations_guard_limit();

-- RLS: bara ägaren, inga anon-policies (INV-3, D-034/Ägarens svar punkt 2).
alter table public.member_invitations enable row level security;

create policy "owners select" on public.member_invitations
  for select
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]));

create policy "owners insert" on public.member_invitations
  for insert
  to authenticated
  with check (private.is_member(business_id, array['owner']::public.member_role[]));

-- Uppdatering täcker "skicka igen" (ny token_hash/expires_at) och
-- "återkalla" (revoked_at). Ingen delete-policy för authenticated — en
-- inbjudan återkallas, den tas inte bort (spår för felsökning/audit, samma
-- anda som append-only-mönstret på andra tabeller, men inte lika strikt:
-- service_role behåller delete nedan för en eventuell framtida städning).
create policy "owners update" on public.member_invitations
  for update
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]))
  with check (private.is_member(business_id, array['owner']::public.member_role[]));

grant select, insert, update on public.member_invitations to authenticated;
-- Säkerhet S2: service_role (framtida inbjudningsflöde/utkorgsarbetaren,
-- integrations-engineer) läser adressen via invitation_id (D-029-mönstret,
-- se 20260930150200) och kan skapa/ändra/städa rader.
grant select, insert, update, delete on public.member_invitations to service_role;
