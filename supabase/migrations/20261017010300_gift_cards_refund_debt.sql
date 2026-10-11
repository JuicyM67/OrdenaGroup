-- WP-77 (D-058) · Omverifiering av säkerhetsgranskningen (#116).
--  BLOCKER: en delåterbetalning i Stripe medan kortets saldo är reserverat
--      (hold) kunde inte dras (saldo 0) och försvann; när reservationen sedan
--      släpptes fick kunden tillbaka hela beloppet på kortet OCH pengarna.
--      `gift_card_orders.refunded_minor` sparar Stripes kumulativa
--      återbetalning; `release_booking` drar den obetalda skulden från det
--      släppta beloppet (ledger `refund`). Invariant: saldo + återbetalt ≤
--      köpbeloppet.
--  BÖR: triggern släpper bara om den tidigare statusen inte var genomförd.
--  KAN: `dispute_won` används även för `warning_closed` (webhooken).
set search_path = public, extensions;

alter table public.gift_card_orders
  add column refunded_minor integer not null default 0
    check (refunded_minor >= 0 and refunded_minor <= amount_minor);

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
  v_owed integer;
  v_back integer;
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
    -- Återbetalningsskulden (Stripe har redan betalat tillbaka mer än vad
    -- som kunnat dras från saldot): det släppta beloppet dras direkt.
    select greatest(o.refunded_minor - coalesce((
             select -sum(l2.delta_minor) from public.gift_card_ledger l2
              where l2.gift_card_id = h.gift_card_id and l2.kind = 'refund'), 0), 0)::int
      into v_owed
      from public.gift_card_orders o
     where o.business_id = g.business_id and o.id = g.order_id;
    v_back := h.amount;
    if v_owed > 0 then
      insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
      values (p_business_id, h.gift_card_id, 'refund', -least(h.amount, v_owed));
      v_back := h.amount - least(h.amount, v_owed);
    end if;
    if g.status = 'refunded' then
      null;
    elsif g.expires_at <= p_now then
      if g.balance_minor + v_back > 0 then
        insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
        values (p_business_id, h.gift_card_id, 'expire', -(g.balance_minor + v_back));
      end if;
      update public.gift_cards gc set status = 'expired' where gc.id = h.gift_card_id;
    elsif g.status = 'depleted' and v_back > 0 then
      update public.gift_cards gc set status = 'active' where gc.id = h.gift_card_id;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

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
    update public.gift_card_orders o set refunded_minor = g.initial_minor
     where o.business_id = g.business_id and o.id = g.order_id;
    return 1;
  elsif p_kind = 'refunded' then
    -- Skulden sparas: en hold som släpps senare dras mot den (release_booking).
    update public.gift_card_orders o
       set refunded_minor = greatest(o.refunded_minor, least(coalesce(p_refunded_total, 0), o.amount_minor))
     where o.business_id = g.business_id and o.id = g.order_id;
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
  -- Ett genomfört besök som ändras till avbokat släpper aldrig betalningen.
  if new.status = 'cancelled' and old.status not in ('completed', 'no_show') then
    perform private.gift_card_release_booking(new.business_id, new.id, now());
  end if;
  return new;
end;
$$;

revoke all on function private.gift_card_release_booking(uuid, uuid, timestamptz) from public;
revoke all on function private.gift_card_mark_payment(text, text, integer, timestamptz) from public;
revoke all on function private.gift_cards_on_booking_status() from public;
grant execute on function private.gift_card_release_booking(uuid, uuid, timestamptz) to service_role;
grant execute on function private.gift_card_mark_payment(text, text, integer, timestamptz) to service_role;
