-- WP-78 · Abonnemang i SE via Stripe Billing på plattformens konto · D-059 · F17/F19.
-- Ägarens beslut 2026-10-11: provperiod 14 dagar utan kort (en gång per
-- företag), nedgradering mellan betalda planer vid periodens slut, grace 14
-- dagar vid misslyckad betalning, pilotföretag (`plan_override_until`) går
-- till Gratis vid datumet med mejl 14 och 3 dagar innan.
--
-- Delar:
--  1. billing_subscriptions: en rad per företag, spegel av Stripe. Ägaren
--     LÄSER sin rad, bara servern skriver.
--  2. private.plan_changes: append-only logg över varje faktisk planändring
--     (stripe | admin | sweep). Ingen persondata.
--  3. private.billing_set_plan / billing_apply_subscription / billing_sweep
--     (service_role): ENDA vägen som abonnemanget ändrar `businesses.plan`.
--     `custom` och aktiv `plan_override_until` rörs aldrig (admin styr).
--  4. Mejl till ägaren köas i message_outbox i samma transaktion som
--     planändringen (regel 4): `abonnemangNedgraderat`, `abonnemangPilotSlutar`.
set search_path = public, extensions;

-- 1. billing_subscriptions ----------------------------------------------------------
create table public.billing_subscriptions (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  plan public.business_plan,
  price_lookup_key text,
  status text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Nedgradering som väntar till periodens slut (Subscription Schedule).
  pending_plan public.business_plan,
  grace_until timestamptz,
  card_brand text,
  card_last4 text,
  -- Första gången en provperiod startade: en provperiod per företag.
  trial_used_at timestamptz,
  -- Tiden då servern hämtade abonnemanget från Stripes API (ordningskontroll).
  stripe_updated_at timestamptz,
  open_checkout_session_id text,
  open_checkout_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_plan_check check (
    plan is null or plan in ('emprende', 'equipo', 'local')
  ),
  constraint billing_subscriptions_pending_plan_check check (
    pending_plan is null or pending_plan in ('emprende', 'equipo', 'local')
  ),
  constraint billing_subscriptions_status_check check (
    status is null or status in (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'unpaid', 'canceled', 'paused'
    )
  ),
  -- Ett abonnemang har alltid status och plan; utan abonnemang inget av dem.
  constraint billing_subscriptions_sub_check check (
    (stripe_subscription_id is null) = (status is null)
    and (stripe_subscription_id is null or plan is not null)
  ),
  constraint billing_subscriptions_card_check check (
    card_last4 is null or card_last4 ~ '^[0-9]{4}$'
  ),
  constraint billing_subscriptions_ids_check check (
    stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
    and (stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$')
  )
);
create index billing_subscriptions_grace_idx on public.billing_subscriptions (grace_until)
  where status = 'past_due';
create trigger set_updated_at
  before update on public.billing_subscriptions
  for each row execute function private.set_updated_at();

comment on table public.billing_subscriptions is
  'WP-78/D-059: Stripe-abonnemanget per företag (SE). Ägaren läser, servern skriver via private.billing_*.';

alter table public.billing_subscriptions enable row level security;
create policy "owners select" on public.billing_subscriptions
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select on public.billing_subscriptions to authenticated;
-- Ingen delete: raden försvinner bara med företaget (cascade).
grant select, insert, update on public.billing_subscriptions to service_role;

-- 2. plan_changes (append-only) -----------------------------------------------------
create table private.plan_changes (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  from_plan public.business_plan not null,
  to_plan public.business_plan not null,
  source text not null,
  stripe_event_id text,
  created_at timestamptz not null default now(),
  constraint plan_changes_source_check check (source in ('stripe', 'admin', 'sweep')),
  constraint plan_changes_changed_check check (from_plan <> to_plan)
);
create index plan_changes_business_idx on private.plan_changes (business_id, created_at desc);
alter table private.plan_changes enable row level security;
revoke all on private.plan_changes from public, anon, authenticated;
grant select, insert on private.plan_changes to service_role;
grant usage on sequence private.plan_changes_id_seq to service_role;

-- 3. Funktioner (service_role) ------------------------------------------------------

-- Ändrar `businesses.plan` och loggar ändringen. Rör aldrig `custom` eller ett
-- företag med aktiv `plan_override_until`. Går planen till `free` från en
-- betald plan köas `abonnemangNedgraderat` till ägaren (p_reason: trial |
-- payment | canceled | pilot). Returnerar true om planen faktiskt ändrades.
create function private.billing_set_plan(
  p_business uuid,
  p_to public.business_plan,
  p_source text,
  p_event_id text,
  p_reason text,
  p_now timestamptz
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.business_plan;
  v_override timestamptz;
  v_change bigint;
begin
  select plan, plan_override_until into v_from, v_override
    from public.businesses where id = p_business
   for update;
  if not found or v_from = 'custom' or v_from = p_to then
    return false;
  end if;
  if v_override is not null and v_override > p_now then
    return false;
  end if;
  update public.businesses set plan = p_to where id = p_business;
  insert into private.plan_changes (business_id, from_plan, to_plan, source, stripe_event_id)
  values (p_business, v_from, p_to, p_source, p_event_id)
  returning id into v_change;
  if p_to = 'free' and p_source in ('stripe', 'sweep') then
    insert into public.message_outbox
      (business_id, booking_id, channel, recipient_kind, template, payload,
       category, dedupe_key)
    values (p_business, null, 'email', 'owner', 'abonnemangNedgraderat',
            jsonb_build_object('plan', v_from::text, 'motivo', coalesce(p_reason, 'canceled')),
            'utility', 'billing_downgraded:' || p_business::text || ':' || v_change::text)
    on conflict (dedupe_key) do nothing;
  end if;
  return true;
end;
$$;

-- Speglar ett abonnemang som servern just hämtat från Stripes API. Svar:
--  'applied' | 'stale' (äldre hämtning än den sparade) | 'other' (händelse för
--  ett annat, avslutat abonnemang medan raden har ett levande).
-- Regel för `businesses.plan`: trialing/active → p_plan; past_due → behålls
-- (grace_until sätts en gång, 14 dagar); unpaid/canceled/incomplete_expired/
-- paused → free; incomplete → oförändrad (betalningen inte bekräftad).
create function private.billing_apply_subscription(
  p_business uuid,
  p_customer text,
  p_subscription text,
  p_plan public.business_plan,
  p_price_lookup_key text,
  p_status text,
  p_trial_end timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_pending_plan public.business_plan,
  p_card_brand text,
  p_card_last4 text,
  p_stripe_time timestamptz,
  p_event_id text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.billing_subscriptions;
  v_live constant text[] := array['trialing', 'active', 'past_due', 'incomplete', 'unpaid'];
  v_reason text;
begin
  select * into v from public.billing_subscriptions
   where business_id = p_business
   for update;
  if not found then
    raise exception 'billing_no_customer' using errcode = 'P0002';
  end if;
  if v.stripe_customer_id <> p_customer then
    raise exception 'billing_customer_mismatch' using errcode = '22023';
  end if;
  if p_plan not in ('emprende', 'equipo', 'local') then
    raise exception 'billing_invalid_plan' using errcode = '22023';
  end if;

  if v.stripe_subscription_id is not null and v.stripe_subscription_id <> p_subscription then
    -- Ett gammalt (eller dubbelt, redan uppsagt) abonnemang får aldrig skriva
    -- över det levande.
    if v.status = any (v_live) and not (p_status = any (v_live)) then
      return 'other';
    end if;
  elsif v.stripe_updated_at is not null and p_stripe_time < v.stripe_updated_at then
    return 'stale';
  end if;

  v_reason := case
    when v.status = 'trialing' and v.stripe_subscription_id = p_subscription then 'trial'
    when p_status = 'unpaid' or v.status in ('past_due', 'unpaid') then 'payment'
    else 'canceled'
  end;

  update public.billing_subscriptions
     set stripe_subscription_id = p_subscription,
         plan = p_plan,
         price_lookup_key = p_price_lookup_key,
         status = p_status,
         trial_end = p_trial_end,
         current_period_end = p_period_end,
         cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
         pending_plan = p_pending_plan,
         grace_until = case
           when p_status = 'past_due'
             then coalesce(grace_until, p_stripe_time + interval '14 days')
           else null
         end,
         card_brand = p_card_brand,
         card_last4 = p_card_last4,
         trial_used_at = case
           when p_status = 'trialing' or p_trial_end is not null
             then coalesce(trial_used_at, p_stripe_time)
           else trial_used_at
         end,
         stripe_updated_at = greatest(coalesce(stripe_updated_at, p_stripe_time), p_stripe_time),
         open_checkout_session_id = null,
         open_checkout_expires_at = null
   where business_id = p_business;

  if p_status in ('trialing', 'active') then
    perform private.billing_set_plan(p_business, p_plan, 'stripe', p_event_id, null, p_stripe_time);
  elsif p_status in ('unpaid', 'canceled', 'incomplete_expired', 'paused') then
    perform private.billing_set_plan(p_business, 'free', 'stripe', p_event_id, v_reason, p_stripe_time);
  end if;
  return 'applied';
end;
$$;

-- Säkerhetsnätet i cron (outbox-passet):
--  a) past_due efter grace_until → free (Stripe säger normalt upp samtidigt).
--  b) plan_override_until passerat (pilot) → abonnemangets plan om ett levande
--     abonnemang finns, annars free; datumet nollställs. `custom` rörs inte.
--  c) Påminnelse till piloten 14 och 3 dagar innan (en per tröskel och datum).
create function private.billing_sweep(p_now timestamptz)
returns table (grace_expired integer, pilots_ended integer, pilot_reminders integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_grace integer := 0;
  v_pilots integer := 0;
  v_reminders integer := 0;
  v_days integer;
  v_n integer;
begin
  for r in
    select s.business_id
      from public.billing_subscriptions s
     where s.status = 'past_due' and s.grace_until <= p_now
  loop
    if private.billing_set_plan(r.business_id, 'free', 'sweep', null, 'payment', p_now) then
      v_grace := v_grace + 1;
    end if;
  end loop;

  for r in
    select b.id, s.status, s.plan as sub_plan
      from public.businesses b
      left join public.billing_subscriptions s on s.business_id = b.id
     where b.plan_override_until is not null
       and b.plan_override_until <= p_now
       and b.plan <> 'custom'
     for update of b
  loop
    update public.businesses set plan_override_until = null where id = r.id;
    if r.status in ('trialing', 'active', 'past_due') and r.sub_plan is not null then
      perform private.billing_set_plan(r.id, r.sub_plan, 'sweep', null, null, p_now);
    else
      perform private.billing_set_plan(r.id, 'free', 'sweep', null, 'pilot', p_now);
    end if;
    v_pilots := v_pilots + 1;
  end loop;

  for r in
    select b.id, b.plan_override_until as until
      from public.businesses b
      left join public.billing_subscriptions s on s.business_id = b.id
     where b.plan_override_until > p_now
       and b.plan_override_until <= p_now + interval '14 days'
       and b.plan not in ('free', 'custom')
       and coalesce(s.status, '') not in ('trialing', 'active', 'past_due')
  loop
    v_days := case when r.until <= p_now + interval '3 days' then 3 else 14 end;
    insert into public.message_outbox
      (business_id, booking_id, channel, recipient_kind, template, payload,
       category, dedupe_key)
    values (r.id, null, 'email', 'owner', 'abonnemangPilotSlutar',
            jsonb_build_object('hasta', r.until, 'dias', v_days),
            'utility',
            'pilot_end:' || r.id::text || ':' || to_char(r.until at time zone 'UTC', 'YYYYMMDDHH24MI') || ':' || v_days)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count;
    v_reminders := v_reminders + v_n;
  end loop;

  return query select v_grace, v_pilots, v_reminders;
end;
$$;

revoke all on function private.billing_set_plan(uuid, public.business_plan, text, text, text, timestamptz) from public;
revoke all on function private.billing_apply_subscription(uuid, text, text, public.business_plan, text, text, timestamptz, timestamptz, boolean, public.business_plan, text, text, timestamptz, text) from public;
revoke all on function private.billing_sweep(timestamptz) from public;
grant execute on function private.billing_set_plan(uuid, public.business_plan, text, text, text, timestamptz) to service_role;
grant execute on function private.billing_apply_subscription(uuid, text, text, public.business_plan, text, text, timestamptz, timestamptz, boolean, public.business_plan, text, text, timestamptz, text) to service_role;
grant execute on function private.billing_sweep(timestamptz) to service_role;
