-- WP-87 (D-073) · Tarjetas de regalo i Chile: försäljning i salongen.
--
-- Återanvänder SE:s tabeller från WP-77 (D-058, 20261017010100–010300) som
-- finns kvar i Chiles databas (D-062): `gift_card_orders` (köpet),
-- `gift_cards` (kortet, saldot ändras bara via ledgern) och
-- `gift_card_ledger` (append-only, trigger håller `balance_minor`). Inga nya
-- tabeller. Det här tillägget:
--
--  1. CLP: valutan `CLP` och beloppsgränser i hela pesos ($1.000–$1.000.000)
--     bredvid SE:s (som står kvar orörda för gamla rader). Standardvärdet
--     `SEK` ändras inte (SE:s oanvända funktioner förutsätter det); den nya
--     funktionen sätter `CLP` uttryckligen.
--  2. Försäljning i salongen utan onlinebetalning: `gift_card_orders.channel`
--     (`online` = SE:s Stripe-köp, `in_store` = sålt i Caja),
--     `in_store_method` (efectivo/tarjeta/transferencia, samma värden som
--     kassans manuella metoder) och `sold_by_user_id`. Ett `in_store`-köp har
--     inget Stripe-konto, ingen session och ingen avgift.
--  3. `private.gift_card_issue_in_store`: kort + order + ledger `issue` +
--     e-post i utkorgen i EN transaktion, med egen behörighetskontroll
--     (`can_view_reports`, som kassan) och planspärr (Emprende och uppåt).
--  4. `private.gift_card_void_in_store`: anulera en försäljning som gjorts
--     av misstag — bara oanvänt kort, samma dag (som "Deshacer" i Caja).
--
-- Inlösen i kassan använder SE:s befintliga `gift_card_lookup_at_till` /
-- `gift_card_redeem_at_till` (radlås, `payments.method = 'gift_card'`,
-- unik `provider_ref`). Utgång och persondata: befintliga `gift_card_sweep`.
-- Ändrar inte `private.plan_has_feature` (paketen byggs parallellt och
-- skulle annars kunna skriva över varandras version av funktionen); planen
-- kontrolleras här med samma lista som `gift_cards` i src/config/plans.ts.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1 + 2. Kolumner och constraints
-- ---------------------------------------------------------------------------
alter table public.gift_card_orders
  add column channel text not null default 'online'
    check (channel in ('online', 'in_store')),
  add column in_store_method text
    check (in_store_method in ('cash', 'card_terminal', 'transfer')),
  add column sold_by_user_id uuid references auth.users (id) on delete set null;

alter table public.gift_card_orders alter column stripe_account_id drop not null;

alter table public.gift_card_orders drop constraint gift_card_orders_currency_check;
alter table public.gift_card_orders drop constraint gift_card_orders_amount_minor_check;
alter table public.gift_card_orders
  add constraint gift_card_orders_currency_check
    check (currency in ('SEK', 'CLP')),
  add constraint gift_card_orders_amount_minor_check check (
    (currency = 'SEK' and amount_minor between 10000 and 500000 and amount_minor % 100 = 0)
    or (currency = 'CLP' and amount_minor between 1000 and 1000000)
  ),
  add constraint gift_card_orders_channel_shape check (
    (channel = 'online' and stripe_account_id is not null and in_store_method is null)
    or (channel = 'in_store' and currency = 'CLP' and stripe_account_id is null
        and session_id is null and payment_intent_id is null
        and in_store_method is not null and fee_minor = 0)
  );

alter table public.gift_cards drop constraint gift_cards_currency_check;
alter table public.gift_cards drop constraint gift_cards_initial_minor_check;
alter table public.gift_cards
  add constraint gift_cards_currency_check check (currency in ('SEK', 'CLP')),
  add constraint gift_cards_initial_minor_check check (
    (currency = 'SEK' and initial_minor between 10000 and 500000)
    or (currency = 'CLP' and initial_minor between 1000 and 1000000)
  );

create index gift_card_orders_business_paid_idx
  on public.gift_card_orders (business_id, paid_at)
  where channel = 'in_store';

-- Kassans lista (medlemmar med `can_view_reports`): kanal och betalmetod.
-- Fortfarande aldrig e-post, namn, hälsning eller token.
grant select (channel, in_store_method, sold_by_user_id)
  on public.gift_card_orders to authenticated;

-- ---------------------------------------------------------------------------
-- Behörighet att sälja/anulera: samma som kassan (`can_view_reports`; ägaren
-- har alltid). `service_role`/`postgres` är betrodda (servern har redan
-- kontrollerat), `anon` aldrig.
-- ---------------------------------------------------------------------------
create function private.gift_card_sell_allowed(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.role()) = 'authenticated' then
      private.has_perm(p_business_id, 'can_view_reports')
    when (select auth.role()) = 'anon' then false
    else true
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Sälj ett presentkort i salongen (betalt i kassan).
--
-- Servern har validerat formuläret (Zod) och genererat koden och de två
-- engångstoken (`crypto`); här kontrolleras det som bara databasen vet:
-- behörigheten, företaget (aktivt, inte under radering), planen, beloppet och
-- giltigheten. Giltigt t.o.m. samma kalenderdag `p_valid_months` fram,
-- 23:59:59 i företagets tidszon (skottdag → sista februari). En kodkollision
-- ger 23505 och servern försöker igen.
--
-- Utkorgen: kvitto till köparen (om e-post) och kortet till mottagaren (om
-- e-post). Payload bär bara kortets id och länkens token; adresserna läses
-- vid sändningen och payload nollas när raden skickats (D-029).
-- ---------------------------------------------------------------------------
create function private.gift_card_issue_in_store(
  p_business_id uuid,
  p_amount integer,
  p_method text,
  p_buyer_name text,
  p_buyer_email text,
  p_recipient_name text,
  p_recipient_email text,
  p_greeting text,
  p_theme text,
  p_valid_months integer,
  p_code text,
  p_buyer_token text,
  p_view_token text,
  p_now timestamptz
)
returns table (outcome text, gift_card_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  v_actor uuid := (select auth.uid());
  v_order uuid;
  v_card uuid;
  v_expires timestamptz;
begin
  if not private.gift_card_sell_allowed(p_business_id) then
    raise exception 'gift_card_issue_in_store: ingen behörighet' using errcode = '42501';
  end if;
  if char_length(coalesce(p_buyer_token, '')) < 32
     or char_length(coalesce(p_view_token, '')) < 32 then
    raise exception 'gift_card_issue_in_store: token saknas' using errcode = '22023';
  end if;

  select bz.status::text as status, bz.deletion_requested_at, bz.timezone,
         bz.plan::text as plan
    into b
    from public.businesses bz
   where bz.id = p_business_id;
  if not found or b.status <> 'active' or b.deletion_requested_at is not null then
    return query select 'unavailable'::text, null::uuid, null::timestamptz;
    return;
  end if;
  -- Speglar `gift_cards` i src/config/plans.ts (Emprende och uppåt).
  if b.plan not in ('emprende', 'equipo', 'local', 'custom') then
    return query select 'plan_locked'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if p_amount is null or p_amount < 1000 or p_amount > 1000000
     or p_method is null or p_method not in ('cash', 'card_terminal', 'transfer')
     or p_theme is null or p_theme not in ('lime', 'lilac')
     or p_valid_months is null or p_valid_months < 6 or p_valid_months > 36 then
    return query select 'invalid'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.gift_card_orders
    (business_id, user_id, buyer_name, buyer_email, recipient_name,
     recipient_email, greeting, theme, deliver_on, amount_minor, fee_minor,
     currency, stripe_account_id, status, expires_at, paid_at, next_attempt_at,
     buyer_token_hash, channel, in_store_method, sold_by_user_id)
  values
    (p_business_id, null, p_buyer_name, p_buyer_email, p_recipient_name,
     p_recipient_email, p_greeting, p_theme, null, p_amount, 0,
     'CLP', null, 'paid', p_now, p_now, p_now,
     extensions.digest(p_buyer_token, 'sha256'), 'in_store', p_method, v_actor)
  returning id into v_order;

  v_expires := ((date_trunc('day', p_now at time zone b.timezone)
                 + make_interval(months => p_valid_months)
                 + interval '1 day' - interval '1 second') at time zone b.timezone);

  insert into public.gift_cards
    (business_id, order_id, user_id, code, initial_minor, currency,
     purchased_at, expires_at, view_token_hash)
  values (p_business_id, v_order, null, p_code, p_amount, 'CLP',
          p_now, v_expires, extensions.digest(p_view_token, 'sha256'))
  returning id into v_card;

  insert into public.gift_card_ledger
    (business_id, gift_card_id, kind, delta_minor, actor_user_id)
  values (p_business_id, v_card, 'issue', p_amount, v_actor);

  if p_buyer_email is not null then
    insert into public.message_outbox
      (business_id, booking_id, channel, recipient_kind, template, payload,
       category, dedupe_key)
    values (p_business_id, null, 'email', 'customer', 'tarjetaRegaloComprador',
            jsonb_build_object('giftCardId', v_card, 'token', p_buyer_token),
            'utility', 'gift_receipt:' || v_card::text)
    on conflict (dedupe_key) do nothing;
  end if;
  if p_recipient_email is not null then
    insert into public.message_outbox
      (business_id, booking_id, channel, recipient_kind, template, payload,
       category, dedupe_key)
    values (p_business_id, null, 'email', 'customer', 'tarjetaRegaloDestinatario',
            jsonb_build_object('giftCardId', v_card, 'token', p_view_token),
            'utility', 'gift_delivery:' || v_card::text)
    on conflict (dedupe_key) do nothing;
  end if;

  return query select 'issued'::text, v_card, v_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Anulera en försäljning i salongen (fel belopp, fel kund …): bara ett
-- oanvänt kort (`active`, saldo = värdet) som sålts i salongen samma lokala
-- dag. Hela saldot ut (ledger `refund`), status `refunded`, köade mejl
-- stoppas. Pengarna lämnas tillbaka i kassan av salongen själv.
-- ---------------------------------------------------------------------------
create function private.gift_card_void_in_store(
  p_business_id uuid,
  p_gift_card_id uuid,
  p_now timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
begin
  if not private.gift_card_sell_allowed(p_business_id) then
    raise exception 'gift_card_void_in_store: ingen behörighet' using errcode = '42501';
  end if;
  select gc.id, gc.status, gc.balance_minor, gc.initial_minor, gc.purchased_at,
         o.id as order_id, o.channel, b.timezone
    into g
    from public.gift_cards gc
    join public.gift_card_orders o on o.business_id = gc.business_id and o.id = gc.order_id
    join public.businesses b on b.id = gc.business_id
   where gc.business_id = p_business_id and gc.id = p_gift_card_id
   for update of gc;
  if not found then
    return 'not_found';
  end if;
  if g.channel <> 'in_store' or g.status <> 'active'
     or g.balance_minor <> g.initial_minor then
    return 'not_allowed';
  end if;
  if (g.purchased_at at time zone g.timezone)::date
     <> (p_now at time zone g.timezone)::date then
    return 'same_day_required';
  end if;

  insert into public.gift_card_ledger
    (business_id, gift_card_id, kind, delta_minor, actor_user_id)
  values (p_business_id, g.id, 'refund', -g.balance_minor, (select auth.uid()));
  update public.gift_cards gc set status = 'refunded'
   where gc.business_id = p_business_id and gc.id = g.id;
  update public.gift_card_orders o set refunded_minor = o.amount_minor
   where o.business_id = p_business_id and o.id = g.order_id;
  update public.message_outbox m
     set status = 'cancelled', payload = '{}'::jsonb
   where m.business_id = p_business_id
     and m.dedupe_key in ('gift_receipt:' || g.id::text, 'gift_delivery:' || g.id::text)
     and m.status in ('queued', 'failed');
  return 'voided';
end;
$$;

revoke all on function private.gift_card_sell_allowed(uuid) from public;
revoke all on function private.gift_card_issue_in_store(uuid, integer, text, text, text, text, text, text, text, integer, text, text, text, timestamptz) from public;
revoke all on function private.gift_card_void_in_store(uuid, uuid, timestamptz) from public;
grant execute on function private.gift_card_sell_allowed(uuid) to authenticated, service_role;
grant execute on function private.gift_card_issue_in_store(uuid, integer, text, text, text, text, text, text, text, integer, text, text, text, timestamptz) to authenticated, service_role;
grant execute on function private.gift_card_void_in_store(uuid, uuid, timestamptz) to authenticated, service_role;

comment on table public.gift_cards is
  'WP-77 (D-058) + WP-87 (D-073): presentkort / tarjetas de regalo. Saldot ändras bara via gift_card_ledger.';
