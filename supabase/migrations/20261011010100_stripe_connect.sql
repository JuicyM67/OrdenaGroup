-- WP-64 · Stripe Connect (D-044) · F#: betalning online i SE.
-- Bygger på D-027 (Stripe för abonnemang i SE) men utökar den: kunden kan
-- betala sin behandling online till företagets anslutna Stripe-konto.
--
-- Fyra delar:
--  1. businesses.online_payment: ägarens val Av / Valfri / Obligatorisk.
--  2. stripe_accounts: företagets anslutna konto och dess status. Ägaren kan
--     bara LÄSA (kontot sätts/uppdateras av servern/webhooken) — en ägare ska
--     inte kunna peka om utbetalningar till ett godtyckligt konto-id.
--  3. stripe_checkouts: en rad per Checkout-session/betalning (belopp, avgift,
--     livscykel). Bara servern skriver (service role).
--  4. inbound_events: idempotens för webhooks (INV-2, DATA_MODEL.md).
set search_path = public, extensions;

-- 1. Ägarens inställning -----------------------------------------------------
alter table public.businesses
  add column online_payment text not null default 'off',
  add constraint businesses_online_payment_check
    check (online_payment in ('off', 'optional', 'required'));
grant update (online_payment) on public.businesses to authenticated;

-- 2. stripe_accounts ---------------------------------------------------------
create table public.stripe_accounts (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  -- true när Stripe begär mer information (requirements.currently_due /
  -- past_due inte tomma) — "åtgärd krävs" i Betalningar-fliken.
  requirements_due boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at
  before update on public.stripe_accounts
  for each row execute function private.set_updated_at();

alter table public.stripe_accounts enable row level security;
create policy "owners select" on public.stripe_accounts
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select on public.stripe_accounts to authenticated;
grant select, insert, update on public.stripe_accounts to service_role;

-- 3. stripe_checkouts --------------------------------------------------------
-- status: open (session skapad) -> authorized (kortet reserverat, väntar på
-- företagets svar) -> captured (dragit) | voided (reservationen släppt) ;
-- captured -> refunded. open -> expired. 'failed' = betalningen nekades.
create table public.stripe_checkouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid not null,
  stripe_account_id text not null,
  session_id text not null unique,
  payment_intent_id text unique,
  -- Minsta enheten (SEK öre), heltal. Samma enhet som payments.amount_clp.
  amount_minor integer not null,
  fee_minor integer not null default 0,
  currency text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, booking_id) references public.bookings (business_id, id),
  constraint stripe_checkouts_amount_check check (amount_minor > 0),
  constraint stripe_checkouts_fee_check check (fee_minor >= 0 and fee_minor <= amount_minor),
  constraint stripe_checkouts_status_check check (
    status in ('open', 'authorized', 'captured', 'voided', 'refunded', 'expired', 'failed')
  )
);
create index stripe_checkouts_booking_idx on public.stripe_checkouts (business_id, booking_id);
create index stripe_checkouts_open_idx on public.stripe_checkouts (status)
  where status in ('open', 'authorized', 'captured');
create trigger set_updated_at
  before update on public.stripe_checkouts
  for each row execute function private.set_updated_at();

alter table public.stripe_checkouts enable row level security;
create policy "owners select" on public.stripe_checkouts
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select on public.stripe_checkouts to authenticated;
-- Ingen delete, inte ens för service_role (betalningshistorik).
grant select, insert, update on public.stripe_checkouts to service_role;

-- 4. inbound_events ----------------------------------------------------------
-- Webhook-idempotens (DATA_MODEL.md). `payload` är medvetet en minimal sammanfattning
-- (typ + id:n), aldrig hela providerns händelse (kan innehålla kundens e-post).
-- Inga policyer och inga grants till authenticated: tabellen är servern-bara.
create table public.inbound_events (
  provider text not null,
  event_id text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, event_id)
);
alter table public.inbound_events enable row level security;
grant select, insert, update on public.inbound_events to service_role;
