-- WP-77 (D-058) · Säkerhetsgranskning av PR #116.
--  B1: `payments_method_provider_ref_uidx` är unik på (method, provider_ref).
--      `provider_ref` blir nu unik per betalning: reservationen
--      `gift_card:<kort>:<bokning>`, kassan `gift_card:<kort>:<betalningens id>`.
--      Ett kort kan alltså betala flera besök.
--  B2: reservationen syns som BETALD direkt: `gift_card_hold` skapar
--      `payments`-raden (`approved`, `full`/`deposit`) i bokningens transaktion,
--      så varje "att betala"-beräkning (kassan, agendan, markera betald,
--      `redeem_at_till`) redan drar av den — ingen dubbel inlösen i kassan och
--      ingen dubbeldebitering. Släpps reservationen (avbokning/tvist) blir raden
--      `refunded`. Ingen separat "settle" längre (betalningen finns redan).
--  BÖR 1: släppet låser bokningsraden och kontrollerar statusen igen.
--  BÖR 2: persondata rensas även på utgångna/misslyckade ordrar (30 dagar) och
--      på spärrade kort (90 dagar, som övriga).
--  BÖR 3: `user_id` → `on delete set null` (kontoradering fastnar inte; kortet
--      gäller fortfarande med koden/länken).
--  BÖR 4: servern får bara uppdatera status/leverans på korten — saldot ändras
--      bara via ledgern (triggern är security definer).
--  KAN: `dispute_won` häver spärren när tvisten vunnits.
set search_path = public, extensions;

-- BÖR 3 ---------------------------------------------------------------------
alter table public.gift_card_orders drop constraint gift_card_orders_user_id_fkey;
alter table public.gift_card_orders add constraint gift_card_orders_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;
alter table public.gift_cards drop constraint gift_cards_user_id_fkey;
alter table public.gift_cards add constraint gift_cards_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- BÖR 4 ---------------------------------------------------------------------
revoke update on public.gift_cards from service_role;
grant update (status, delivered_at, updated_at) on public.gift_cards to service_role;

create or replace function private.gift_card_ledger_apply()
returns trigger
language plpgsql
security definer
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

-- B2: reservationen är en godkänd betalning från början --------------------
create or replace function private.gift_card_hold(
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
  v_open integer;
begin
  select lower(bk.period),
         (bk.price_clp - bk.discount_clp - coalesce((
            select sum(p.amount_clp) from public.payments p
             where p.business_id = bk.business_id and p.booking_id = bk.id
               and p.status = 'approved'), 0))::int
    into v_start, v_open
    from public.bookings bk
   where bk.business_id = p_business_id and bk.id = p_booking_id
   for update;
  if v_start is null then
    raise exception 'gift_card_hold: bokningen saknas' using errcode = 'P0002';
  end if;

  select * into g from public.gift_cards gc
   where gc.business_id = p_business_id
     and gc.code = private.gift_card_normalize_code(p_code)
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
  insert into public.payments
    (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at)
  values (p_business_id, p_booking_id,
          case when v_amount >= v_open then 'full' else 'deposit' end::public.payment_kind,
          'gift_card', v_amount, 'approved',
          'gift_card:' || g.id::text || ':' || p_booking_id::text, p_now);
  update public.gift_cards gc set status = 'depleted'
   where gc.id = g.id and gc.balance_minor = 0;
  return query select 'held'::text, g.id, v_amount, g.balance_minor - v_amount;
end;
$$;

-- Betalningen finns redan sedan reservationen: inget att göra (behålls för
-- anropare/tester; returnerar alltid 0).
create or replace function private.gift_card_settle_booking(p_business_id uuid, p_booking_id uuid, p_now timestamptz)
returns integer
language sql
security definer
set search_path = ''
as $$
  select 0;
$$;

-- B2 + BÖR 1: släppet låser bokningen och kontrollerar statusen igen; den
-- reserverade betalningen blir `refunded`.
create or replace function private.gift_card_release_booking(p_business_id uuid, p_booking_id uuid, p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  h record;
  g record;
  v_status text;
  n integer := 0;
begin
  select bk.status::text into v_status
    from public.bookings bk
   where bk.business_id = p_business_id and bk.id = p_booking_id
   for update;
  -- Genomfört besök: betalningen står (ingenting släpps).
  if v_status is null or v_status in ('completed', 'no_show') then
    return 0;
  end if;
  for h in
    select l.gift_card_id, -l.delta_minor as amount
      from public.gift_card_ledger l
     where l.business_id = p_business_id and l.booking_id = p_booking_id
       and l.kind = 'hold'
       and not exists (
         select 1 from public.gift_card_ledger r
          where r.booking_id = l.booking_id and r.kind = 'release')
  loop
    select * into g from public.gift_cards gc where gc.id = h.gift_card_id for update;
    update public.payments
       set status = 'refunded'
     where business_id = p_business_id and booking_id = p_booking_id
       and method = 'gift_card' and status = 'approved'
       and provider_ref = 'gift_card:' || h.gift_card_id::text || ':' || p_booking_id::text;
    insert into public.gift_card_ledger
      (business_id, gift_card_id, kind, delta_minor, booking_id)
    values (p_business_id, h.gift_card_id, 'release', h.amount, p_booking_id);
    if g.status = 'refunded' then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (p_business_id, h.gift_card_id, 'refund', -h.amount);
    elsif g.expires_at <= p_now then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (p_business_id, h.gift_card_id, 'expire', -(g.balance_minor + h.amount));
      update public.gift_cards gc set status = 'expired' where gc.id = h.gift_card_id;
    elsif g.status = 'depleted' then
      update public.gift_cards gc set status = 'active' where gc.id = h.gift_card_id;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function private.gift_cards_on_booking_status()
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
  end if;
  return new;
end;
$$;

-- B1: kassans betalning får en egen unik `provider_ref`.
create or replace function private.gift_card_redeem_at_till(
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
  select * into g from public.gift_cards gc
   where gc.business_id = p_business_id
     and gc.code = private.gift_card_normalize_code(p_code)
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
    -- Godkända betalningar (även en presentkortsreservation, B2) är avdragna.
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
    v_payment := gen_random_uuid();
    insert into public.payments
      (id, business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at)
    values (v_payment, p_business_id, p_booking_id,
            case when p_amount_minor >= v_due then 'full' else 'deposit' end::public.payment_kind,
            'gift_card', p_amount_minor, 'approved',
            'gift_card:' || g.id::text || ':' || v_payment::text, p_now);
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

-- KAN: `dispute_won` häver spärren (tvisten vunnen, pengarna kvar hos salongen).
create or replace function private.gift_card_mark_payment(
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
    update public.gift_cards gc set status = 'refunded' where gc.id = g.id;
    return 1;
  elsif p_kind = 'refunded' then
    select coalesce(-sum(l.delta_minor), 0)::int into v_already
      from public.gift_card_ledger l
     where l.gift_card_id = g.id and l.kind = 'refund';
    v_void := least(g.balance_minor, greatest(coalesce(p_refunded_total, 0) - v_already, 0));
    if v_void > 0 then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (g.business_id, g.id, 'refund', -v_void);
    end if;
    if coalesce(p_refunded_total, 0) >= g.initial_minor and g.status <> 'refunded' then
      update public.gift_cards gc set status = 'refunded' where gc.id = g.id;
      return 1;
    end if;
    return case when v_void > 0 then 1 else 0 end;
  elsif p_kind = 'disputed' then
    if g.status = 'disputed' then
      return 0;
    end if;
    update public.gift_cards gc set status = 'disputed' where gc.id = g.id;
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
  elsif p_kind = 'dispute_won' then
    if g.status <> 'disputed' then
      return 0;
    end if;
    update public.gift_cards gc
       set status = case when gc.expires_at <= p_now then 'expired'
                         when gc.balance_minor = 0 then 'depleted'
                         else 'active' end
     where gc.id = g.id;
    return 1;
  end if;
  raise exception 'gift_card_mark_payment: okänd typ' using errcode = '22023';
end;
$$;

-- BÖR 2: persondata även på utgångna/misslyckade ordrar och spärrade kort.
create or replace function private.gift_card_sweep(p_now timestamptz)
returns table (expired integer, settled integer, cleared integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  e integer := 0;
  c integer;
  c2 integer;
begin
  for g in
    select gc.id, gc.business_id, gc.balance_minor from public.gift_cards gc
     where gc.status in ('active', 'depleted') and gc.expires_at <= p_now
     for update skip locked
  loop
    if g.balance_minor > 0 then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (g.business_id, g.id, 'expire', -g.balance_minor);
    end if;
    update public.gift_cards gc set status = 'expired' where gc.id = g.id;
    e := e + 1;
  end loop;

  update public.gift_card_orders o
     set buyer_name = null, buyer_email = null, recipient_name = null,
         recipient_email = null, greeting = null, personal_data_cleared_at = p_now
    from public.gift_cards gc
   where gc.business_id = o.business_id and gc.order_id = o.id
     and o.personal_data_cleared_at is null
     and gc.status in ('depleted', 'expired', 'refunded', 'disputed')
     and gc.updated_at <= p_now - interval '90 days';
  get diagnostics c = row_count;

  -- Ordrar som aldrig blev betalda (inget kort): 30 dagar.
  update public.gift_card_orders o
     set buyer_name = null, buyer_email = null, recipient_name = null,
         recipient_email = null, greeting = null, personal_data_cleared_at = p_now
   where o.personal_data_cleared_at is null
     and o.status in ('expired', 'failed')
     and o.updated_at <= p_now - interval '30 days';
  get diagnostics c2 = row_count;

  return query select e, 0, c + c2;
end;
$$;

revoke all on function private.gift_card_hold(uuid, text, uuid, integer, timestamptz) from public;
revoke all on function private.gift_card_settle_booking(uuid, uuid, timestamptz) from public;
revoke all on function private.gift_card_release_booking(uuid, uuid, timestamptz) from public;
revoke all on function private.gift_cards_on_booking_status() from public;
revoke all on function private.gift_card_redeem_at_till(uuid, text, integer, uuid, timestamptz) from public;
revoke all on function private.gift_card_mark_payment(text, text, integer, timestamptz) from public;
revoke all on function private.gift_card_sweep(timestamptz) from public;
grant execute on function private.gift_card_hold(uuid, text, uuid, integer, timestamptz) to service_role;
grant execute on function private.gift_card_settle_booking(uuid, uuid, timestamptz) to service_role;
grant execute on function private.gift_card_release_booking(uuid, uuid, timestamptz) to service_role;
grant execute on function private.gift_card_redeem_at_till(uuid, text, integer, uuid, timestamptz) to authenticated, service_role;
grant execute on function private.gift_card_mark_payment(text, text, integer, timestamptz) to service_role;
grant execute on function private.gift_card_sweep(timestamptz) to service_role;
