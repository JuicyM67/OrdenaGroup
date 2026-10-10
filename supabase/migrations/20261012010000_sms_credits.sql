-- WP-76 · SMS-krediter (SE) · D-053 · F7/F19.
-- Alla planer kan köpa sms-krediter (Stripe Checkout på plattformens konto).
-- Krediterna förbrukas när planens månadskvot (D-048) är slut, FIFO per köp,
-- 12 månader per köp. 1 kredit = 1 sms-segment (ägarens beslut 2026-10-10),
-- och kvoten räknas också i segment från och med WP-76.
--
-- Delar:
--  1. message_outbox.sms_segments: antal segment för en sms-rad (sätts av
--     workern vid reservationen). Kvoten summerar segmenten.
--  2. sms_credit_purchases: ett köp = en lot. Ägaren LÄSER, servern skriver.
--  3. sms_credit_ledger: append-only historik + idempotens för förbrukning.
--  4. private.sms_credit_*: grant/consume/release/refund/balance (service_role).
--  5. Trigger: en sms-rad som slutar dead/cancelled lämnar tillbaka sina krediter.
-- Ingen persondata om kunder: bara företag, belopp och Stripe-id:n.
set search_path = public, extensions;

-- 1. Segment per sms-rad -------------------------------------------------------
alter table public.message_outbox
  add column sms_segments integer,
  add constraint message_outbox_sms_segments_check
    check (sms_segments is null or sms_segments between 1 and 50);

comment on column public.message_outbox.sms_segments is
  'WP-76/D-053: antal sms-segment (GSM-7 160/153, UCS-2 70/67) som raden reserverade.';

-- 2. sms_credit_purchases ----------------------------------------------------------
-- status: pending (session skapad) -> paid -> partially_refunded | refunded ;
-- pending -> expired_checkout. Belopp i öre (minsta enheten, D-025/D-044).
create table public.sms_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  package_size integer not null,
  amount_net integer not null,
  amount_vat integer not null,
  amount_total integer not null,
  currency text not null default 'sek',
  status text not null default 'pending',
  credits_total integer not null,
  credits_remaining integer not null default 0,
  credits_refunded integer not null default 0,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  -- Speglar src/config/sms-credits.ts (enhetstest kontrollerar listan).
  constraint sms_credit_purchases_package_check check (package_size in (100, 250, 500, 1000)),
  constraint sms_credit_purchases_amounts_check check (
    amount_net > 0 and amount_vat >= 0 and amount_total = amount_net + amount_vat
  ),
  constraint sms_credit_purchases_currency_check check (currency = 'sek'),
  constraint sms_credit_purchases_status_check check (
    status in ('pending', 'paid', 'expired_checkout', 'refunded', 'partially_refunded')
  ),
  constraint sms_credit_purchases_credits_check check (
    credits_total > 0
    and credits_remaining between 0 and credits_total
    and credits_refunded between 0 and credits_total
  ),
  -- Betald (eller återbetald) ⇔ paid_at och expires_at satta.
  constraint sms_credit_purchases_paid_check check (
    (status in ('pending', 'expired_checkout')) = (paid_at is null)
    and (paid_at is null) = (expires_at is null)
  )
);
create index sms_credit_purchases_lots_idx on public.sms_credit_purchases (business_id, expires_at)
  where credits_remaining > 0;
create index sms_credit_purchases_history_idx on public.sms_credit_purchases (business_id, created_at desc);
create trigger set_updated_at
  before update on public.sms_credit_purchases
  for each row execute function private.set_updated_at();

alter table public.sms_credit_purchases enable row level security;
create policy "owners select" on public.sms_credit_purchases
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select on public.sms_credit_purchases to authenticated;
-- Ingen delete (köphistorik); raderas bara med företaget (cascade).
grant select, insert, update on public.sms_credit_purchases to service_role;

-- 3. sms_credit_ledger -------------------------------------------------------------
-- delta: + för grant/release, − för consume/refund/expire. Invariant (pgTAP 118):
-- credits_remaining = sum(delta) per köp. `outbox_id` har ingen FK: raden ska
-- finnas kvar som historik även om utkorgsraden rensas.
create table public.sms_credit_ledger (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  purchase_id uuid not null,
  outbox_id uuid,
  kind text not null,
  delta integer not null,
  created_at timestamptz not null default now(),
  foreign key (business_id, purchase_id)
    references public.sms_credit_purchases (business_id, id) on delete cascade,
  constraint sms_credit_ledger_kind_check check (
    kind in ('grant', 'consume', 'release', 'refund', 'expire')
  ),
  constraint sms_credit_ledger_outbox_check check (
    (kind in ('consume', 'release')) = (outbox_id is not null)
  )
);
create index sms_credit_ledger_business_idx on public.sms_credit_ledger (business_id, created_at desc);
create index sms_credit_ledger_outbox_idx on public.sms_credit_ledger (outbox_id)
  where outbox_id is not null;
create unique index sms_credit_ledger_grant_uq on public.sms_credit_ledger (purchase_id)
  where kind = 'grant';
create unique index sms_credit_ledger_consume_uq on public.sms_credit_ledger (outbox_id, purchase_id)
  where kind = 'consume';
create unique index sms_credit_ledger_release_uq on public.sms_credit_ledger (outbox_id, purchase_id)
  where kind = 'release';

alter table public.sms_credit_ledger enable row level security;
create policy "owners select" on public.sms_credit_ledger
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select on public.sms_credit_ledger to authenticated;
grant select, insert on public.sms_credit_ledger to service_role;

-- 4. Funktioner (service_role) ------------------------------------------------------

-- Krediterar ett köp efter verifierad betalning. Idempotent: andra anropet → false.
create function private.sms_credit_grant(
  p_purchase uuid,
  p_payment_intent text,
  p_paid_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.sms_credit_purchases;
begin
  update public.sms_credit_purchases
     set status = 'paid',
         paid_at = p_paid_at,
         expires_at = p_paid_at + interval '12 months',
         credits_remaining = credits_total,
         stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id)
   where id = p_purchase and status in ('pending', 'expired_checkout')
  returning * into v;
  if not found then
    return false;
  end if;
  insert into public.sms_credit_ledger (business_id, purchase_id, kind, delta)
  values (v.business_id, v.id, 'grant', v.credits_total);
  return true;
end;
$$;

-- Tar `p_count` krediter för utkorgsraden `p_outbox`, äldsta giltiga köp först
-- (FIFO på expires_at). Anroparen håller pg_advisory_xact_lock('sms:'||business).
-- Redan förbrukat för raden (retry) → samma antal, ingen ny kredit. Räcker
-- saldot inte → 0 och ingenting ändras (raden tar aldrig halva sitt behov).
create function private.sms_credit_consume(
  p_business uuid,
  p_outbox uuid,
  p_count integer
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing integer;
  v_avail integer;
  v_left integer := p_count;
  v_take integer;
  r record;
begin
  if p_count is null or p_count <= 0 then
    return 0;
  end if;
  select coalesce(-sum(delta), 0)::int into v_existing
    from public.sms_credit_ledger
   where business_id = p_business and outbox_id = p_outbox and kind = 'consume';
  if v_existing > 0 then
    return v_existing;
  end if;
  -- Lås företagets giltiga lotter innan saldot räknas (en samtidig refund i
  -- webhooken håller inte advisory-låset).
  perform 1 from public.sms_credit_purchases
   where business_id = p_business
     and status in ('paid', 'partially_refunded')
     and credits_remaining > 0
     and expires_at > now()
   for update;
  select coalesce(sum(credits_remaining), 0)::int into v_avail
    from public.sms_credit_purchases
   where business_id = p_business
     and status in ('paid', 'partially_refunded')
     and credits_remaining > 0
     and expires_at > now();
  if v_avail < p_count then
    return 0;
  end if;
  for r in
    select id, credits_remaining
      from public.sms_credit_purchases
     where business_id = p_business
       and status in ('paid', 'partially_refunded')
       and credits_remaining > 0
       and expires_at > now()
     order by expires_at, paid_at, id
  loop
    exit when v_left = 0;
    v_take := least(v_left, r.credits_remaining);
    update public.sms_credit_purchases
       set credits_remaining = credits_remaining - v_take
     where id = r.id;
    insert into public.sms_credit_ledger (business_id, purchase_id, outbox_id, kind, delta)
    values (p_business, r.id, p_outbox, 'consume', -v_take);
    v_left := v_left - v_take;
  end loop;
  return p_count;
end;
$$;

-- Lämnar tillbaka krediterna som `p_outbox` tog (raden blev dead/cancelled).
-- En gång per (rad, köp). Utgånget eller återbetalt köp → ledger-rad med 0
-- (krediten är förlorad). Returnerar antal återlämnade krediter.
create function private.sms_credit_release(p_outbox uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_back integer;
  v_total integer := 0;
begin
  for r in
    select l.business_id, l.purchase_id, -l.delta as n
      from public.sms_credit_ledger l
     where l.outbox_id = p_outbox
       and l.kind = 'consume'
       and not exists (
         select 1 from public.sms_credit_ledger x
          where x.outbox_id = p_outbox
            and x.purchase_id = l.purchase_id
            and x.kind = 'release'
       )
  loop
    select case
             when p.status in ('paid', 'partially_refunded') and p.expires_at > now()
               then greatest(0, least(r.n, p.credits_total - p.credits_refunded - p.credits_remaining))
             else 0
           end
      into v_back
      from public.sms_credit_purchases p
     where p.id = r.purchase_id
     for update;
    v_back := coalesce(v_back, 0);
    if v_back > 0 then
      update public.sms_credit_purchases
         set credits_remaining = credits_remaining + v_back
       where id = r.purchase_id;
    end if;
    insert into public.sms_credit_ledger (business_id, purchase_id, outbox_id, kind, delta)
    values (r.business_id, r.purchase_id, p_outbox, 'release', v_back);
    v_total := v_total + v_back;
  end loop;
  return v_total;
end;
$$;

-- Återbetalning i Stripe. Kumulativ: `p_credits_refunded_total` = totalt antal
-- återbetalda krediter enligt Stripe (charge.amount_refunded). Drar bara
-- oförbrukade krediter; saldot blir aldrig negativt. Samma värde igen → 0.
create function private.sms_credit_refund(
  p_purchase uuid,
  p_credits_refunded_total integer
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.sms_credit_purchases;
  v_delta integer;
  v_void integer;
begin
  select * into v from public.sms_credit_purchases where id = p_purchase for update;
  if not found or v.status not in ('paid', 'partially_refunded', 'refunded') then
    return 0;
  end if;
  v_delta := least(greatest(p_credits_refunded_total, 0), v.credits_total) - v.credits_refunded;
  if v_delta <= 0 then
    return 0;
  end if;
  v_void := least(v.credits_remaining, v_delta);
  update public.sms_credit_purchases
     set credits_refunded = credits_refunded + v_delta,
         credits_remaining = credits_remaining - v_void,
         status = case
                    when credits_refunded + v_delta >= credits_total then 'refunded'
                    else 'partially_refunded'
                  end
   where id = p_purchase;
  insert into public.sms_credit_ledger (business_id, purchase_id, kind, delta)
  values (v.business_id, v.id, 'refund', -v_void);
  return v_void;
end;
$$;

-- Saldo: summan av oförbrukade krediter i giltiga köp + närmaste utgång.
create function private.sms_credit_balance(p_business uuid)
returns table (balance integer, next_expiry timestamptz, next_expiry_credits integer)
language sql
stable
security definer
set search_path = ''
as $$
  with lots as (
    select credits_remaining, expires_at
      from public.sms_credit_purchases
     where business_id = p_business
       and status in ('paid', 'partially_refunded')
       and credits_remaining > 0
       and expires_at > now()
  )
  select coalesce((select sum(credits_remaining) from lots), 0)::int,
         (select min(expires_at) from lots),
         coalesce((select sum(credits_remaining) from lots
                    where expires_at = (select min(expires_at) from lots)), 0)::int;
$$;

revoke all on function private.sms_credit_grant(uuid, text, timestamptz) from public;
revoke all on function private.sms_credit_consume(uuid, uuid, integer) from public;
revoke all on function private.sms_credit_release(uuid) from public;
revoke all on function private.sms_credit_refund(uuid, integer) from public;
revoke all on function private.sms_credit_balance(uuid) from public;
grant execute on function private.sms_credit_grant(uuid, text, timestamptz) to service_role;
grant execute on function private.sms_credit_consume(uuid, uuid, integer) to service_role;
grant execute on function private.sms_credit_release(uuid) to service_role;
grant execute on function private.sms_credit_refund(uuid, integer) to service_role;
grant execute on function private.sms_credit_balance(uuid) to service_role;

-- 5. Återlämning när en sms-rad slutar utan att skickas ----------------------------
-- Trigger i stället för anrop i varje kodväg: workern (dead/cancelled/sms_quota)
-- och andra flöden som avbryter köade rader (avbokning, flytt) täcks alla.
create function private.message_outbox_release_sms_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sms_credit_release(new.id);
  return new;
end;
$$;
revoke all on function private.message_outbox_release_sms_credits() from public;

create trigger release_sms_credits
  after update of status on public.message_outbox
  for each row
  when (
    new.channel = 'sms'
    and new.status in ('dead', 'cancelled')
    and old.status is distinct from new.status
  )
  execute function private.message_outbox_release_sms_credits();
