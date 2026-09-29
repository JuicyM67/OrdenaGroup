-- WP-16 · STEG 1 · `message_outbox` + `private.owner_emails()`
-- F#: F7 (bekräftelse inom 1 min, påminnelse 24 h ±5 min).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (tenant-isolering,
-- sammansatt FK mot bookings, D-014).
--
-- Beslut som styr den här migrationen (docs/decisions/DECISIONS.md):
--   D-029: kundens klartext-token ligger bara i `payload` tills raden är
--   `sent`/`dead`/`cancelled`, och töms då av workern (WP-16 steg 2, utanför
--   den här migrationen). Tabellen är oläsbar för `anon`; `authenticated`
--   (ägaren) ser bara sitt eget företags rader, ingen insert/update/delete.
--   D-030: INGEN pg_cron/pg_net/Vault — schemaläggaren är GitHub Actions mot
--   `/api/cron/outbox` (WP-16 steg 2). Bara kanalerna e-post och sms i den här
--   fasen (WhatsApp läggs till i en egen WP, se DATA_MODEL.md).
--
-- Adressen (telefon/e-post) lagras ALDRIG i den här tabellen (regel 8, ingen
-- persondata i loggar/kön i onödan) — workern slår upp kundens/ägarens adress
-- vid utskickstillfället via `booking_id`/`recipient_kind`. `recipient_kind =
-- 'owner'` slår upp adressen via `private.owner_emails()` nedan, eftersom
-- ägarens e-post bara finns i `auth.users`, som `authenticated` aldrig får
-- läsa direkt.

-- `core_foundation` gav bara `authenticated` USAGE på schemat `private`
-- (behövdes för att RLS-policyer, kompilerade av ägaren `postgres`, ska gå
-- att skapa). `private.owner_emails()` nedan anropas direkt (inte bara via en
-- policy) av servern med `set local role service_role` (D-019) — utan USAGE
-- på schemat får service_role "permission denied for schema private" innan
-- ens funktionens egen EXECUTE-grant hinner prövas.
grant usage on schema private to service_role;

create type public.message_channel as enum ('email', 'sms');
create type public.message_recipient_kind as enum ('customer', 'owner');
create type public.message_outbox_status as enum ('queued', 'sending', 'sent', 'failed', 'dead', 'cancelled');
-- Oförändrad från DATA_MODEL.md-utkastet: 'marketing' krävs redan av
-- `customers.consent_marketing_at` (WP-30 filtrerar på den, se COMPLIANCE.md),
-- 'service' reserverad för framtida icke-bokningsmeddelanden. Alla mallar i
-- WP-16 (steg 2) är 'utility'.
create type public.message_category as enum ('utility', 'marketing', 'service');

create table public.message_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid,
  channel public.message_channel not null,
  recipient_kind public.message_recipient_kind not null,
  -- Mallnamn (t.ex. 'reservaConfirmada', 'recordatorio'); texterna själva ägs
  -- av copywriter-es-cl (src/i18n/), inte av databasen.
  template text not null,
  -- Renderingsvariabler + (bara medan raden väntar) kundens klartext-token
  -- (D-029). Ingen adress (telefon/e-post) läggs här.
  payload jsonb not null default '{}'::jsonb,
  category public.message_category not null,
  status public.message_outbox_status not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  -- Bara en felkod, aldrig persondata (regel 8).
  error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, booking_id) references public.bookings (business_id, id),
  constraint message_outbox_attempts_check check (attempts >= 0),
  constraint message_outbox_template_not_blank check (char_length(template) > 0),
  -- sent_at är satt precis när (och bara när) statusen är 'sent'.
  constraint message_outbox_sent_at_check check ((status = 'sent') = (sent_at is not null))
);

-- D-014/schema_guard: index som börjar på business_id (tenant-filter).
create index message_outbox_business_id_idx on public.message_outbox (business_id);
-- Workerns plockning: `where status = 'queued' and next_attempt_at <= now() for update skip locked`.
create index message_outbox_status_next_attempt_at_idx on public.message_outbox (status, next_attempt_at);
-- Uppslag av en boknings meddelanden (t.ex. avbryt väntande påminnelser vid flytt/avbokning).
create index message_outbox_booking_id_idx on public.message_outbox (booking_id);

create trigger set_updated_at
  before update on public.message_outbox
  for each row execute function private.set_updated_at();

-- RLS ------------------------------------------------------------------
-- Bara select för authenticated (ägare/admin), ingen insert/update/delete:
-- kön skrivs och plockas bara av servern (service_role, D-019). `payload`
-- kan tillfälligt innehålla kundens klartext-token (D-029), så tenant-
-- isoleringen här är extra viktig — samma "owner/admin"-nivå som `bookings`
-- och `customers`, inte alla medlemsroller.
alter table public.message_outbox enable row level security;

create policy "owners select" on public.message_outbox
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

grant select on public.message_outbox to authenticated;
-- Säkerhet S2: service_role (enqueue.ts/worker.ts/cron-routen, WP-16 steg 2)
-- har fullt CRUD. Ingen kassahistorik-liknande "aldrig delete"-regel här:
-- gamla sent/dead/cancelled-rader kan städas.
grant select, insert, update, delete on public.message_outbox to service_role;

-- private.owner_emails ---------------------------------------------------
-- Workern behöver ägarens/ägarnas e-post för mallarna `nuevaReservaDueno` och
-- `cancelacionDueno`, men `auth.users` går inte att läsa direkt (varken via
-- RLS-policy eller Data API). `security definer` + `search_path = ''`
-- (schema_guard-punkt 4). Bara `service_role` får köra den — varken `anon`
-- eller `authenticated` ska kunna hämta ut e-postadresser den här vägen.
create function private.owner_emails(b uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from auth.users u
  join public.memberships m on m.user_id = u.id
  where m.business_id = b
    and m.role = 'owner'
    and u.email is not null;
$$;

revoke all on function private.owner_emails(uuid) from public;
grant execute on function private.owner_emails(uuid) to service_role;
