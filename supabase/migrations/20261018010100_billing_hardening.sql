-- WP-78 · säkerhetsgranskning (PR #115) · D-059.
--  1. billing_sweep: `past_due` räknas som levande abonnemang (pilotslut,
--     påminnelser) bara medan `grace_until > now`.
--  2. billing_apply_subscription: returnerar 'duplicate' (under radlåset) när
--     raden redan har ett annat levande abonnemang och det nya också är
--     levande — servern säger upp det nya först efter det svaret.
--  3. Append-only: service_role får inte radera/tömma billing_subscriptions
--     (raden försvinner bara med företaget) eller private.plan_changes.
set search_path = public, extensions;

create or replace function private.billing_apply_subscription(
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
    -- Två levande abonnemang (dubbel Checkout): det på raden behålls,
    -- anroparen säger upp det nya först efter det här svaret.
    if v.status = any (v_live) and p_status = any (v_live) then
      return 'duplicate';
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

create or replace function private.billing_sweep(p_now timestamptz)
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
    select b.id, s.status, s.plan as sub_plan, s.grace_until
      from public.businesses b
      left join public.billing_subscriptions s on s.business_id = b.id
     where b.plan_override_until is not null
       and b.plan_override_until <= p_now
       and b.plan <> 'custom'
     for update of b
  loop
    update public.businesses set plan_override_until = null where id = r.id;
    -- past_due räknas som levande bara inom grace (annars växlar en pilot med
    -- förfallen betalning mellan Gratis och betald plan).
    if (r.status in ('trialing', 'active')
        or (r.status = 'past_due' and r.grace_until > p_now))
       and r.sub_plan is not null then
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
       and not (coalesce(s.status, '') in ('trialing', 'active')
                or (s.status = 'past_due' and s.grace_until > p_now))
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

revoke delete, truncate on public.billing_subscriptions from service_role;
revoke delete, truncate on private.plan_changes from service_role;
