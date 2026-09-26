-- WP-01 · Kärnschema · Grund
-- F#: infrastruktur för alla F1-F19-tabeller i WP-01.
-- INV: förbereder INV-3 (RLS/anon-försvar på djupet) och INV-4 (schemat för private.is_member).
--
-- Extensions, schemat `private` (RLS-hjälpare, aldrig i Data API), enum-typer,
-- en delad `updated_at`-trigger och grundläggande grants: `anon` och `PUBLIC` får
-- inga rättigheter i `public` som standard. `authenticated` får explicita grants
-- per tabell/funktion i senare migrationer.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
comment on schema private is 'RLS-hjälpfunktioner. Exponeras aldrig i Data API (ingår inte i api.schemas).';
grant usage on schema private to authenticated;

-- Enum-typer -----------------------------------------------------------
create type public.member_role as enum ('owner', 'staff', 'vendor', 'admin');
create type public.waitlist_mode as enum ('sequential', 'broadcast');
create type public.business_plan as enum ('free', 'emprende', 'equipo', 'local');
create type public.business_status as enum ('active', 'frozen');
create type public.deposit_kind as enum ('none', 'fixed', 'percent');
create type public.time_off_kind as enum ('block', 'lunch', 'vacation', 'holiday');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'completed', 'no_show', 'cancelled');
create type public.booking_source as enum ('web', 'manual', 'waitlist', 'flash');
create type public.payment_kind as enum ('deposit', 'balance', 'full');
create type public.payment_method as enum ('cash', 'card_terminal', 'transfer', 'mercadopago');
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type public.consent_channel as enum ('web', 'whatsapp', 'manual');

-- Försvar på djupet för INV-3, satt INNAN några funktioner/tabeller skapas
-- (default-privilegier gäller bara objekt som skapas EFTER att de sätts, av
-- samma roll) -----------------------------------------------------------
--
-- Den lokala Supabase-plattformen sätter (utanför våra migrationer,
-- motsvarande `auto_expose_new_tables = true` i molnet) redan en
-- default-privilege SPECIFIK FÖR SCHEMAT `public` (`pg_default_acl` har en
-- rad för `postgres`/schema `public`) som ger `anon`, `authenticated` och
-- `service_role` fullt CRUD på nya tabeller/sekvenser/funktioner. En
-- schema-specifik default-privilege-rad har alltid företräde framför en
-- schemalös (global) rad för objekt som hamnar i just det schemat — därför
-- MÅSTE revoken nedan för `anon`/`authenticated` vara `in schema public`
-- (samma schema som platformens rad) för att verkligen ersätta den. Ett
-- schemalöst `alter default privileges` skulle bara skapa en egen, separat
-- rad som aldrig konsulteras för objekt i `public` (bevisat: en tidigare
-- version av den här migrationen använde `for role postgres` utan `in
-- schema` här, vilket gjorde att `anon` fortfarande fick fullt CRUD på alla
-- tabeller — granskningsfynd, rättat).
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from authenticated;

-- Säkerhet S1: den här raden är däremot medvetet UTAN `in schema`. Den
-- riktar sig mot ett annat problem: Postgres standardbeteende att en ny
-- funktion (i VILKET schema som helst) automatiskt får EXECUTE till
-- pseudo-rollen PUBLIC, om inget annat sägs — det är inte en
-- Supabase-specifik default-privilege-rad, utan inbyggt SQL-beteende.
-- `private` är ett schema VI skapar (ingen platformsrad konkurrerar med den
-- här för det schemat), så en global (schemalös) regel för `postgres` täcker
-- både `public` och `private` och alla framtida scheman vi kan komma att
-- skapa, utan att man behöver komma ihåg att lägga till `in schema` varje
-- gång. Måste stå EFTER schema-specifika `public`-raderna ovan (annars vore
-- ordningen tvärtom irrelevant) och FÖRE `private.set_updated_at()` nedan,
-- så att den funktionen aldrig får PUBLIC-execute.
alter default privileges for role postgres revoke execute on functions from public;

-- Delad trigger för updated_at ------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Explicit revoke även på redan existerande objekt — försvar på djupet, och
-- garanterar `private.set_updated_at()` oavsett antaganden om ordning ovan.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public, private from anon;
revoke execute on all functions in schema public, private from public;
