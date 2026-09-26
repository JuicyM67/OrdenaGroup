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

-- Försvar på djupet för INV-3: varken `anon` eller `PUBLIC` (funktioners
-- standardrättighet) har några rättigheter i `public`. `authenticated` får
-- uttryckliga grants per tabell/funktion när de skapas.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke execute on all functions in schema public from public;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke execute on functions from public;
