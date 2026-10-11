-- WP-78 · Abonnemang (D-059) · INV-3/INV-4: tenant-isolering för
-- `billing_subscriptions`, att bara servern ändrar `businesses.plan`, och
-- regeln i `private.billing_apply_subscription` / `private.billing_sweep`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);
\ir _helpers.psql

update public.memberships set can_edit_settings = true
 where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.billing_subscriptions (business_id, stripe_customer_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'cus_B');

-- Data som ska överleva en nedgradering (D-048).
insert into public.services (business_id, name, duration_min, price_clp, active)
select 'aaaaaaaa-0000-0000-0000-000000000001', 'Tjänst ' || g, 30, 1000, true
  from generate_series(1, 5) g;
create temp table counts_before as
  select (select count(*) from public.services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001') as services,
         (select count(*) from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001') as members;

-- RLS ------------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.billing_subscriptions'::regclass), 'RLS på billing_subscriptions');
select ok(not has_table_privilege('anon', 'public.billing_subscriptions', 'select'), 'anon har ingen grant');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.billing_subscriptions), 1, 'ägare A ser bara sin rad');
select is((select stripe_customer_id from public.billing_subscriptions), 'cus_A', '… och det är A:s');
select throws_ok($$ update public.billing_subscriptions set status = 'active' $$, '42501', null, 'ägaren kan inte skriva raden');
select throws_ok($$ insert into public.billing_subscriptions (business_id, stripe_customer_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cus_X') $$, '42501', null, 'ägaren kan inte skapa en rad');
select throws_ok(
  $$ select private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'local', null, 'active', null, null, false, null, null, null, now(), null) $$,
  '42501', null, 'authenticated kan inte köra billing_apply_subscription');
select throws_ok($$ select private.billing_sweep(now()) $$, '42501', null, 'authenticated kan inte köra billing_sweep');
select throws_ok($$ select * from private.plan_changes $$, '42501', null, 'authenticated kan inte läsa plan_changes');
-- Regression B2: planen är inte skrivbar för appen.
select throws_ok($$ update public.businesses set plan = 'local' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '42501', null, 'authenticated kan inte ändra businesses.plan (B2)');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.billing_subscriptions), 0, 'personal (även can_edit_settings) ser 0 rader');
set local role anon;
select throws_ok($$ select * from public.billing_subscriptions $$, '42501', null, 'anon kan inte läsa');
reset role;

-- billing_apply_subscription ----------------------------------------------------------
set local role service_role;
select is(private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'equipo', 'bb_se_equipo_monthly_v1', 'incomplete', null, null, false, null, null, null, now() - interval '10 minutes', 'evt_1'), 'applied', 'incomplete sparas');
reset role;
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'free', 'incomplete ändrar inte planen');

set local role service_role;
select is(private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'equipo', 'bb_se_equipo_monthly_v1', 'trialing', now() + interval '14 days', now() + interval '14 days', false, null, null, null, now() - interval '9 minutes', 'evt_2'), 'applied', 'trialing');
reset role;
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'equipo', 'trialing sätter planen');
select ok((select trial_used_at is not null from public.billing_subscriptions where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'trial_used_at sätts');

set local role service_role;
select is(private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'equipo', 'bb_se_equipo_monthly_v1', 'trialing', now() + interval '14 days', now() + interval '14 days', false, null, null, null, now() - interval '8 minutes', 'evt_3'), 'applied', 'samma läge igen');
select is(private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'local', 'bb_se_local_monthly_v1', 'active', null, now() + interval '30 days', false, null, 'visa', '4242', now() - interval '7 minutes', 'evt_4'), 'applied', 'active (uppgradering)');
reset role;
select is((select count(*)::int from private.plan_changes where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 2, 'plan_changes: en rad per faktisk ändring, ingen vid oförändrad plan');
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'local', 'active sätter planen från priset');

set local role service_role;
select is(private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'equipo', 'bb_se_equipo_monthly_v1', 'active', null, null, false, null, null, null, now() - interval '30 minutes', 'evt_old'), 'stale', 'äldre hämtning ignoreras');
select throws_ok(
  $$ select private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_B', 'sub_A1', 'local', null, 'active', null, null, false, null, null, null, now(), null) $$,
  '22023', null, 'fel kund → fel');

-- past_due: planen behålls, grace_until sätts en gång.
select is(private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'local', 'bb_se_local_monthly_v1', 'past_due', null, now() + interval '30 days', false, null, 'visa', '4242', now() - interval '6 minutes', 'evt_5'), 'applied', 'past_due');
reset role;
create temp table grace1 as select grace_until from public.billing_subscriptions where business_id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role service_role;
select private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'local', 'bb_se_local_monthly_v1', 'past_due', null, now() + interval '30 days', false, null, 'visa', '4242', now() - interval '5 minutes', 'evt_6');
reset role;
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'local', 'past_due behåller planen');
select is((select grace_until from public.billing_subscriptions where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'), (select grace_until from grace1), 'grace_until sätts bara en gång');

-- billing_sweep: före grace → oförändrad; efter → free utan dataförlust.
set local role service_role;
select is((select grace_expired from private.billing_sweep(now())), 0, 'svep före grace_until ändrar inget');
select is((select grace_expired from private.billing_sweep(now() + interval '15 days')), 1, 'svep efter grace_until → free');
reset role;
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'free', 'planen är free efter grace');
select ok(
  (select services from counts_before) = (select count(*) from public.services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and (select members from counts_before) = (select count(*) from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'nedgraderingen raderar inga tjänster eller konton');
select is((select count(*)::int from public.message_outbox where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and template = 'abonnemangNedgraderat'), 1, 'nedgraderingsmejlet köas');

-- Betalning under/efter grace återställer planen; canceled → free.
set local role service_role;
select private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'local', 'bb_se_local_monthly_v1', 'active', null, now() + interval '30 days', false, null, 'visa', '4242', now() - interval '4 minutes', 'evt_7');
reset role;
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'local', 'betald faktura återställer planen');
select ok((select grace_until is null from public.billing_subscriptions where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'grace_until nollställs');
set local role service_role;
select private.billing_apply_subscription('aaaaaaaa-0000-0000-0000-000000000001', 'cus_A', 'sub_A1', 'local', 'bb_se_local_monthly_v1', 'canceled', null, null, false, null, null, null, now() - interval '3 minutes', 'evt_8');
reset role;
select is((select plan::text from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'free', 'canceled → free');

-- custom och aktiv plan_override_until rörs aldrig.
update public.businesses set plan = 'custom' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role service_role;
select private.billing_apply_subscription('bbbbbbbb-0000-0000-0000-000000000002', 'cus_B', 'sub_B1', 'emprende', null, 'unpaid', null, null, false, null, null, null, now(), 'evt_b1');
reset role;
select is((select plan::text from public.businesses where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'custom', 'custom rörs inte (raden uppdateras ändå)');
update public.businesses set plan = 'equipo', plan_override_until = now() + interval '10 days' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role service_role;
select private.billing_apply_subscription('bbbbbbbb-0000-0000-0000-000000000002', 'cus_B', 'sub_B1', 'emprende', null, 'canceled', null, null, false, null, null, null, now() + interval '1 minute', 'evt_b2');
reset role;
select is((select plan::text from public.businesses where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'equipo', 'aktiv plan_override_until rörs inte');

-- Pilot: påminnelse (14 dagar → en rad), sedan free vid datumet.
set local role service_role;
select is((select pilot_reminders from private.billing_sweep(now())), 1, 'pilotpåminnelse köas inom 14 dagar');
select is((select pilot_reminders from private.billing_sweep(now())), 0, '… bara en gång per tröskel');
select is((select pilots_ended from private.billing_sweep(now() + interval '11 days')), 1, 'pilotdatumet passerat → avslutad');
reset role;
select is((select plan::text from public.businesses where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'free', 'piloten går till free utan abonnemang');

-- Dubbel Checkout: ett andra levande abonnemang → 'duplicate', raden orörd.
set local role service_role;
select private.billing_apply_subscription('bbbbbbbb-0000-0000-0000-000000000002', 'cus_B', 'sub_B2', 'equipo', null, 'active', null, null, false, null, null, null, now() + interval '20 days', 'evt_b3');
select is(private.billing_apply_subscription('bbbbbbbb-0000-0000-0000-000000000002', 'cus_B', 'sub_B3', 'local', null, 'active', null, null, false, null, null, null, now() + interval '21 days', 'evt_b4'), 'duplicate', 'andra levande abonnemanget → duplicate');
reset role;
select is((select stripe_subscription_id from public.billing_subscriptions where business_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'sub_B2', 'raden behåller det första abonnemanget');

-- Pilot med past_due efter grace → Gratis (inte abonnemangets plan), inga påminnelser.
update public.billing_subscriptions set status = 'past_due', grace_until = now() + interval '1 day'
 where business_id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.businesses set plan = 'equipo', plan_override_until = now() + interval '5 days'
 where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role service_role;
select is((select pilot_reminders from private.billing_sweep(now() + interval '2 days')), 1, 'past_due efter grace räknas inte som levande: påminnelse köas');
select is((select pilots_ended from private.billing_sweep(now() + interval '6 days')), 1, 'pilotdatumet passerat');
reset role;
select is((select plan::text from public.businesses where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'free', 'pilot med förfallen past_due → free');

-- Append-only även för service_role.
set local role service_role;
select throws_ok($$ delete from private.plan_changes $$, '42501', null, 'plan_changes kan inte raderas av service_role');
reset role;

select finish();
rollback;
