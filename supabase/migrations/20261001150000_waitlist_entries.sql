-- WP-23 · Väntelista (F8) (db-engineer) · `waitlist_entries`
-- Plan: docs/tasks/plans/WP-23-30.md, "Väntelista".
-- INV: INV-3 (RLS, inga anon-policies), INV-4 (tenant-isolering, sammansatta
-- FK, D-014).
--
-- Kolumner enligt planen (ordagrant, avviker därmed medvetet från
-- DATA_MODEL.md-utkastets äldre `date`/`cancelled`/`position`): `day` (inte
-- `date` — `date` krockar visuellt med typnamnet `date` i läsningar/typer),
-- status `waiting|offered|booked|expired|removed` (`removed` i stället för
-- utkastets `cancelled`: raden tas bort av ÄGAREN, inte av kunden själv).
-- Ingen `position`-kolumn: `created_at` räcker som FIFO-ordning för den
-- sekventiella matchningen (WP:t som bygger matchningsmotorn,
-- scheduling-engineer, sorterar på den vid behov) — en separat kolumn att
-- hålla i synk vid varje insert/delete är onödig komplexitet här.
--
-- Skrivväg (medvetet val, samma mönster som `campaigns`/`campaign_recipients`
-- efter 20261001130000 — se den filens kommentar): kunden går med från den
-- PUBLIKA bokningssidan (`/[slug]`, utan konto), vilket alltid går via
-- servern med service_role (ARCHITECTURE.md: "Den publika bokningssidan
-- läser via servern... med service role"). Att erbjuda nästa i kön, sätta
-- `offer_token_hash`/`offer_expires_at` och hantera utgång är också
-- server-/cron-arbete (service_role, D-029-mönstret för token-hash). Den ENDA
-- skrivningen en inloggad medlem gör direkt är att TA BORT en väntande kund
-- från listan i Agenda/Hoy (ägarens uttryckliga krav) — modellerad som en
-- smal UPDATE-policy som bara tillåter statusbytet till 'removed', inte som
-- INSERT/DELETE för authenticated.
set search_path = public, extensions;

create type public.waitlist_status as enum ('waiting', 'offered', 'booked', 'expired', 'removed');

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  service_id uuid not null,
  staff_id uuid,
  day date not null,
  status public.waitlist_status not null default 'waiting',
  offered_at timestamptz,
  offer_expires_at timestamptz,
  -- FRÅGA 6/D-029-mönstret (samma som bookings.manage_token_hash och
  -- campaign_recipients.token_hash): bara en SHA-256-hash sparas, klartexten
  -- finns bara i erbjudandelänken (`/v/[token]`) till kunden.
  offer_token_hash bytea unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services (business_id, id) on delete cascade,
  -- staff_id null = vem som helst duger (matchar DATA_MODEL.md-mönstret för
  -- time_off.staff_id). Kolumn-listform på on delete set null, annars nollas
  -- hela FK-kolumnuppsättningen inklusive business_id (samma gotcha som
  -- services.category_id m.fl.).
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete set null (staff_id),
  -- K1: en SHA-256-hash är alltid exakt 32 byte.
  constraint waitlist_entries_offer_token_hash_length check (offer_token_hash is null or octet_length(offer_token_hash) = 32),
  -- offered_at och offer_expires_at sätts/nollas alltid tillsammans (ett
  -- erbjudande har alltid både en starttid och en hålltid-deadline, eller
  -- inget av dem).
  constraint waitlist_entries_offer_consistency check ((offered_at is null) = (offer_expires_at is null))
);

-- Planens uttryckliga index.
create index waitlist_entries_business_id_day_status_idx on public.waitlist_entries (business_id, day, status);
create index waitlist_entries_service_id_idx on public.waitlist_entries (service_id);

create trigger set_updated_at
  before update on public.waitlist_entries
  for each row execute function private.set_updated_at();

alter table public.waitlist_entries enable row level security;

-- Läsning: hela kalenderns medlemmar (owner + staff), samma bredd som
-- bookings/staff/customers sedan WP-46 steg 2.
create policy "read waitlist_entries" on public.waitlist_entries
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Smal skrivning: bara statusbytet till 'removed', bara ägare/
-- can_manage_all_bookings (private.has_perm kortsluter redan till true för
-- role = 'owner'). `using` styr VILKEN rad som får röras alls, `with check`
-- styr att NYA raden bara får ha status = 'removed' — en medlem med den här
-- policyn kan alltså inte smyga in något annat statusbyte via samma väg.
create policy "owners remove waitlist_entries" on public.waitlist_entries
  for update
  to authenticated
  using (private.has_perm(business_id, 'can_manage_all_bookings'))
  with check (
    private.has_perm(business_id, 'can_manage_all_bookings')
    and status = 'removed'
  );

grant select on public.waitlist_entries to authenticated;
grant update (status) on public.waitlist_entries to authenticated;
-- Säkerhet S2: service_role (publika bokningssidans "gå med i kön", cron-
-- matchningen/erbjudandena/utgången) har fullt CRUD.
grant select, insert, update, delete on public.waitlist_entries to service_role;
