-- WP-36 · Superadmin (grunddel) · F19
--
-- DATA_MODEL.md (kommentaren vid memberships.role) varnade uttryckligen: F19
-- FÅR INTE bygga sin auktorisering på memberships.role = 'admin' i något
-- företag (det är en FÖRETAGSNIVÅ-roll, ett annat begrepp som råkar dela
-- enum-värde) — plattformsadmin behöver en egen, företagsoberoende
-- mekanism. Den här migrationen bygger den: `private.platform_admins` (en
-- rad per plattformsadmin, inget business_id), en oföränderlig logg
-- (`private.admin_audit_log`), manuell plan-override på `businesses`, och
-- ett sätt att skapa ett företag åt någon som inte är inloggad
-- (`private.business_invitations` + `public.accept_business_invitation`).
--
-- OBS (utanför den här agentens skrivyta i det här arbetspaketet,
-- supabase/+src/types/database.ts): DATA_MODEL.md efterlyser ett beslut i
-- DECISIONS.md innan F19 påbörjas ("D-037" är ett naturligt nästa
-- beslutsnummer). Den här migrationen är den tekniska konsekvensen av det
-- beslutet, men själva DECISIONS.md-posten skrivs av den agent/planerare
-- som äger `docs/`.

-- ===========================================================================
-- 1. private.platform_admins ------------------------------------------------
-- ===========================================================================
-- Ingen RLS-väg från klienten alls (varken authenticated eller anon): RLS är
-- påslaget men får INGEN policy (samma mönster som private.rate_limits,
-- 20260930130000) — default-deny för alla roller utom ägaren (postgres),
-- OAVSETT om en policy någonsin läggs till senare. Dessutom: ingen
-- `grant ... to authenticated/anon` finns eller kommer att ges (INV-3-andan:
-- "inga anon-policies" tolkat i bredaste mening för den här tabellen — den
-- ska aldrig nås av en klientsession, bara av servern efter en egen
-- `requirePlatformAdmin(userId, aal)`-kontroll i src/server/admin/, som
-- sedan kör med service_role).
--
-- FÖRSTA ADMINEN (dokumentation, ägarens instruktion): det finns medvetet
-- ingen insert-policy, ingen RPC och ingen UI för att lägga till den allra
-- första plattformsadminen — annars skulle vem som helst med en
-- service_role-nyckel (eller en framtida bugg i /admin) kunna göra sig
-- själv till admin. Ägaren lägger in sig själv manuellt, lokalt/på en
-- Supabase-branch, som `postgres` (superuser, förbigår alla grants):
--
--   insert into private.platform_admins (user_id) values ('<auth.users.id>');
--
-- (Hitta user_id med `select id from auth.users where email = '...'`.)
-- En redan inloggad ägare kan sedan lägga till fler admins samma väg.
create table private.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table private.platform_admins is
  'Plattformsadmins (F19), FÖRETAGSOBEROENDE — inte samma sak som '
  'memberships.role = ''admin'' (se DATA_MODEL.md). RLS påslaget utan någon '
  'policy: ingen roll utom postgres/service_role når tabellen. Första raden '
  'läggs in manuellt av ägaren (se migrationens header-kommentar).';

alter table private.platform_admins enable row level security;

-- Läsning för servern (requirePlatformAdmin): bara SELECT, ingen INSERT/
-- UPDATE/DELETE-grant — nya admins läggs in av ägaren direkt i databasen
-- (postgres förbigår grants helt), inte via en app-väg.
grant select on private.platform_admins to service_role;

-- ===========================================================================
-- 2. private.admin_audit_log -------------------------------------------------
-- ===========================================================================
create table private.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id),
  action text not null check (length(action) > 0),
  business_id uuid references public.businesses (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  -- Regel 7/Ley 21.719 (ingen persondata i loggar): `details` får bara
  -- innehålla id:n/koder (t.ex. {"plan": "equipo", "override_until": "..."}),
  -- aldrig namn, telefon, e-post eller fritext om en person. Kontrolleras av
  -- servern (src/server/admin/), inte av databasen — samma ansvarsfördelning
  -- som message_outbox.error ("bara felkod, aldrig persondata").
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table private.admin_audit_log is
  'Oföränderlig logg över varje admin-åtgärd (F19). Skrivs i SAMMA '
  'transaktion som åtgärden (servern, service_role). RLS påslaget utan '
  'policy, precis som platform_admins: ingen roll utom postgres/service_role '
  'når tabellen. Ingen update/delete-grant ens för service_role (jfr '
  '`payments`, B2/S2-andan: historik ska aldrig kunna ändras eller '
  'försvinna).';

alter table private.admin_audit_log enable row level security;

create index admin_audit_log_business_id_idx on private.admin_audit_log (business_id);
create index admin_audit_log_admin_user_id_idx on private.admin_audit_log (admin_user_id);
create index admin_audit_log_created_at_idx on private.admin_audit_log (created_at);

-- Bara select+insert: loggen är skrivskyddad i efterhand, för alla roller.
grant select, insert on private.admin_audit_log to service_role;

-- ===========================================================================
-- 3. businesses.plan_override_until ------------------------------------------
-- ===========================================================================
-- Manuell plan (t.ex. "gratis till datum" som ägaren ger ett pilotföretag).
-- Samma styrning som `plan`/`status`/`trial_ends_at` (B2, businesses_
-- memberships.sql): `authenticated` har INGEN grant på den här kolumnen —
-- kolumnlistan i "grant update (...) on public.businesses to authenticated"
-- ändras inte här och inkluderar den aldrig. Bara service_role (som redan
-- har `grant select, update, delete on public.businesses to service_role`,
-- utan kolumnbegränsning) kan sätta den, dvs. bara /admin.
alter table public.businesses
  add column plan_override_until timestamptz;

comment on column public.businesses.plan_override_until is
  'Manuellt satt av en plattformsadmin (F19/WP-36), t.ex. "gratis till '
  'datum". Ingen grant till authenticated (samma mönster som plan/status/ '
  'trial_ends_at, B2) — bara service_role (/admin) sätter den.';

-- ===========================================================================
-- 4. private.business_invitations --------------------------------------------
-- ===========================================================================
-- Sättet att skapa ett företag åt någon som INTE är inloggad (och kanske
-- inte ens har ett konto än): en admin fyller i namn/e-post/plan/ev.
-- override-datum, systemet skickar en inbjudan (integrations-engineer,
-- separat WP/steg — mejlet ligger utanför den här migrationen), och den
-- inbjudna loggar in med magisk länk och kör `accept_business_invitation`.
--
-- `token_hash`: SAMMA mönster som `bookings.manage_token_hash` (D-029) —
-- aldrig klartext i databasen. Skaparen (service_role, /admin) hashar
-- klartext-token med SHA-256 innan insert, t.ex. på exakt samma sätt som
-- src/server/bookings/token.ts redan gör
-- (`createHash('sha256').update(token, 'utf8').digest()`), så att
-- `extensions.digest(token, 'sha256')` (pgcrypto, samma algoritm/kodning)
-- ger EXAKT samma bytea när `accept_business_invitation` verifierar
-- klartexten den får från klienten.
create table private.business_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  business_name text not null check (length(business_name) > 0),
  plan public.business_plan not null default 'free',
  plan_override_until timestamptz,
  token_hash bytea not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  -- Sätts av accept_business_invitation när företaget skapas (spårbarhet i
  -- /admin: vilket företag kom från vilken inbjudan). Om accepted_at är satt
  -- MÅSTE business_id också vara det.
  business_id uuid references public.businesses (id) on delete set null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint business_invitations_accepted_has_business
    check (accepted_at is null or business_id is not null)
);

comment on table private.business_invitations is
  'Inbjudan att skapa ett företag, skickad av en plattformsadmin till någon '
  'utan (nödvändigtvis) konto än (F19/WP-36). RLS påslaget utan policy: '
  'ingen roll utom postgres/service_role/accept_business_invitation '
  '(security definer) når tabellen direkt.';

alter table private.business_invitations enable row level security;

create index business_invitations_email_idx on private.business_invitations (email);

-- /admin (service_role) skapar och listar inbjudningar. Ingen update/delete-
-- grant: `accepted_at`/`business_id` sätts bara av accept_business_invitation
-- (security definer, kör som ägaren postgres — oberoende av grants).
grant select, insert on private.business_invitations to service_role;

-- ===========================================================================
-- 5. private.slugify_business_name -------------------------------------------
-- ===========================================================================
-- Ren/deterministisk hjälpfunktion: gör om ett företagsnamn till en
-- slug-kandidat (samma tecken som businesses_slug_format tillåter). Returnerar
-- '' om namnet inte innehåller något a-z/0-9 alls — anroparen
-- (accept_business_invitation) hanterar det fallet och slumpen för
-- kollisioner, så den här funktionen kan vara ren/immutable.
create function private.slugify_business_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    regexp_replace(
      regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'),
      '(^-+)|(-+$)', '', 'g'
    ),
    32
  );
$$;

comment on function private.slugify_business_name(text) is
  'Ren hjälpfunktion för accept_business_invitation(): namn -> slug-tecken. '
  'Hanterar inte för-korta namn, reserverade ord eller kollisioner (det gör '
  'anroparen, med slump/retry — den här funktionen är IMMUTABLE och ska '
  'förbli det).';

revoke all on function private.slugify_business_name(text) from public;
-- Ingen grant behövs: anropas bara internt av accept_business_invitation
-- (SECURITY DEFINER, ägd av postgres), aldrig direkt av en klient/server-roll.

-- ===========================================================================
-- 6. public.accept_business_invitation ---------------------------------------
-- ===========================================================================
-- Samma väg som create_business() (D-014: create_business är den enda
-- INSERT-vägen in i businesses för en klientsession) — den här funktionen
-- gör i praktiken samma två inserts (businesses + memberships owner) i en
-- transaktion, men utlöst av en inbjudan i stället för klientens egen
-- formulärdata, och med rätt plan från inbjudan. SECURITY DEFINER (ingen
-- insert-policy finns eller ska finnas på businesses/memberships, se
-- businesses_memberships.sql).
--
-- OBS comuna/category: inbjudan samlar bara in namn/e-post/plan/override —
-- INTE comuna/category (som create_business()/det vanliga onboardingflödet
-- kräver, NOT NULL utan default). Den här funktionen sätter dem till '' som
-- en medveten platshållare: `authenticated` har redan
-- `grant update (..., comuna, category, ...)` på businesses (B2), så den
-- nyblivna ägaren kan fylla i dem direkt (Ajustes/fortsatt onboarding, en
-- UI-fråga för ui-engineer/scheduling-engineer, INTE en ny
-- create_business()-körning — company-raden finns redan). Ingen ny
-- "draft"-status läggs till: business_status förblir bara
-- active/frozen (B2, D-011-andan) och det nya företaget skapas `active`
-- (som vid vanlig självregistrering) trots ofullständig profil.
create function public.accept_business_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  -- Läses via auth.uid() mot auth.users (security definer): serverns withOwnerTx
  -- sätter bara sub/role i JWT-claims, så auth.email() vore alltid tom.
  v_email text := lower(coalesce((select u.email from auth.users u where u.id = auth.uid()), ''));
  v_hash bytea;
  v_inv private.business_invitations%rowtype;
  v_business_id uuid;
  v_slug text;
  v_attempt int := 0;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;
  if token is null or length(token) = 0 then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  v_hash := extensions.digest(token, 'sha256');

  select *
    into v_inv
    from private.business_invitations
   where token_hash = v_hash
   for update;

  if not found then
    raise exception 'Invitación no encontrada' using errcode = 'P0002';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'Invitación ya utilizada' using errcode = '22023';
  end if;

  if v_inv.expires_at < now() then
    raise exception 'Invitación vencida' using errcode = '22023';
  end if;

  if v_email = '' or v_email <> lower(v_inv.email) then
    raise exception 'La cuenta conectada no coincide con la invitación' using errcode = '42501';
  end if;

  v_slug := private.slugify_business_name(v_inv.business_name);
  if length(v_slug) < 3 then
    v_slug := 'negocio';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.businesses (
        name, slug, comuna, category, plan, plan_override_until
      )
      values (
        v_inv.business_name, v_slug, '', '', v_inv.plan, v_inv.plan_override_until
      )
      returning id into v_business_id;
      exit;
    exception
      -- unique_violation: slug ya tomado. check_violation: coincide con la
      -- lista de palabras reservadas (businesses_slug_not_reserved) — en
      -- ambos casos, un sufijo aleatorio resuelve el choque. Un máximo de
      -- 20 intentos hace la colisión prácticamente imposible sin arriesgar
      -- un bucle infinito.
      when unique_violation or check_violation then
        if v_attempt >= 20 then
          raise exception 'No se pudo generar un identificador único para el negocio';
        end if;
        v_slug := left(private.slugify_business_name(v_inv.business_name), 3)
          || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    end;
  end loop;

  insert into public.memberships (business_id, user_id, role)
  values (v_business_id, v_user, 'owner');

  update private.business_invitations
     set accepted_at = now(),
         business_id = v_business_id
   where id = v_inv.id;

  return v_business_id;
end;
$$;

comment on function public.accept_business_invitation(text) is
  'Acepta una business_invitations pendiente: crea el negocio (plan de la '
  'invitación, comuna/category en blanco como placeholder) y hace owner a '
  'auth.uid(). Exige que el email de auth.users (auth.uid()) = email de la invitación. SECURITY '
  'DEFINER (mismo motivo que create_business()).';

revoke all on function public.accept_business_invitation(text) from public;
grant execute on function public.accept_business_invitation(text) to authenticated;
