-- WP-77 (D-058) · Presentkort (bara SE): värdebaserat, gäller alla tjänster
-- hos salongen, 24 månader, delinlösen, flerfunktionsvoucher.
--
-- `gift_card_orders`: köpet (Stripe Checkout, direct charge på företagets
--   konto). Köparen kan vara gäst (`user_id` null): namn + e-post.
-- `gift_cards`: presentkortet, kod `XX-XXXX-XXXX-XXXX` (12 tecken Crockford
--   base32, 60 bitar). `balance_minor` ändras BARA via `gift_card_ledger`
--   (trigger), så `balance_minor = sum(delta_minor)` gäller alltid och
--   `check (balance_minor >= 0)` gör att saldot aldrig kan bli negativt.
-- `gift_card_ledger`: append-only (inga update/delete-grants, inte heller för
--   service_role).
--
-- INV-3: RLS, inga anon-policies. Köparen (inloggad) läser sina egna (koden
-- bara via `private.my_gift_cards()`), medlemmar med `can_view_reports` läser
-- företagets UTAN kod, e-post, hälsning och token (kolumn-grants). Alla
-- skrivningar görs av servern (service_role) via funktionerna nedan; kassans
-- inlösen (`gift_card_redeem_at_till`) får köras som inloggad medlem med egen
-- behörighetskontroll.
-- INV-4 (D-014): `business_id` + sammansatta FK.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Företagets reglage (ägaren via servern; av som standard)
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column gift_cards_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- gift_card_orders
-- ---------------------------------------------------------------------------
create table public.gift_card_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Gäst = null. Ingen kaskad (som D-054/D-057): pengarna finns hos företaget.
  user_id uuid references auth.users (id),
  -- Persondata (nollas av svepet 90 dagar efter att kortet är förbrukat,
  -- utgånget eller återbetalt, D-058).
  buyer_name text check (buyer_name is null or char_length(buyer_name) between 1 and 80),
  buyer_email text check (
    buyer_email is null or (char_length(buyer_email) <= 254 and position('@' in buyer_email) > 1)
  ),
  recipient_name text check (recipient_name is null or char_length(recipient_name) between 1 and 80),
  recipient_email text check (
    recipient_email is null or (char_length(recipient_email) <= 254 and position('@' in recipient_email) > 1)
  ),
  greeting text check (greeting is null or char_length(greeting) <= 300),
  theme text not null default 'lilac' check (theme in ('lime', 'lilac', 'photo')),
  -- Leveransdag (företagets tidszon), kl. 08:00. Null = direkt.
  deliver_on date,
  -- 100–5 000 kr i hela kronor (öre).
  amount_minor integer not null
    check (amount_minor between 10000 and 500000 and amount_minor % 100 = 0),
  fee_minor integer not null check (fee_minor >= 0),
  currency text not null default 'SEK' check (currency = 'SEK'),
  stripe_account_id text not null,
  session_id text unique,
  payment_intent_id text unique,
  status text not null default 'open'
    check (status in ('open', 'paid', 'expired', 'failed')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  -- Köparens länk (visa/skriv ut/ångra köp), bara SHA-256 (D-029-mönstret).
  buyer_token_hash bytea,
  personal_data_cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint gift_card_orders_fee_le_amount check (fee_minor <= amount_minor),
  constraint gift_card_orders_paid_at check ((status = 'paid') = (paid_at is not null))
);

create index gift_card_orders_user_idx on public.gift_card_orders (user_id)
  where user_id is not null;
create index gift_card_orders_open_idx on public.gift_card_orders (next_attempt_at)
  where status = 'open';
create index gift_card_orders_business_idx on public.gift_card_orders (business_id, created_at);

alter table public.gift_card_orders enable row level security;
-- Supabase ger nya tabeller alla rättigheter som standard: bara det som
-- uttryckligen beviljas nedan gäller.
revoke all on public.gift_card_orders from anon, authenticated;
revoke delete, truncate on public.gift_card_orders from service_role;

create policy "buyer reads own gift card orders" on public.gift_card_orders
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "reporting members read gift card orders" on public.gift_card_orders
  for select to authenticated
  using (private.has_perm(business_id, 'can_view_reports'));

-- Aldrig e-post, namn, hälsning eller token via tabellen.
grant select (id, business_id, amount_minor, fee_minor, currency, status, theme,
              deliver_on, created_at, paid_at)
  on public.gift_card_orders to authenticated;
grant select, insert, update on public.gift_card_orders to service_role;

create trigger gift_card_orders_set_updated_at
  before update on public.gift_card_orders
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- gift_cards
-- ---------------------------------------------------------------------------
create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null unique,
  user_id uuid references auth.users (id),
  code text not null unique check (
    code ~ '^[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'
  ),
  initial_minor integer not null check (initial_minor between 10000 and 500000),
  balance_minor integer not null default 0
    check (balance_minor >= 0 and balance_minor <= initial_minor),
  currency text not null default 'SEK' check (currency = 'SEK'),
  purchased_at timestamptz not null,
  -- Sista sekunden på giltighetsdagen (24 månader) i företagets tidszon.
  expires_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'refunding', 'refunded', 'expired', 'disputed', 'depleted')),
  -- Mottagarens länk (visa saldo/skriv ut), bara SHA-256.
  view_token_hash bytea not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, order_id) references public.gift_card_orders (business_id, id),
  constraint gift_cards_expires_after_purchase check (expires_at > purchased_at)
);

create index gift_cards_business_status_idx on public.gift_cards (business_id, status);
create index gift_cards_user_idx on public.gift_cards (user_id) where user_id is not null;
create index gift_cards_active_expiry_idx on public.gift_cards (expires_at)
  where status = 'active';

alter table public.gift_cards enable row level security;
-- Supabase ger nya tabeller alla rättigheter som standard: bara det som
-- uttryckligen beviljas nedan gäller.
revoke all on public.gift_cards from anon, authenticated;
revoke delete, truncate on public.gift_cards from service_role;

create policy "buyer reads own gift cards" on public.gift_cards
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "reporting members read gift cards" on public.gift_cards
  for select to authenticated
  using (private.has_perm(business_id, 'can_view_reports'));

-- Aldrig `code`, `user_id` eller token via tabellen (gissningsskydd).
grant select (id, business_id, order_id, initial_minor, balance_minor, currency,
              purchased_at, expires_at, status, delivered_at, created_at)
  on public.gift_cards to authenticated;
grant select, insert, update on public.gift_cards to service_role;

create trigger gift_cards_set_updated_at
  before update on public.gift_cards
  for each row execute function private.set_updated_at();

comment on table public.gift_cards is
  'WP-77 (D-058): presentkort (SE). Saldot ändras bara via gift_card_ledger.';

-- ---------------------------------------------------------------------------
-- gift_card_ledger (append-only)
-- ---------------------------------------------------------------------------
create table public.gift_card_ledger (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  gift_card_id uuid not null,
  kind text not null
    check (kind in ('issue', 'hold', 'release', 'redeem', 'refund', 'expire')),
  delta_minor integer not null,
  booking_id uuid,
  payment_id uuid,
  actor_user_id uuid,
  created_at timestamptz not null default now(),
  foreign key (business_id) references public.businesses (id) on delete cascade,
  foreign key (business_id, gift_card_id) references public.gift_cards (business_id, id) on delete cascade,
  foreign key (business_id, booking_id) references public.bookings (business_id, id),
  constraint gift_card_ledger_sign check (
    (kind in ('issue', 'release') and delta_minor > 0)
    or (kind not in ('issue', 'release') and delta_minor < 0)
  ),
  constraint gift_card_ledger_hold_booking check (
    kind not in ('hold', 'release') or booking_id is not null
  )
);

create unique index gift_card_ledger_one_issue on public.gift_card_ledger (gift_card_id)
  where kind = 'issue';
create unique index gift_card_ledger_one_hold on public.gift_card_ledger (booking_id)
  where kind = 'hold';
create unique index gift_card_ledger_one_release on public.gift_card_ledger (booking_id)
  where kind = 'release';
create index gift_card_ledger_card_idx on public.gift_card_ledger (business_id, gift_card_id, id);

alter table public.gift_card_ledger enable row level security;
-- Supabase ger nya tabeller alla rättigheter som standard: bara det som
-- uttryckligen beviljas nedan gäller.
revoke all on public.gift_card_ledger from anon, authenticated;
revoke update, delete, truncate on public.gift_card_ledger from service_role;

create policy "reporting members read gift card ledger" on public.gift_card_ledger
  for select to authenticated
  using (private.has_perm(business_id, 'can_view_reports'));

grant select (id, business_id, gift_card_id, kind, delta_minor, booking_id,
              payment_id, created_at)
  on public.gift_card_ledger to authenticated;
-- Append-only: bara select + insert, även för servern.
grant select, insert on public.gift_card_ledger to service_role;

-- Saldot följer ledgern (enda vägen att ändra det).
create function private.gift_card_ledger_apply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.gift_cards
     set balance_minor = balance_minor + new.delta_minor
   where business_id = new.business_id and id = new.gift_card_id;
  return new;
end;
$$;
revoke all on function private.gift_card_ledger_apply() from public;

create trigger gift_card_ledger_apply
  after insert on public.gift_card_ledger
  for each row execute function private.gift_card_ledger_apply();

-- ---------------------------------------------------------------------------
-- Öppna en order. Servern har validerat formuläret (Zod); här kontrolleras
-- det som bara databasen vet: företaget säljer presentkort, planen har
-- onlinebetalning, Stripe-kontot kan ta betalt, beloppet och leveransdagen.
-- Avgiften räknas här (aldrig från klienten). En öppen order med levande
-- session och samma innehåll återanvänds (dubbelklick).
-- ---------------------------------------------------------------------------
create function private.gift_card_open_order(
  p_business_id uuid,
  p_user_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_recipient_name text,
  p_recipient_email text,
  p_greeting text,
  p_theme text,
  p_deliver_on date,
  p_amount_minor integer,
  p_fee_bps integer,
  p_ttl_minutes integer,
  p_now timestamptz
)
returns table (
  outcome text,
  order_id uuid,
  amount_minor integer,
  fee_minor integer,
  currency text,
  stripe_account_id text,
  session_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  v_existing record;
  v_today date;
  v_fee integer;
  v_id uuid;
begin
  if p_fee_bps is null or p_fee_bps < 0 or p_fee_bps > 5000 then
    raise exception 'gift_card_open_order: ogiltig avgift' using errcode = '22023';
  end if;

  select bz.id, bz.status::text as status, bz.deletion_requested_at,
         bz.gift_cards_enabled, bz.timezone,
         private.plan_has_feature(bz.plan::text, 'online_payment') as plan_ok,
         sa.stripe_account_id, coalesce(sa.charges_enabled, false) as charges_enabled
    into b
    from public.businesses bz
    left join public.stripe_accounts sa on sa.business_id = bz.id
   where bz.id = p_business_id;

  if not found
     or b.status <> 'active'
     or b.deletion_requested_at is not null
     or not b.gift_cards_enabled
     or not b.plan_ok
     or b.stripe_account_id is null
     or not b.charges_enabled then
    return query select 'unavailable'::text, null::uuid, null::integer, null::integer,
                        null::text, null::text, null::text;
    return;
  end if;

  v_today := (p_now at time zone b.timezone)::date;
  if p_amount_minor is null or p_amount_minor < 10000 or p_amount_minor > 500000
     or p_amount_minor % 100 <> 0
     or (p_deliver_on is not null
         and (p_deliver_on < v_today or p_deliver_on > v_today + 90)) then
    return query select 'invalid'::text, null::uuid, null::integer, null::integer,
                        null::text, null::text, null::text;
    return;
  end if;

  select o.id, o.session_id, o.amount_minor, o.fee_minor
    into v_existing
    from public.gift_card_orders o
   where o.business_id = p_business_id
     and o.status = 'open' and o.session_id is not null
     and o.expires_at > p_now + interval '2 minutes'
     and o.user_id is not distinct from p_user_id
     and o.buyer_email = p_buyer_email
     and o.amount_minor = p_amount_minor
     and o.recipient_name is not distinct from p_recipient_name
     and o.recipient_email is not distinct from p_recipient_email
     and o.greeting is not distinct from p_greeting
     and o.theme = p_theme
     and o.deliver_on is not distinct from p_deliver_on
   order by o.created_at desc
   limit 1;
  if found then
    return query select 'reused'::text, v_existing.id, v_existing.amount_minor,
                        v_existing.fee_minor, 'SEK'::text, b.stripe_account_id,
                        v_existing.session_id;
    return;
  end if;

  v_fee := least(floor(p_amount_minor::numeric * p_fee_bps / 10000)::integer, p_amount_minor);
  insert into public.gift_card_orders
    (business_id, user_id, buyer_name, buyer_email, recipient_name, recipient_email,
     greeting, theme, deliver_on, amount_minor, fee_minor, stripe_account_id,
     expires_at, next_attempt_at)
  values (p_business_id, p_user_id, p_buyer_name, p_buyer_email, p_recipient_name,
          p_recipient_email, p_greeting, p_theme, p_deliver_on, p_amount_minor, v_fee,
          b.stripe_account_id,
          p_now + make_interval(mins => p_ttl_minutes),
          p_now + make_interval(mins => p_ttl_minutes + 15))
  returning id into v_id;

  return query select 'created'::text, v_id, p_amount_minor, v_fee, 'SEK'::text,
                      b.stripe_account_id, null::text;
end;
$$;

-- Stäng en öppen order (sessionen gick ut / avbröts / gick inte att skapa).
create function private.gift_card_release_order(p_order_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_status not in ('expired', 'failed') then
    raise exception 'gift_card_release_order: ogiltig status' using errcode = '22023';
  end if;
  update public.gift_card_orders set status = p_status
   where id = p_order_id and status = 'open';
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Leveranstidpunkten: `deliver_on` kl. 08:00 i företagets tidszon (rätt även
-- över sommartid: `timestamp at time zone tz`). Ingen dag eller en dag som
-- redan passerat (sen webhook) = direkt.
create function private.gift_card_delivery_at(p_deliver_on date, p_tz text, p_now timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when p_deliver_on is null then p_now
    else greatest(p_now, (p_deliver_on + time '08:00') at time zone p_tz)
  end;
$$;

-- Betald order → presentkort + ledger `issue` + kvitto (köparen) och
-- leveransmejl (mottagaren, schemalagt) i utkorgen — allt i EN transaktion.
-- Belopp/valuta/session måste stämma, annars ett synligt fel (webhooken svarar
-- 500). Idempotent: finns kortet returneras det. Koden och de två
-- engångstoken genereras av servern; en kodkollision ger 23505 och servern
-- försöker igen. Token ligger i utkorgens payload bara tills raden skickats
-- (`finalizeSent` nollar payload, D-029).
create function private.gift_card_fulfill(
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount integer,
  p_currency text,
  p_code text,
  p_buyer_token text,
  p_view_token text,
  p_now timestamptz
)
returns table (gift_card_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  v_existing uuid;
  v_id uuid;
  v_tz text;
  v_expires timestamptz;
begin
  select * into o from public.gift_card_orders where id = p_order_id for update;
  if not found
     or p_session_id is null
     or (o.session_id is not null and o.session_id <> p_session_id)
     or o.amount_minor <> p_amount
     or lower(o.currency) <> lower(p_currency)
     or char_length(coalesce(p_buyer_token, '')) < 32
     or char_length(coalesce(p_view_token, '')) < 32 then
    raise exception 'gift_card_fulfill: ordern stämmer inte' using errcode = 'P0001';
  end if;

  select g.id into v_existing from public.gift_cards g where g.order_id = p_order_id;
  if v_existing is not null then
    return query select v_existing, false;
    return;
  end if;

  update public.gift_card_orders
     set status = 'paid', paid_at = p_now,
         session_id = coalesce(session_id, p_session_id),
         payment_intent_id = coalesce(payment_intent_id, p_payment_intent_id),
         buyer_token_hash = extensions.digest(p_buyer_token, 'sha256')
   where id = p_order_id;

  select b.timezone into v_tz from public.businesses b where b.id = o.business_id;

  -- Giltigt t.o.m. samma kalenderdag 24 månader fram, 23:59:59 lokal tid
  -- (skottdag → sista februari).
  v_expires := ((date_trunc('day', p_now at time zone v_tz)
                 + interval '24 months'
                 + interval '1 day' - interval '1 second') at time zone v_tz);

  insert into public.gift_cards
    (business_id, order_id, user_id, code, initial_minor, currency,
     purchased_at, expires_at, view_token_hash)
  values (o.business_id, o.id, o.user_id, p_code, o.amount_minor, o.currency,
          p_now, v_expires, extensions.digest(p_view_token, 'sha256'))
  returning id into v_id;

  insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
  values (o.business_id, v_id, 'issue', o.amount_minor);

  insert into public.message_outbox
    (business_id, booking_id, channel, recipient_kind, template, payload,
     category, dedupe_key)
  values (o.business_id, null, 'email', 'customer', 'presentkortKvitto',
          jsonb_build_object('giftCardId', v_id, 'token', p_buyer_token),
          'utility', 'gift_receipt:' || v_id::text)
  on conflict (dedupe_key) do nothing;

  insert into public.message_outbox
    (business_id, booking_id, channel, recipient_kind, template, payload,
     category, dedupe_key, next_attempt_at)
  values (o.business_id, null, 'email', 'customer', 'presentkortLeverans',
          jsonb_build_object('giftCardId', v_id, 'token', p_view_token),
          'utility', 'gift_delivery:' || v_id::text,
          private.gift_card_delivery_at(o.deliver_on, v_tz, p_now))
  on conflict (dedupe_key) do nothing;

  return query select v_id, true;
end;
$$;

-- Normaliserad kod (versaler, Crockford: O→0, I/L→1, utan mellanslag/streck).
create function private.gift_card_normalize_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when char_length(x) = 14 then
      substr(x, 1, 2) || '-' || substr(x, 3, 4) || '-' || substr(x, 7, 4) || '-' || substr(x, 11, 4)
    else null
  end
  from (
    select translate(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')),
                     'OIL', '011') as x
  ) s;
$$;

-- Reservera saldo för en bokning (online på `/[slug]`), i bokningens
-- transaktion. `amount = least(saldo, att betala)`. Samma utfall för okänd
-- kod, fel företag och utgånget kort (`invalid`, inget orakel). Radlås på
-- kortet: två samtidiga reservationer kan aldrig ta mer än saldot.
create function private.gift_card_hold(
  p_business_id uuid,
  p_code text,
  p_booking_id uuid,
  p_due_minor integer,
  p_now timestamptz
)
returns table (outcome text, gift_card_id uuid, held_minor integer, balance_minor integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  v_start timestamptz;
  v_amount integer;
begin
  select lower(bk.period) into v_start
    from public.bookings bk
   where bk.business_id = p_business_id and bk.id = p_booking_id;
  if v_start is null then
    raise exception 'gift_card_hold: bokningen saknas' using errcode = 'P0002';
  end if;

  select * into g from public.gift_cards
   where business_id = p_business_id
     and code = private.gift_card_normalize_code(p_code)
   for update;
  if not found or g.expires_at <= greatest(p_now, v_start)
     or g.status not in ('active', 'depleted') then
    return query select 'invalid'::text, null::uuid, 0, 0;
    return;
  end if;
  if g.balance_minor <= 0 or coalesce(p_due_minor, 0) <= 0 then
    return query select 'empty'::text, g.id, 0, g.balance_minor;
    return;
  end if;
  v_amount := least(g.balance_minor, p_due_minor);
  insert into public.gift_card_ledger
    (business_id, gift_card_id, kind, delta_minor, booking_id)
  values (p_business_id, g.id, 'hold', -v_amount, p_booking_id);
  update public.gift_cards gc set status = 'depleted'
   where gc.id = g.id and gc.balance_minor = 0;
  return query select 'held'::text, g.id, v_amount, g.balance_minor - v_amount;
end;
$$;

-- Reservationen på en bokning blir en betalning (genomförd/no-show eller
-- bekräftad vars tid passerat). Intäkten bokförs då (moms vid inlösen).
-- Idempotent (en `gift_card`-betalning per kort och bokning).
create function private.gift_card_settle_booking(p_business_id uuid, p_booking_id uuid, p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  h record;
  v_due integer;
  n integer := 0;
begin
  for h in
    select l.gift_card_id, -l.delta_minor as amount
      from public.gift_card_ledger l
     where l.business_id = p_business_id and l.booking_id = p_booking_id
       and l.kind = 'hold'
       and not exists (
         select 1 from public.gift_card_ledger r
          where r.booking_id = l.booking_id and r.kind = 'release')
       and not exists (
         select 1 from public.payments p
          where p.business_id = p_business_id and p.booking_id = p_booking_id
            and p.method = 'gift_card'
            and p.provider_ref = 'gift_card:' || l.gift_card_id::text)
  loop
    select (bk.price_clp - bk.discount_clp - coalesce((
              select sum(p.amount_clp) from public.payments p
               where p.business_id = bk.business_id and p.booking_id = bk.id
                 and p.status = 'approved'), 0))::int
      into v_due
      from public.bookings bk
     where bk.business_id = p_business_id and bk.id = p_booking_id;
    insert into public.payments
      (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at)
    values (p_business_id, p_booking_id,
            case when h.amount >= coalesce(v_due, 0) then 'full' else 'deposit' end::public.payment_kind,
            'gift_card', h.amount, 'approved', 'gift_card:' || h.gift_card_id::text, p_now);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Släpp reservationen (avbokad/nekad/utgången förfrågan, eller tvist): saldot
-- tillbaka; har kortet hunnit gå ut förfaller det direkt (`expire`).
create function private.gift_card_release_booking(p_business_id uuid, p_booking_id uuid, p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  h record;
  g record;
  n integer := 0;
begin
  for h in
    select l.gift_card_id, -l.delta_minor as amount
      from public.gift_card_ledger l
     where l.business_id = p_business_id and l.booking_id = p_booking_id
       and l.kind = 'hold'
       and not exists (
         select 1 from public.gift_card_ledger r
          where r.booking_id = l.booking_id and r.kind = 'release')
       and not exists (
         select 1 from public.payments p
          where p.business_id = p_business_id and p.booking_id = p_booking_id
            and p.method = 'gift_card' and p.status = 'approved')
  loop
    select * into g from public.gift_cards where id = h.gift_card_id for update;
    insert into public.gift_card_ledger
      (business_id, gift_card_id, kind, delta_minor, booking_id)
    values (p_business_id, h.gift_card_id, 'release', h.amount, p_booking_id);
    if g.status in ('refunded') then
      -- Kortet är återbetalt: det släppta beloppet är inte längre kundens.
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (p_business_id, h.gift_card_id, 'refund', -h.amount);
    elsif g.expires_at <= p_now then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (p_business_id, h.gift_card_id, 'expire', -(g.balance_minor + h.amount));
      update public.gift_cards set status = 'expired' where id = h.gift_card_id;
    elsif g.status = 'depleted' then
      update public.gift_cards set status = 'active' where id = h.gift_card_id;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

create function private.gift_cards_on_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'cancelled' then
    perform private.gift_card_release_booking(new.business_id, new.id, now());
  elsif new.status in ('completed', 'no_show') then
    perform private.gift_card_settle_booking(new.business_id, new.id, now());
  end if;
  return new;
end;
$$;

create trigger bookings_gift_card_status
  after update of status on public.bookings
  for each row execute function private.gift_cards_on_booking_status();

-- Presentkortet som betalar en bokning, låst (flytt i samma transaktion får
-- inte hamna efter utgången, `too_far`). Som `voucher_expiry_for_booking`.
create function private.gift_card_expiry_for_booking(p_business_id uuid, p_booking_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz;
begin
  if (select auth.role()) = 'authenticated'
     and not private.is_member(p_business_id, array['owner', 'staff', 'vendor']::public.member_role[]) then
    return null;
  end if;
  select min(g.expires_at) into v_expires
    from public.gift_card_ledger l
    join public.gift_cards g on g.id = l.gift_card_id
   where l.business_id = p_business_id and l.booking_id = p_booking_id
     and l.kind = 'hold'
     and not exists (
       select 1 from public.gift_card_ledger r
        where r.booking_id = l.booking_id and r.kind = 'release');
  if v_expires is not null then
    perform 1 from public.gift_cards g
      join public.gift_card_ledger l on l.gift_card_id = g.id
     where l.business_id = p_business_id and l.booking_id = p_booking_id
       and l.kind = 'hold'
     for update of g;
  end if;
  return v_expires;
end;
$$;

-- Kassans behörighet (samma som att markera betalt i kassan).
create function private.gift_card_till_allowed(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Bara `authenticated` och `service_role` har execute på de anropande
  -- funktionerna; servern (service_role/postgres) har redan kontrollerat.
  select case
    when (select auth.role()) = 'authenticated' then
      private.has_perm(p_business_id, 'can_view_reports')
      or private.has_perm(p_business_id, 'can_manage_all_bookings')
    when (select auth.role()) = 'anon' then false
    else true
  end;
$$;

-- Kassan: slå upp en kod (saldo, utgång, status, mottagarens förnamn — ingen
-- e-post). Bara företagets egna kort; medlemmen är autentiserad, så
-- "utgånget" får visas.
create function private.gift_card_lookup_at_till(p_business_id uuid, p_code text, p_now timestamptz)
returns table (
  gift_card_id uuid,
  code_last4 text,
  initial_minor integer,
  balance_minor integer,
  status text,
  expires_at timestamptz,
  recipient_first_name text,
  theme text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.gift_card_till_allowed(p_business_id) then
    raise exception 'gift_card_lookup_at_till: ingen behörighet' using errcode = '42501';
  end if;
  return query
    select g.id, right(g.code, 4), g.initial_minor, g.balance_minor,
           case when g.status = 'active' and g.expires_at <= p_now then 'expired' else g.status end,
           g.expires_at,
           split_part(coalesce(o.recipient_name, ''), ' ', 1),
           o.theme
      from public.gift_cards g
      join public.gift_card_orders o on o.business_id = g.business_id and o.id = g.order_id
     where g.business_id = p_business_id
       and g.code = private.gift_card_normalize_code(p_code);
end;
$$;

-- Kassan: lös in ett belopp (valfritt kopplat till en bokning). Radlås på
-- kortet; ledger `redeem` + (med bokning) en `payments`-rad `gift_card` i
-- samma transaktion. Kan köras som inloggad medlem (egen behörighetskontroll,
-- annars 42501) eller av servern.
create function private.gift_card_redeem_at_till(
  p_business_id uuid,
  p_code text,
  p_amount_minor integer,
  p_booking_id uuid,
  p_now timestamptz
)
returns table (outcome text, gift_card_id uuid, redeemed_minor integer, balance_minor integer, payment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  v_due integer;
  v_status text;
  v_payment uuid;
begin
  if not private.gift_card_till_allowed(p_business_id) then
    raise exception 'gift_card_redeem_at_till: ingen behörighet' using errcode = '42501';
  end if;
  select * into g from public.gift_cards
   where business_id = p_business_id
     and code = private.gift_card_normalize_code(p_code)
   for update;
  if not found then
    return query select 'invalid'::text, null::uuid, 0, 0, null::uuid;
    return;
  end if;
  if g.status in ('refunding', 'refunded', 'disputed') then
    return query select 'frozen'::text, g.id, 0, g.balance_minor, null::uuid;
    return;
  end if;
  if g.status = 'expired' or g.expires_at <= p_now then
    return query select 'expired'::text, g.id, 0, g.balance_minor, null::uuid;
    return;
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return query select 'invalid_amount'::text, g.id, 0, g.balance_minor, null::uuid;
    return;
  end if;
  if g.balance_minor <= 0 or p_amount_minor > g.balance_minor then
    return query select 'empty'::text, g.id, 0, g.balance_minor, null::uuid;
    return;
  end if;

  if p_booking_id is not null then
    select bk.status::text,
           (bk.price_clp - bk.discount_clp - coalesce((
              select sum(p.amount_clp) from public.payments p
               where p.business_id = bk.business_id and p.booking_id = bk.id
                 and p.status = 'approved'), 0))::int
      into v_status, v_due
      from public.bookings bk
     where bk.business_id = p_business_id and bk.id = p_booking_id
     for update;
    if v_status is null or v_status = 'cancelled' then
      return query select 'invalid_booking'::text, g.id, 0, g.balance_minor, null::uuid;
      return;
    end if;
    if p_amount_minor > greatest(v_due, 0) then
      return query select 'invalid_amount'::text, g.id, 0, g.balance_minor, null::uuid;
      return;
    end if;
    insert into public.payments
      (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at)
    values (p_business_id, p_booking_id,
            case when p_amount_minor >= v_due then 'full' else 'deposit' end::public.payment_kind,
            'gift_card', p_amount_minor, 'approved', 'gift_card:' || g.id::text, p_now)
    returning id into v_payment;
  end if;

  insert into public.gift_card_ledger
    (business_id, gift_card_id, kind, delta_minor, booking_id, payment_id, actor_user_id)
  values (p_business_id, g.id, 'redeem', -p_amount_minor, null, v_payment,
          (select auth.uid()));
  update public.gift_cards gc set status = 'depleted'
   where gc.id = g.id and gc.balance_minor = 0;
  return query select 'redeemed'::text, g.id, p_amount_minor,
                      g.balance_minor - p_amount_minor, v_payment;
end;
$$;

-- Återbetalning/tvist speglas.
--  `withdrawn`: vårt "Ångra köp" (bara från `refunding`): hela saldot ut.
--  `refunded`: Stripe (dashboard), KUMULATIVT (som D-053): det som inte redan
--    dragits dras från saldot, aldrig under 0. Hela beloppet återbetalt →
--    `refunded`.
--  `disputed`: kortet fryses; reservationer på kommande bokningar släpps
--    (bokningen blir obetald, som D-057 S1).
create function private.gift_card_mark_payment(
  p_payment_intent_id text,
  p_kind text,
  p_refunded_total integer,
  p_now timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  v_already integer;
  v_void integer;
  bk record;
begin
  select gc.* into g
    from public.gift_cards gc
    join public.gift_card_orders o on o.business_id = gc.business_id and o.id = gc.order_id
   where o.payment_intent_id = p_payment_intent_id
   for update of gc;
  if not found then
    return 0;
  end if;

  if p_kind = 'withdrawn' then
    if g.status <> 'refunding' then
      return 0;
    end if;
    if g.balance_minor > 0 then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (g.business_id, g.id, 'refund', -g.balance_minor);
    end if;
    update public.gift_cards set status = 'refunded' where id = g.id;
    return 1;
  elsif p_kind = 'refunded' then
    select coalesce(-sum(delta_minor), 0)::int into v_already
      from public.gift_card_ledger
     where gift_card_id = g.id and kind = 'refund';
    v_void := least(g.balance_minor, greatest(coalesce(p_refunded_total, 0) - v_already, 0));
    if v_void > 0 then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (g.business_id, g.id, 'refund', -v_void);
    end if;
    if coalesce(p_refunded_total, 0) >= g.initial_minor and g.status <> 'refunded' then
      update public.gift_cards set status = 'refunded' where id = g.id;
      return 1;
    end if;
    return case when v_void > 0 then 1 else 0 end;
  elsif p_kind = 'disputed' then
    if g.status = 'disputed' then
      return 0;
    end if;
    update public.gift_cards set status = 'disputed' where id = g.id;
    for bk in
      select l.booking_id
        from public.gift_card_ledger l
        join public.bookings b on b.business_id = l.business_id and b.id = l.booking_id
       where l.gift_card_id = g.id and l.kind = 'hold'
         and b.status in ('requested', 'pending_payment', 'confirmed', 'cancel_requested')
         and lower(b.period) > p_now
    loop
      perform private.gift_card_release_booking(g.business_id, bk.booking_id, p_now);
    end loop;
    return 1;
  end if;
  raise exception 'gift_card_mark_payment: okänd typ' using errcode = '22023';
end;
$$;

-- Cron-svepet: utgångna kort (saldot förfaller, ledger `expire`),
-- bekräftade bokningar vars tid passerat (reservationen blir betalning) och
-- persondata 90 dagar efter att kortet slutat gälla (beloppsraderna behålls).
create function private.gift_card_sweep(p_now timestamptz)
returns table (expired integer, settled integer, cleared integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  bk record;
  e integer := 0;
  s integer := 0;
  c integer;
begin
  for g in
    select id, business_id, balance_minor from public.gift_cards
     where status in ('active', 'depleted') and expires_at <= p_now
     for update skip locked
  loop
    if g.balance_minor > 0 then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (g.business_id, g.id, 'expire', -g.balance_minor);
    end if;
    update public.gift_cards set status = 'expired' where id = g.id;
    e := e + 1;
  end loop;

  for bk in
    select distinct l.business_id, l.booking_id
      from public.gift_card_ledger l
      join public.bookings b on b.business_id = l.business_id and b.id = l.booking_id
     where l.kind = 'hold' and b.status = 'confirmed' and upper(b.period) <= p_now
  loop
    s := s + private.gift_card_settle_booking(bk.business_id, bk.booking_id, p_now);
  end loop;

  update public.gift_card_orders o
     set buyer_name = null, buyer_email = null, recipient_name = null,
         recipient_email = null, greeting = null, personal_data_cleared_at = p_now
    from public.gift_cards g
   where g.business_id = o.business_id and g.order_id = o.id
     and o.personal_data_cleared_at is null
     and g.status in ('depleted', 'expired', 'refunded')
     and g.updated_at <= p_now - interval '90 days';
  get diagnostics c = row_count;

  return query select e, s, c;
end;
$$;

-- Köparens egna presentkort (med koden), anropas i köparens session.
create function private.my_gift_cards()
returns table (
  id uuid,
  code text,
  initial_minor integer,
  balance_minor integer,
  status text,
  purchased_at timestamptz,
  expires_at timestamptz,
  delivered_at timestamptz,
  deliver_on date,
  recipient_name text,
  theme text,
  business_name text,
  business_slug text,
  timezone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.code, g.initial_minor, g.balance_minor, g.status, g.purchased_at,
         g.expires_at, g.delivered_at, o.deliver_on, o.recipient_name, o.theme,
         b.name, b.slug, b.timezone
    from public.gift_cards g
    join public.gift_card_orders o on o.business_id = g.business_id and o.id = g.order_id
    join public.businesses b on b.id = g.business_id
   where g.user_id = (select auth.uid())
   order by (g.status = 'active') desc, g.purchased_at desc
   limit 100
$$;

-- Dataportabilitet (D-054): kontots presentkort och köp.
create or replace function private.export_my_account()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', (
      select jsonb_build_object(
        'email', u.email,
        'display_name', a.display_name,
        'marketing_consent_at', a.marketing_consent_at,
        'marketing_consent_version', a.marketing_consent_version,
        'created_at', a.created_at
      )
        from public.customer_accounts a
        join auth.users u on u.id = a.user_id
       where a.user_id = (select auth.uid())
    ),
    'consent_events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', e.kind, 'granted', e.granted,
               'version', e.version, 'at', e.created_at
             ) order by e.created_at)
        from public.account_consent_events e
       where e.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', m.business_name, 'service', m.service_name,
               'staff', m.staff_name, 'starts_at', m.starts_at,
               'ends_at', m.ends_at, 'status', m.status, 'price', m.price_clp
             ) order by m.starts_at)
        from private.my_bookings() m
    ), '[]'::jsonb),
    'favorites', coalesce((
      select jsonb_agg(jsonb_build_object('business', b.name, 'slug', b.slug, 'saved_at', f.created_at)
               order by f.created_at)
        from public.favorites f
        join public.businesses b on b.id = f.business_id
       where f.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', b.name, 'rating', r.rating, 'comment', r.comment,
               'display_name', r.display_name, 'created_at', r.created_at
             ) order by r.created_at)
        from private.my_visible_bookings() v
        join public.reviews r
          on r.business_id = v.business_id and r.booking_id = v.booking_id
        join public.businesses b on b.id = r.business_id
    ), '[]'::jsonb),
    'vouchers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', v.title, 'business', b.name, 'price', v.price_minor,
               'currency', v.currency, 'status', v.status, 'code', v.code,
               'purchased_at', v.purchased_at, 'expires_at', v.expires_at,
               'redeemed_at', v.redeemed_at, 'refunded_at', v.refunded_at
             ) order by v.purchased_at)
        from public.vouchers v
        join public.businesses b on b.id = v.business_id
       where v.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'voucher_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', b.name, 'amount', o.amount_minor,
               'currency', o.currency, 'status', o.status,
               'created_at', o.created_at, 'paid_at', o.paid_at
             ) order by o.created_at)
        from public.voucher_orders o
        join public.businesses b on b.id = o.business_id
       where o.user_id = (select auth.uid())
    ), '[]'::jsonb),
    -- WP-77 (D-058): presentkort och köpen.
    'gift_cards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', b.name, 'code', g.code, 'amount', g.initial_minor,
               'balance', g.balance_minor, 'currency', g.currency,
               'status', g.status, 'purchased_at', g.purchased_at,
               'expires_at', g.expires_at, 'delivered_at', g.delivered_at
             ) order by g.purchased_at)
        from public.gift_cards g
        join public.businesses b on b.id = g.business_id
       where g.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'gift_card_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', b.name, 'amount', o.amount_minor,
               'currency', o.currency, 'status', o.status,
               'buyer_name', o.buyer_name, 'buyer_email', o.buyer_email,
               'recipient_name', o.recipient_name,
               'recipient_email', o.recipient_email, 'greeting', o.greeting,
               'deliver_on', o.deliver_on,
               'created_at', o.created_at, 'paid_at', o.paid_at
             ) order by o.created_at)
        from public.gift_card_orders o
        join public.businesses b on b.id = o.business_id
       where o.user_id = (select auth.uid())
    ), '[]'::jsonb)
  );
$$;

revoke all on function private.gift_card_open_order(uuid, uuid, text, text, text, text, text, text, date, integer, integer, integer, timestamptz) from public;
revoke all on function private.gift_card_release_order(uuid, text) from public;
revoke all on function private.gift_card_delivery_at(date, text, timestamptz) from public;
revoke all on function private.gift_card_fulfill(uuid, text, text, integer, text, text, text, text, timestamptz) from public;
revoke all on function private.gift_card_normalize_code(text) from public;
revoke all on function private.gift_card_hold(uuid, text, uuid, integer, timestamptz) from public;
revoke all on function private.gift_card_settle_booking(uuid, uuid, timestamptz) from public;
revoke all on function private.gift_card_release_booking(uuid, uuid, timestamptz) from public;
revoke all on function private.gift_cards_on_booking_status() from public;
revoke all on function private.gift_card_expiry_for_booking(uuid, uuid) from public;
revoke all on function private.gift_card_till_allowed(uuid) from public;
revoke all on function private.gift_card_lookup_at_till(uuid, text, timestamptz) from public;
revoke all on function private.gift_card_redeem_at_till(uuid, text, integer, uuid, timestamptz) from public;
revoke all on function private.gift_card_mark_payment(text, text, integer, timestamptz) from public;
revoke all on function private.gift_card_sweep(timestamptz) from public;
revoke all on function private.my_gift_cards() from public;

grant execute on function private.gift_card_open_order(uuid, uuid, text, text, text, text, text, text, date, integer, integer, integer, timestamptz) to service_role;
grant execute on function private.gift_card_release_order(uuid, text) to service_role;
grant execute on function private.gift_card_delivery_at(date, text, timestamptz) to service_role;
grant execute on function private.gift_card_fulfill(uuid, text, text, integer, text, text, text, text, timestamptz) to service_role;
grant execute on function private.gift_card_normalize_code(text) to service_role;
grant execute on function private.gift_card_hold(uuid, text, uuid, integer, timestamptz) to service_role;
grant execute on function private.gift_card_settle_booking(uuid, uuid, timestamptz) to service_role;
grant execute on function private.gift_card_release_booking(uuid, uuid, timestamptz) to service_role;
grant execute on function private.gift_card_expiry_for_booking(uuid, uuid) to authenticated, service_role;
grant execute on function private.gift_card_lookup_at_till(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function private.gift_card_redeem_at_till(uuid, text, integer, uuid, timestamptz) to authenticated, service_role;
grant execute on function private.gift_card_mark_payment(text, text, integer, timestamptz) to service_role;
grant execute on function private.gift_card_sweep(timestamptz) to service_role;
grant execute on function private.my_gift_cards() to authenticated;
