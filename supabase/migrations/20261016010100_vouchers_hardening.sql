-- WP-69 (D-057) · Säkerhetsgranskning av PR #112.
--  B1: "Ångra köp" och inlösen kan inte längre ske samtidigt. Ångra-flödet
--      flyttar först värdebeviset `active` → `refunding` (villkorad update,
--      samma radlås som bokningen tar), sedan återbetalar Stripe, sedan
--      `refunded`. En bokning kräver `active` och nekas därför.
--      `voucher_mark_payment('withdrawn')` accepterar bara `refunding`.
--  S1: återbetalning/tvist från Stripe (dashboard/chargeback) på ett
--      `reserved` värdebevis nollar bokningens `discount_clp` — bokningen
--      står kvar som obetald i kassan.
--  S2: `private.voucher_expiry_for_booking` låser värdebeviset vid flytt.
--  S4: `export_my_account()` tar med värdebevis och köp.
--  K4: `voucher_fulfill` kräver en session.
set search_path = public, extensions;

alter table public.vouchers drop constraint vouchers_status_check;
alter table public.vouchers add constraint vouchers_status_check check (
  status in ('active', 'refunding', 'reserved', 'redeemed', 'refunded', 'expired', 'disputed')
);
alter table public.vouchers drop constraint vouchers_free_has_no_booking;
alter table public.vouchers add constraint vouchers_free_has_no_booking check (
  status not in ('active', 'refunding', 'expired') or booking_id is null
);

drop function private.voucher_mark_payment(text, text, timestamptz);

-- `withdrawn`: vårt eget "Ångra köp" (bara från `refunding`).
-- `refunded` / `disputed`: Stripes händelser (dashboard, chargeback) — även
-- ett `reserved` värdebevis; då nollas bokningens rabatt (S1).
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
  v_bookings uuid[];
begin
  if p_kind = 'withdrawn' then
    update public.vouchers v
       set status = 'refunded', refunded_at = p_now
      from public.voucher_orders o
     where o.id = v.order_id and o.payment_intent_id = p_payment_intent_id
       and v.status = 'refunding';
    get diagnostics n = row_count;
    return n;
  end if;
  if p_kind not in ('refunded', 'disputed') then
    raise exception 'voucher_mark_payment: okänd typ' using errcode = '22023';
  end if;

  select coalesce(array_agg(v.booking_id), array[]::uuid[]) into v_bookings
    from public.vouchers v
    join public.voucher_orders o on o.id = v.order_id
   where o.payment_intent_id = p_payment_intent_id
     and v.status = 'reserved' and v.booking_id is not null;

  if p_kind = 'refunded' then
    update public.vouchers v
       set status = 'refunded', refunded_at = p_now
      from public.voucher_orders o
     where o.id = v.order_id and o.payment_intent_id = p_payment_intent_id
       and v.status in ('active', 'refunding', 'reserved', 'expired', 'disputed');
  else
    update public.vouchers v
       set status = 'disputed'
      from public.voucher_orders o
     where o.id = v.order_id and o.payment_intent_id = p_payment_intent_id
       and v.status in ('active', 'refunding', 'reserved', 'expired', 'redeemed');
  end if;
  get diagnostics n = row_count;

  -- S1: pengarna är tillbaka hos kunden — bokningen har inte längre betalats.
  update public.bookings set discount_clp = 0
   where id = any (v_bookings);
  return n;
end;
$$;

-- S2: värdebeviset som betalar en bokning, låst (flytt i samma transaktion).
-- Anropas av motorn både som service_role och som inloggad medlem; en medlem
-- får bara fråga om sitt eget företags bokningar.
create function private.voucher_expiry_for_booking(p_business_id uuid, p_booking_id uuid)
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
  select expires_at into v_expires
    from public.vouchers
   where business_id = p_business_id and booking_id = p_booking_id
     and status = 'reserved'
   for update;
  return v_expires;
end;
$$;

create or replace function private.voucher_fulfill(
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
     or p_session_id is null
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
    -- WP-69 (D-057, säkerhetsgranskning S4): köpta värdebevis och köpen.
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
    ), '[]'::jsonb)
  );
$$;

revoke all on function private.voucher_mark_payment(text, text, timestamptz) from public;
grant execute on function private.voucher_mark_payment(text, text, timestamptz) to service_role;
revoke all on function private.voucher_expiry_for_booking(uuid, uuid) from public;
grant execute on function private.voucher_expiry_for_booking(uuid, uuid) to authenticated, service_role;

-- K2: företagets tidszon med i köparens lista (14-dagarsgränsen och
-- giltighetsdatumet räknas i företagets tidszon, inte installationens).
drop function private.my_vouchers();
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
  booking_start timestamptz,
  timezone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.code, v.title, v.price_minor, v.currency, v.status,
         v.purchased_at, v.expires_at, b.name, b.slug, ofr.slug, ofr.image_url,
         lower(bk.period), b.timezone
    from public.vouchers v
    join public.businesses b on b.id = v.business_id
    join public.offers ofr on ofr.business_id = v.business_id and ofr.id = v.offer_id
    left join public.bookings bk on bk.business_id = v.business_id and bk.id = v.booking_id
   where v.user_id = (select auth.uid())
   order by (v.status in ('active', 'reserved')) desc, v.purchased_at desc
   limit 100
$$;
revoke all on function private.my_vouchers() from public;
grant execute on function private.my_vouchers() to authenticated;
