-- WP-80 · Plattformsadmins hanteras i /admin (D-061, ersätter D-038:s
-- "första admin läggs in manuellt med SQL" för alla utom den allra första).
--
-- Ägarens beslut 2026-10-18: en befintlig plattformsadmin (aal2) kan lista,
-- lägga till och ta bort admins i `/admin/administradores`. Servern
-- (`src/server/admin/admins.ts`, service_role) kontrollerar "inte sig själv"
-- och "inte den sista" och skriver varje ändring i `admin_audit_log` i samma
-- transaktion. Den första adminen läggs in en gång med `npm run admin:add`
-- (scripts/admin-add.ts, som postgres).
--
-- Fortfarande: RLS påslaget utan policy, ingen grant till authenticated/anon
-- (pgTAP 109 + 140). Nytt: service_role får insert/delete (bara /admin efter
-- `requireAdminForAction()`), och databasen vägrar själv att tömma tabellen
-- (sista-admin-spärren nedan) — även om serverkoden skulle ha en bugg.

alter table private.platform_admins
  add column added_by uuid references auth.users (id) on delete set null;

comment on column private.platform_admins.added_by is
  'Vem som lade till adminen (WP-80). NULL = inlagd med scripts/admin-add.ts '
  'eller manuellt som postgres.';

grant insert, delete on private.platform_admins to service_role;

-- Sista-admin-spärren: efter varje delete-sats måste minst en admin finnas
-- kvar. Statement-nivå så att en delete av flera rader bedöms som helhet.
-- Gäller också kaskaden från auth.users (den sista adminens konto kan inte
-- raderas förrän en annan admin finns) — avsiktligt.
create function private.platform_admins_keep_one()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from private.platform_admins) then
    raise exception 'last_platform_admin' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function private.platform_admins_keep_one() from public;

create trigger platform_admins_keep_one
  after delete on private.platform_admins
  for each statement
  execute function private.platform_admins_keep_one();
