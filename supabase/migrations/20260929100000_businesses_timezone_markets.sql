-- D-025/D-026: en kodbas, flera marknader (en installation per region).
-- `businesses_timezone_allowed` i 20260927100100_businesses_memberships.sql
-- tillät bara 'America/Santiago' (D-011). Migrationen ändras aldrig i
-- efterhand, så vidgningen till 'Europe/Stockholm' görs här.
--
-- `businesses.timezone` styrs bara av servern (kommentar rad ~207 i den
-- migrationen): `authenticated` saknar fortfarande `timezone` i sin
-- kolumnbegränsade update-grant, oförändrat. Det som ändras är bara VILKA
-- värden kolumnen och `create_business()` accepterar vid SKAPANDET av
-- företaget, inte vem som får sätta dem efteråt.
--
-- Vald lösning: `create_business()` får en sjätte parameter `timezone`
-- (samma namnkonvention som `name`/`slug`/`comuna`/`category`/`phone`
-- redan använder — plparametrar med samma namn som kolumner, inga
-- ambiguity-problem i en VALUES-lista) med default 'America/Santiago'
-- (schemats defaultvärde ändras INTE, per uppdrag: Chile förblir standard).
-- Anropet kommer bara från servern (`src/server/onboarding/
-- complete-onboarding.ts`, `withOwnerTx`, D-019) som skickar
-- `marketConfig.timeZone` (`src/config/market.ts`, D-025) — ett
-- installations-konstant, inte klientinmatning. Funktionen är
-- `security definer` och exponeras via `grant execute ... to authenticated`
-- (oförändrat, krävs redan för onboarding), så en direktanropande klient
-- SKULLE tekniskt kunna skicka ett annat värde än sin installations
-- marknad — men `businesses_timezone_allowed` begränsar ändå till exakt de
-- två giltiga installationstidszonerna (samma försvar-på-djupet-mönster som
-- redan finns för `slug`/`logo_url` via CHECK, inte funktionslogik). Inget
-- nytt hål: samma grant fanns redan för de fem ursprungliga parametrarna.
--
-- Alternativ som valdes bort: en Postgres-inställning (GUC) satt per
-- anslutning hade krävt att varje serverkoppling explicit satte den (mer
-- rörliga delar för samma resultat, eftersom CL och SE ändå kör samma
-- migrationsfiler mot olika Supabase-projekt — D-025 — och alltså inte kan
-- skilja default via schemat).

-- 1. Vidga CHECK-constraint: Chile eller Sverige, inte "vilken zon som helst".
alter table public.businesses
  drop constraint businesses_timezone_allowed;

alter table public.businesses
  add constraint businesses_timezone_allowed
  check (timezone in ('America/Santiago', 'Europe/Stockholm'));

-- 2. create_business(): ny sjätte parameter `timezone`, defaultar till
--    schemats värde så befintliga anrop (5 positionsargument) är oförändrade.
drop function if exists public.create_business(text, text, text, text, text);

create function public.create_business(
  name text,
  slug text,
  comuna text,
  category text,
  phone text default null,
  timezone text default 'America/Santiago'
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

  insert into public.businesses (name, slug, comuna, category, phone, timezone)
  values (name, slug, comuna, category, phone, timezone)
  returning id into v_business_id;

  insert into public.memberships (business_id, user_id, role)
  values (v_business_id, v_user, 'owner');

  return v_business_id;
end;
$$;

revoke all on function public.create_business(text, text, text, text, text, text) from public;
grant execute on function public.create_business(text, text, text, text, text, text) to authenticated;
