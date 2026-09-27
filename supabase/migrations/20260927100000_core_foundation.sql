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
-- Hur `alter default privileges` faktiskt kombineras (rättad förklaring,
-- granskningsfynd): en schema-specifik rad (`in schema X`) och en schemalös
-- (global) rad för samma roll är TVÅ SEPARATA rader i `pg_default_acl` som
-- LÄGGS OVANPÅ VARANDRA (adderas), inte "den mest specifika vinner allt". Av
-- det följer:
--   * Det som getts PER SCHEMA kan bara återkallas med en revoke `in schema`
--     samma schema. En schemalös revoke rör en annan (global) rad och gör
--     ingenting åt den schema-specifika.
--   * Det som getts GLOBALT (utan `in schema`) kan inte återkallas med en
--     schema-specifik revoke — bara med en annan schemalös sats.
--
-- Den lokala Supabase-plattformen har satt en schema-specifik rad
-- (`postgres`/schema `public`, synlig i `pg_default_acl`) som ger `anon`,
-- `authenticated` och `service_role` fullt CRUD på nya tabeller/sekvenser/
-- funktioner i `public`. Revoken nedan för `anon`/`authenticated` MÅSTE
-- därför vara `in schema public` för att träffa och ändra just den raden.
-- (Granskningsfynd, rättat: en tidigare version använde `for role postgres`
-- utan `in schema`, vilket bara skapade en egen, obesläktad global rad —
-- plattformens schema-specifika grant till anon stod kvar orörd, så `anon`
-- behöll fullt CRUD på alla tabeller trots migrationen.)
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from authenticated;

-- Säkerhet S1: den här raden är däremot medvetet UTAN `in schema` (en global
-- rad). Den riktar sig mot ett annat problem: Postgres standardbeteende att
-- en ny funktion (i vilket schema som helst) automatiskt får EXECUTE till
-- pseudo-rollen PUBLIC om ingen default-ACL-rad alls (varken global eller
-- schema-specifik) matchar — det är inte en Supabase-satt rad, utan
-- inbyggt SQL-fallback. `public` har redan sin egen schema-specifika rad för
-- funktioner (se ovan/testat i 000_schema_guard), så den påverkas inte av
-- den globala raden här. `private` saknar en egen schema-specifik rad, så
-- den globala gäller där i stället för SQL-fallbacken. En och samma global
-- rad täcker alltså `private` och alla framtida scheman vi kan komma att
-- skapa. Måste stå EFTER schema-specifika `public`-raderna ovan och FÖRE
-- `private.set_updated_at()` nedan, så att den funktionen aldrig får
-- PUBLIC-execute.
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
