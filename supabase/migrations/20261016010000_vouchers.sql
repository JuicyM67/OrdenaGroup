-- WP-69 · Värdebevis via Stripe Connect (bara SE, D-057).
--
-- `voucher_orders`: ett köp (Stripe Checkout, direct charge på företagets
-- konto). En ÖPPEN order räknas redan i `offers.quantity_sold` (raden låses och
-- räknas upp i samma sats) — så kan ett erbjudande aldrig översäljas; går
-- sessionen ut räknas den ned igen.
-- `vouchers`: värdebeviset (en tjänst, hel inlösen, kod `XX-XXXX-XXXX`).
--
-- INV-3: RLS, inga anon-policies. Konsumenten läser sina egna (koden bara via
-- `private.my_vouchers()`), företagets medlemmar med rapportbehörighet läser
-- företagets värdebevis UTAN `code` och `user_id` (kolumn-grants). Alla
-- skrivningar görs av servern (service_role) via funktionerna nedan.
-- INV-4 (D-014): `business_id` + sammansatta FK.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- voucher_orders
-- ---------------------------------------------------------------------------
create table public.voucher_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  offer_id uuid not null,
  -- Ingen kaskad: ett konto med köp raderas bara till konsumentdelen
  -- (`delete_my_account` fångar 23503, D-054) — pengarna finns hos företaget.
  user_id uuid not null references auth.users (id),
  stripe_account_id text not null,
  session_id text unique,
  payment_intent_id text unique,
  amount_minor integer not null check (amount_minor > 0),
  fee_minor integer not null check (fee_minor >= 0),
  currency text not null check (currency in ('SEK', 'CLP')),
  status text not null default 'open'
    check (status in ('open', 'paid', 'expired', 'failed')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, offer_id) references public.offers (business_id, id),
  constraint voucher_orders_fee_le_amount check (fee_minor <= amount_minor),
  constraint voucher_orders_paid_at check ((status = 'paid') = (paid_at is not null))
);

create index voucher_orders_user_idx on public.voucher_orders (user_id, offer_id);
create index voucher_orders_open_idx on public.voucher_orders (next_attempt_at)
  where status = 'open';

alter table public.voucher_orders enable row level security;

create policy "buyer reads own orders" on public.voucher_orders
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select (id, offer_id, amount_minor, currency, status, created_at, paid_at)
  on public.voucher_orders to authenticated;
grant select, insert, update on public.voucher_orders to service_role;

create trigger voucher_orders_set_updated_at
  before update on public.voucher_orders
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- vouchers
-- ---------------------------------------------------------------------------
create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null unique,
  offer_id uuid not null,
  service_id uuid not null,
  user_id uuid not null references auth.users (id),
  -- Prefix per varumärke + 8 tecken Crockford base32 (utan I, L, O, U).
  code text not null unique
    check (code ~ '^[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
  title text not null check (char_length(title) between 1 and 80),
  price_minor integer not null check (price_minor > 0),
  currency text not null check (currency in ('SEK', 'CLP')),
  purchased_at timestamptz not null,
  -- Sista sekunden på giltighetsdagen i företagets tidszon. Besöket (bokningens
  -- start) måste ligga före (ägarens beslut 2026-10-10).
  expires_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'reserved', 'redeemed', 'refunded', 'expired', 'disputed')),
  -- En bokning har högst ett värdebevis (ingen delinlösen).
  booking_id uuid unique,
  redeemed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, order_id) references public.voucher_orders (business_id, id),
  foreign key (business_id, offer_id) references public.offers (business_id, id),
  foreign key (business_id, service_id) references public.services (business_id, id),
  foreign key (business_id, booking_id) references public.bookings (business_id, id),
  constraint vouchers_expires_after_purchase check (expires_at > purchased_at),
  constraint vouchers_reserved_has_booking check (status <> 'reserved' or booking_id is not null),
  constraint vouchers_free_has_no_booking check (status not in ('active', 'expired') or booking_id is null),
  constraint vouchers_redeemed_at check (status <> 'redeemed' or redeemed_at is not null),
  constraint vouchers_refunded_at check (status <> 'refunded' or refunded_at is not null)
);

create index vouchers_business_status_idx on public.vouchers (business_id, status);
create index vouchers_user_idx on public.vouchers (user_id);
create index vouchers_active_expiry_idx on public.vouchers (expires_at)
  where status = 'active';

alter table public.vouchers enable row level security;

create policy "buyer reads own vouchers" on public.vouchers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "reporting members read vouchers" on public.vouchers
  for select to authenticated
  using (private.has_perm(business_id, 'can_view_reports'));

-- Aldrig `code` eller `user_id` via tabellen: koden bara för köparen via
-- `private.my_vouchers()` (gissningsskydd, R3).
grant select (id, business_id, offer_id, service_id, title, price_minor, currency,
              purchased_at, expires_at, status, booking_id, redeemed_at,
              refunded_at, created_at)
  on public.vouchers to authenticated;
grant select, insert, update on public.vouchers to service_role;

create trigger vouchers_set_updated_at
  before update on public.vouchers
  for each row execute function private.set_updated_at();

comment on table public.vouchers is
  'WP-69 (D-057): värdebevis köpta i marknadsplatsen. Skrivs bara av servern.';

-- ---------------------------------------------------------------------------
-- Öppna en order: atomisk kvantitetsvakt. Låser erbjudandet, kontrollerar att
-- det fortfarande säljs (samma filter som den publika listan) och att företaget
-- kan ta betalt, räknar upp `quantity_sold` och skapar ordern — allt i samma
-- transaktion. En redan öppen order för samma köpare och erbjudande med en
-- session som lever återanvänds (dubbelklick).
-- ---------------------------------------------------------------------------
create function private.voucher_open_order(
  p_offer_id uuid,
  p_user_id uuid,
  p_fee_bps integer,
  p_ttl_minutes integer,
  p_now timestamptz
)
returns table (
  outcome text,
  order_id uuid,
  business_id uuid,
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
  o record;
  v_existing record;
  v_fee integer;
  v_id uuid;
begin
  if p_fee_bps is null or p_fee_bps < 0 or p_fee_bps > 5000 then
    raise exception 'voucher_open_order: ogiltig avgift' using errcode = '22023';
  end if;

  select ofr.id, ofr.business_id, ofr.offer_price_minor, ofr.currency, ofr.status,
         ofr.sale_starts_at, ofr.sale_ends_at, ofr.quantity_total, ofr.quantity_sold,
         s.price_clp as service_price, s.active as service_active,
         b.status::text as business_status, b.deletion_requested_at,
         sa.stripe_account_id, coalesce(sa.charges_enabled, false) as charges_enabled
    into o
    from public.offers ofr
    join public.services s on s.business_id = ofr.business_id and s.id = ofr.service_id
    join public.businesses b on b.id = ofr.business_id
    left join public.stripe_accounts sa on sa.business_id = ofr.business_id
   where ofr.id = p_offer_id
   for update of ofr;

  if not found
     or o.status <> 'published'
     or not o.service_active
     or o.offer_price_minor >= o.service_price
     or (o.sale_starts_at is not null and o.sale_starts_at > p_now)
     or (o.sale_ends_at is not null and o.sale_ends_at <= p_now)
     or o.business_status <> 'active'
     or o.deletion_requested_at is not null
     or o.stripe_account_id is null
     or not o.charges_enabled then
    return query select 'unavailable'::text, null::uuid, null::uuid, null::integer,
                        null::integer, null::text, null::text, null::text;
    return;
  end if;

  select vo.id, vo.session_id, vo.amount_minor, vo.fee_minor
    into v_existing
    from public.voucher_orders vo
   where vo.offer_id = p_offer_id and vo.user_id = p_user_id
     and vo.status = 'open' and vo.session_id is not null
     and vo.expires_at > p_now + interval '2 minutes'
   order by vo.created_at desc
   limit 1;
  if found then
    return query select 'reused'::text, v_existing.id, o.business_id,
                        v_existing.amount_minor, v_existing.fee_minor, o.currency,
                        o.stripe_account_id, v_existing.session_id;
    return;
  end if;

  if o.quantity_total is not null and o.quantity_sold >= o.quantity_total then
    return query select 'sold_out'::text, null::uuid, null::uuid, null::integer,
                        null::integer, null::text, null::text, null::text;
    return;
  end if;

  update public.offers set quantity_sold = quantity_sold + 1
   where id = p_offer_id;

  v_fee := least(floor(o.offer_price_minor::numeric * p_fee_bps / 10000)::integer,
                 o.offer_price_minor);
  insert into public.voucher_orders
    (business_id, offer_id, user_id, stripe_account_id, amount_minor, fee_minor,
     currency, expires_at, next_attempt_at)
  values (o.business_id, p_offer_id, p_user_id, o.stripe_account_id,
          o.offer_price_minor, v_fee, o.currency,
          p_now + make_interval(mins => p_ttl_minutes),
          p_now + make_interval(mins => p_ttl_minutes + 15))
  returning id into v_id;

  return query select 'created'::text, v_id, o.business_id, o.offer_price_minor,
                      v_fee, o.currency, o.stripe_account_id, null::text;
end;
$$;

-- Stäng en öppen order (sessionen gick ut / kunden avbröt / Checkout gick inte
-- att skapa) och lämna tillbaka exemplaret. Idempotent.
create function private.voucher_release_order(p_order_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer uuid;
begin
  if p_status not in ('expired', 'failed') then
    raise exception 'voucher_release_order: ogiltig status' using errcode = '22023';
  end if;
  update public.voucher_orders
     set status = p_status
   where id = p_order_id and status = 'open'
  returning offer_id into v_offer;
  if v_offer is null then
    return false;
  end if;
  update public.offers set quantity_sold = greatest(quantity_sold - 1, 0)
   where id = v_offer;
  return true;
end;
$$;

-- Betald order → värdebevis + kvittomejl (outbox, regel 4) i EN transaktion.
-- Beloppet/valutan/sessionen från Stripes API måste stämma med ordern, annars
-- ett synligt fel (webhooken svarar 500). Idempotent: finns värdebeviset redan
-- returneras det. Koden genereras av servern (`p_code`); en kollision ger 23505
-- och servern försöker igen med en ny kod.
create function private.voucher_fulfill(
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount integer,
  p_currency text,
  p_code text,
  p_now timestamptz
)
returns table (voucher_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  v_existing uuid;
  v_id uuid;
  v_tz text;
  v_months integer;
  v_service uuid;
  v_title text;
  v_expires timestamptz;
begin
  select * into o from public.voucher_orders where id = p_order_id for update;
  if not found
     or (o.session_id is not null and o.session_id <> p_session_id)
     or o.amount_minor <> p_amount
     or lower(o.currency) <> lower(p_currency) then
    raise exception 'voucher_fulfill: ordern stämmer inte' using errcode = 'P0001';
  end if;

  select v.id into v_existing from public.vouchers v where v.order_id = p_order_id;
  if v_existing is not null then
    return query select v_existing, false;
    return;
  end if;

  -- Betald efter att vi redan släppt exemplaret (sen webhook): räkna upp igen,
  -- men aldrig över taket (pengarna är redan dragna — kunden får beviset).
  if o.status in ('expired', 'failed') then
    update public.offers
       set quantity_sold = least(quantity_sold + 1, coalesce(quantity_total, quantity_sold + 1))
     where id = o.offer_id;
  end if;

  update public.voucher_orders
     set status = 'paid', paid_at = p_now,
         session_id = coalesce(session_id, p_session_id),
         payment_intent_id = coalesce(payment_intent_id, p_payment_intent_id)
   where id = p_order_id;

  select b.timezone, ofr.valid_months, ofr.service_id, ofr.title
    into v_tz, v_months, v_service, v_title
    from public.offers ofr
    join public.businesses b on b.id = ofr.business_id
   where ofr.id = o.offer_id;

  -- Giltig t.o.m. samma kalenderdag `valid_months` fram, 23:59:59 lokal tid.
  v_expires := ((date_trunc('day', p_now at time zone v_tz)
                 + make_interval(months => v_months)
                 + interval '1 day' - interval '1 second') at time zone v_tz);

  insert into public.vouchers
    (business_id, order_id, offer_id, service_id, user_id, code, title,
     price_minor, currency, purchased_at, expires_at)
  values (o.business_id, o.id, o.offer_id, v_service, o.user_id, p_code, v_title,
          o.amount_minor, o.currency, p_now, v_expires)
  returning id into v_id;

  insert into public.message_outbox
    (business_id, booking_id, channel, recipient_kind, template, payload,
     category, dedupe_key)
  values (o.business_id, null, 'email', 'customer', 'valeComprado',
          jsonb_build_object('voucherId', v_id), 'utility',
          'voucher_bought:' || v_id::text)
  on conflict (dedupe_key) do nothing;

  return query select v_id, true;
end;
$$;

-- Full återbetalning (vår "Ångra köp" eller i Stripe-dashboarden) eller tvist:
-- speglas som status. Ett redan inlöst värdebevis ändras inte vid
-- återbetalning (det är förbrukat); en tvist märks alltid.
create function private.voucher_mark_payment(
  p_payment_intent_id text,
  p_kind text,
  p_now timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_kind = 'refunded' then
    update public.vouchers v
       set status = 'refunded', refunded_at = p_now
      from public.voucher_orders o
     where o.id = v.order_id and o.payment_intent_id = p_payment_intent_id
       and v.status in ('active', 'reserved', 'expired', 'disputed');
  elsif p_kind = 'disputed' then
    update public.vouchers v
       set status = 'disputed'
      from public.voucher_orders o
     where o.id = v.order_id and o.payment_intent_id = p_payment_intent_id
       and v.status in ('active', 'reserved', 'expired', 'redeemed');
  else
    raise exception 'voucher_mark_payment: okänd typ' using errcode = '22023';
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Bokningens status styr värdebeviset: avbokad/nekad/utgången förfrågan →
-- tillbaka till `active` (eller `expired` om giltigheten passerats);
-- genomförd eller no-show → `redeemed`.
create function private.vouchers_on_booking_status()
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
    update public.vouchers
       set status = case when expires_at > now() then 'active' else 'expired' end,
           booking_id = null
     where business_id = new.business_id and booking_id = new.id
       and status = 'reserved';
  elsif new.status in ('completed', 'no_show') then
    update public.vouchers
       set status = 'redeemed', redeemed_at = now()
     where business_id = new.business_id and booking_id = new.id
       and status = 'reserved';
  end if;
  return new;
end;
$$;

create trigger bookings_voucher_status
  after update of status on public.bookings
  for each row execute function private.vouchers_on_booking_status();

-- Cron-svepet: utgångna värdebevis och genomförda besök (bekräftad bokning vars
-- tid har passerat, D-045:s "genomförd") som ingen markerat.
create function private.voucher_sweep(p_now timestamptz)
returns table (expired integer, redeemed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  e integer;
  r integer;
begin
  update public.vouchers set status = 'expired'
   where status = 'active' and expires_at <= p_now;
  get diagnostics e = row_count;
  update public.vouchers v set status = 'redeemed', redeemed_at = p_now
    from public.bookings bk
   where v.status = 'reserved'
     and bk.business_id = v.business_id and bk.id = v.booking_id
     and bk.status = 'confirmed' and upper(bk.period) <= p_now;
  get diagnostics r = row_count;
  return query select e, r;
end;
$$;

-- Köparens egna värdebevis (med koden), anropas i köparens session.
create function private.my_vouchers()
returns table (
  id uuid,
  code text,
  title text,
  price_minor integer,
  currency text,
  status text,
  purchased_at timestamptz,
  expires_at timestamptz,
  business_name text,
  business_slug text,
  offer_slug text,
  image_url text,
  booking_start timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.code, v.title, v.price_minor, v.currency, v.status,
         v.purchased_at, v.expires_at, b.name, b.slug, ofr.slug, ofr.image_url,
         lower(bk.period)
    from public.vouchers v
    join public.businesses b on b.id = v.business_id
    join public.offers ofr on ofr.business_id = v.business_id and ofr.id = v.offer_id
    left join public.bookings bk on bk.business_id = v.business_id and bk.id = v.booking_id
   where v.user_id = (select auth.uid())
   order by (v.status in ('active', 'reserved')) desc, v.purchased_at desc
   limit 100
$$;

-- Mottagaradressen för kvittomejlet (bara servern; ingen adress i utkorgen).
create function private.voucher_buyer_email(p_voucher_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
    from public.vouchers v
    join auth.users u on u.id = v.user_id
   where v.id = p_voucher_id
$$;

revoke all on function private.voucher_open_order(uuid, uuid, integer, integer, timestamptz) from public;
revoke all on function private.voucher_release_order(uuid, text) from public;
revoke all on function private.voucher_fulfill(uuid, text, text, integer, text, text, timestamptz) from public;
revoke all on function private.voucher_mark_payment(text, text, timestamptz) from public;
revoke all on function private.vouchers_on_booking_status() from public;
revoke all on function private.voucher_sweep(timestamptz) from public;
revoke all on function private.my_vouchers() from public;
revoke all on function private.voucher_buyer_email(uuid) from public;

grant execute on function private.voucher_open_order(uuid, uuid, integer, integer, timestamptz) to service_role;
grant execute on function private.voucher_release_order(uuid, text) to service_role;
grant execute on function private.voucher_fulfill(uuid, text, text, integer, text, text, timestamptz) to service_role;
grant execute on function private.voucher_mark_payment(text, text, timestamptz) to service_role;
grant execute on function private.voucher_sweep(timestamptz) to service_role;
grant execute on function private.voucher_buyer_email(uuid) to service_role;
grant execute on function private.my_vouchers() to authenticated;
