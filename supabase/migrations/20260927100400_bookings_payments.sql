-- WP-01 · Kärnschema · Bokningar och betalningar
-- F#: F3 (bokningar och buffertar blockerar tillgänglighet), F4 (dubbelbokning omöjlig).
-- INV: INV-1 (exclusion constraint `no_overlap`), INV-3, INV-4.
--
-- search_path utökas till extensions för den här sessionen, se
-- 20260927100200_catalog_and_hours.sql.
set search_path = public, extensions;

-- bookings ------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null,
  service_id uuid not null,
  customer_id uuid not null,
  -- period = själva tjänsten. blocked = period + buffert, används av no_overlap.
  period tstzrange not null,
  blocked tstzrange not null,
  status public.booking_status not null,
  source public.booking_source not null,
  price_clp integer not null,
  discount_clp integer not null default 0,
  deposit_clp integer not null default 0,
  -- FRÅGA 6 (godkänd): hash i stället för klartext. Klartexten finns bara i
  -- länken/meddelandet till kunden.
  manage_token_hash bytea unique,
  pending_expires_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  reminded_at timestamptz,
  confirmed_by_customer_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, staff_id) references public.staff (business_id, id),
  foreign key (business_id, service_id) references public.services (business_id, id),
  foreign key (business_id, customer_id) references public.customers (business_id, id),
  constraint bookings_price_clp_check check (price_clp >= 0),
  constraint bookings_period_not_empty check (not isempty(period)),
  constraint bookings_period_half_open check (lower_inc(period) and not upper_inc(period)),
  constraint bookings_blocked_not_empty check (not isempty(blocked)),
  constraint bookings_blocked_half_open check (lower_inc(blocked) and not upper_inc(blocked)),
  constraint bookings_blocked_starts_with_period check (lower(blocked) = lower(period)),
  constraint bookings_blocked_contains_period check (blocked @> period),
  constraint bookings_discount_clp_check check (discount_clp between 0 and price_clp),
  constraint bookings_deposit_clp_check check (deposit_clp between 0 and price_clp - discount_clp),
  constraint bookings_pending_expires_at_check check ((status = 'pending_payment') = (pending_expires_at is not null)),
  constraint bookings_cancelled_at_check check ((status = 'cancelled') = (cancelled_at is not null)),
  -- K1: en SHA-256-hash är alltid exakt 32 byte. Fångar bugg där fel
  -- hashalgoritm eller ett rått token råkar sparas i stället för en hash.
  constraint bookings_manage_token_hash_length check (manage_token_hash is null or octet_length(manage_token_hash) = 32),
  -- K2: en bokning har alltid ett bestämt slut. Ett obegränsat intervall
  -- (`[a,)`) skulle bland annat göra `blocked @> period` meningslös och
  -- blockera all framtid för profesionalen.
  constraint bookings_period_bounded check (not upper_inf(period) and not upper_inf(blocked))
);

create index bookings_business_id_lower_period_idx on public.bookings (business_id, (lower(period)));
create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_business_id_period_gist_idx on public.bookings using gist (business_id, period);

create trigger set_updated_at
  before update on public.bookings
  for each row execute function private.set_updated_at();

-- INV-1: ingen dubbelbokning av samma profesional, exakt enligt DATA_MODEL.md.
alter table public.bookings
  add constraint no_overlap
  exclude using gist (staff_id with =, blocked with &&)
  where (status in ('pending_payment', 'confirmed', 'completed'));

alter table public.bookings enable row level security;
create policy "owners full access" on public.bookings
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.bookings to authenticated;
-- Säkerhet S2: explicit grant till service_role (kundens publika bokningsflöde
-- körs på servern, som skapar/uppdaterar bokningar med service role och ett
-- explicit business_id-filter, se ARCHITECTURE.md princip 3).
grant select, insert, update, delete on public.bookings to service_role;

-- payments ------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid not null,
  kind public.payment_kind not null,
  method public.payment_method not null,
  amount_clp integer not null,
  status public.payment_status not null,
  provider_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, booking_id) references public.bookings (business_id, id),
  constraint payments_amount_clp_check check (amount_clp > 0),
  constraint payments_approved_requires_paid_at check (status <> 'approved' or paid_at is not null)
);

create index payments_business_id_idx on public.payments (business_id);
create index payments_booking_id_idx on public.payments (booking_id);

-- Förbereder idempotens i WP-25 (webhook-återförsök från samma providerref).
create unique index payments_method_provider_ref_uidx
  on public.payments (method, provider_ref)
  where provider_ref is not null;

create trigger set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

alter table public.payments enable row level security;
create policy "owners select" on public.payments
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
-- Säkerhet B1: `authenticated` (ägarens app) kan bara skapa/ändra kontanta
-- eller manuella betalningsrader. `mercadopago`-rader (med provider_ref) är
-- skrivskyddade för authenticated — de skapas/uppdateras bara av service
-- role i webhook-hanteraren (WP-25), som förbigår RLS. Utan detta skulle en
-- ägare kunna skriva en falsk "approved"-rad med ett gissat provider_ref,
-- eller manipulera en riktig MP-betalnings status/belopp i efterhand.
create policy "owners insert" on public.payments
  for insert
  to authenticated
  with check (
    private.is_member(business_id, array['owner', 'admin']::public.member_role[])
    and method in ('cash', 'card_terminal', 'transfer')
    and provider_ref is null
  );
create policy "owners update" on public.payments
  for update
  to authenticated
  using (
    private.is_member(business_id, array['owner', 'admin']::public.member_role[])
    and method <> 'mercadopago'
  )
  with check (
    private.is_member(business_id, array['owner', 'admin']::public.member_role[])
    and method in ('cash', 'card_terminal', 'transfer')
    and provider_ref is null
  );
-- Ingen delete-policy: kassahistorik försvinner aldrig, rättning görs med
-- status refunded/rejected.
grant select, insert, update on public.payments to authenticated;
-- Säkerhet S2 (rättad, granskningsfynd): explicit grant till service_role
-- (WP-25:s webhook-hanterare skriver mercadopago-rader från servern,
-- förbigår RLS med den här rollen) — men INGEN delete, inte ens för
-- service_role. Kassahistorik ska aldrig kunna försvinna, oavsett vilken
-- roll som frågar; rättning görs med status refunded/rejected.
grant select, insert, update on public.payments to service_role;
