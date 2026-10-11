-- WP-77 (D-058) · Presentkort: RLS och tenant-isolering (köparen ser sina,
-- medlemmar med rapportbehörighet ser företagets utan kod/e-post/hälsning,
-- personal utan behörighet ser inget), bara servern kör funktionerna utom
-- kassans inlösen, idempotent leverans (kort + issue + två utkorgsrader),
-- reservation/släpp/utgång via bokningens status, kumulativ återbetalning,
-- append-only ledger och invarianten `balance_minor = sum(delta_minor)`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(55);
\ir _helpers.psql

insert into auth.users (id, email, role, aud) values
  ('c0000000-7700-0000-0000-000000000001', 'pk-kopare@example.com', 'authenticated', 'authenticated');

update public.businesses set gift_cards_enabled = true, plan = 'emprende', timezone = 'Europe/Stockholm'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.businesses set gift_cards_enabled = true, plan = 'free'
 where id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.stripe_accounts (business_id, stripe_account_id, charges_enabled) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'acct_pk_a', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'acct_pk_b', true);

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Klipp', 30, 40000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-7700-0000-0002-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+46700000077', 'Kund');

-- 1-4. Öppna en order: avgiften räknas här, planen och beloppet kontrolleras.
create temp table o1 as
  select * from private.gift_card_open_order(
    'aaaaaaaa-0000-0000-0000-000000000001', 'c0000000-7700-0000-0000-000000000001',
    'Ella', 'ella@example.com', 'Sara', 'sara@example.com', 'Grattis!', 'lilac',
    null, 50000, 100, 31, now());
select is((select outcome from o1), 'created', 'en order öppnas');
select is((select fee_minor from o1), 500, 'avgift = floor(belopp × bps / 10 000)');
select is(
  (select outcome from private.gift_card_open_order('bbbbbbbb-0000-0000-0000-000000000002', null,
     'Ella', 'ella@example.com', 'Sara', null, null, 'lime', null, 50000, 100, 31, now())),
  'unavailable', 'planen Gratis kan inte sälja presentkort');
select is(
  (select outcome from private.gift_card_open_order('aaaaaaaa-0000-0000-0000-000000000001', null,
     'Ella', 'ella@example.com', 'Sara', null, null, 'lime', null, 9900, 100, 31, now())),
  'invalid', 'belopp under 100 kr nekas');

-- 5-10. Leverans: fel belopp → fel; två anrop → ett kort, en issue, två utkorgsrader.
update public.gift_card_orders set session_id = 'cs_pk_1' where id = (select order_id from o1);
select throws_ok(
  $$ select * from private.gift_card_fulfill((select order_id from o1), 'cs_pk_1', 'pi_pk_1', 1, 'sek', 'PK-AAAA-AAAA-AAAA', repeat('b', 43), repeat('v', 43), now()) $$,
  'P0001', null, 'fel belopp ger ett synligt fel');
select is(
  (select created from private.gift_card_fulfill((select order_id from o1), 'cs_pk_1', 'pi_pk_1', 50000, 'sek', 'PK-7QXM-4HRT-9KZ2', repeat('b', 43), repeat('v', 43), now())),
  true, 'betald order ger ett presentkort');
select is(
  (select created from private.gift_card_fulfill((select order_id from o1), 'cs_pk_1', 'pi_pk_1', 50000, 'sek', 'PK-ZZZZ-ZZZZ-ZZZZ', repeat('b', 43), repeat('v', 43), now())),
  false, 'samma händelse två gånger ger inget nytt kort');
select is((select count(*)::int from public.gift_cards where order_id = (select order_id from o1)), 1, 'ett kort');
select is(
  (select count(*)::int from public.gift_card_ledger l join public.gift_cards g on g.id = l.gift_card_id
    where g.code = 'PK-7QXM-4HRT-9KZ2' and l.kind = 'issue'),
  1, 'en issue-rad');
select is(
  (select count(*)::int from public.message_outbox
    where payload->>'giftCardId' = (select id::text from public.gift_cards where code = 'PK-7QXM-4HRT-9KZ2')),
  2, 'kvitto + leveransmejl i utkorgen');

-- 11-12. Leveranstid 08:00 lokal tid, över sommartid.
select is(private.gift_card_delivery_at('2026-10-25', 'Europe/Stockholm', '2026-10-11 12:00Z'),
  '2026-10-25 07:00Z'::timestamptz, 'DST-skiftet i oktober: 08:00 CET = 07:00Z');
select is(private.gift_card_delivery_at('2027-03-28', 'Europe/Stockholm', '2026-10-11 12:00Z'),
  '2027-03-28 06:00Z'::timestamptz, 'DST-skiftet i mars: 08:00 CEST = 06:00Z');

-- 13. Saldo = utgivet belopp; giltigt 24 månader.
select ok(
  (select balance_minor = 50000 and expires_at >= purchased_at + interval '24 months'
     from public.gift_cards where code = 'PK-7QXM-4HRT-9KZ2'),
  'saldo 500 kr, giltigt 24 månader');

-- 14-22. RLS och kolumn-grants.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-7700-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.gift_cards), 1, 'köparen ser sitt kort');
select is((select code from private.my_gift_cards() limit 1), 'PK-7QXM-4HRT-9KZ2', 'köparen ser koden via my_gift_cards');
select is(jsonb_array_length(private.export_my_account()->'gift_cards'), 1, 'exporten tar med presentkortet');
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.gift_cards), 0, 'ägaren B ser inte A:s kort');
select is((select count(*)::int from public.gift_card_orders), 0, 'ägaren B ser inte A:s ordrar');
select is((select count(*)::int from public.gift_card_ledger), 0, 'ägaren B ser inte A:s ledger');
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.gift_cards), 0, 'personal utan rapportbehörighet ser inget');
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.gift_cards), 1, 'ägaren A ser företagets kort');
select throws_ok($$ select code from public.gift_cards $$, '42501', null, 'medlemmar ser aldrig koden');
select throws_ok($$ select buyer_email, greeting from public.gift_card_orders $$, '42501', null, 'medlemmar ser aldrig e-post/hälsning');
select throws_ok(
  $$ update public.gift_cards set balance_minor = 99999 $$,
  '42501', null, 'klienten kan inte skriva kort');
select throws_ok(
  $$ select * from private.gift_card_fulfill(gen_random_uuid(), 'x', 'x', 1, 'sek', 'x', 'x', 'x', now()) $$,
  '42501', null, 'authenticated kan inte köra fulfill');
-- Kassans inlösen: ägaren B (annat företag) nekas.
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select * from private.gift_card_redeem_at_till('aaaaaaaa-0000-0000-0000-000000000001', 'PK-7QXM-4HRT-9KZ2', 100, null, now()) $$,
  '42501', null, 'medlem i ett annat företag kan inte lösa in');
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select * from private.gift_card_redeem_at_till('aaaaaaaa-0000-0000-0000-000000000001', 'PK-7QXM-4HRT-9KZ2', 100, null, now()) $$,
  '42501', null, 'personal utan behörighet kan inte lösa in');
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.gift_cards $$, '42501', null, 'anon når inte gift_cards');
reset role;
-- Resten körs som servern.
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

-- 27-31. Reservation vid bokning (saldo 500, att betala 400 → 400), avbokning
-- släpper, utgånget kort vid avbokning → release + expire.
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-7700-0000-0004-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-7700-0000-0002-000000000001',
   tstzrange(now() + interval '2 days', now() + interval '2 days 30 minutes', '[)'), tstzrange(now() + interval '2 days', now() + interval '2 days 30 minutes', '[)'), 'confirmed', 'web', 40000, 0);
select is(
  (select held_minor from private.gift_card_hold('aaaaaaaa-0000-0000-0000-000000000001', 'pk 7qxm 4hrt 9kz2', 'aaaaaaaa-7700-0000-0004-000000000001', 40000, now())),
  40000, 'reservationen tar det som ska betalas (koden normaliseras)');
select is((select balance_minor from public.gift_cards where code = 'PK-7QXM-4HRT-9KZ2'), 10000, 'saldo 100 kvar');
select is(
  (select count(*)::int from private.gift_card_lookup_at_till('bbbbbbbb-0000-0000-0000-000000000002', 'PK-7QXM-4HRT-9KZ2', now())),
  0, 'koden gäller bara hos utfärdande företag');
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'customer' where id = 'aaaaaaaa-7700-0000-0004-000000000001';
select is((select balance_minor from public.gift_cards where code = 'PK-7QXM-4HRT-9KZ2'), 50000, 'avbokning släpper reservationen');

insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-7700-0000-0004-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-7700-0000-0002-000000000001',
   tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes', '[)'), tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes', '[)'), 'confirmed', 'web', 80000, 0);
select is(
  (select held_minor from private.gift_card_hold('aaaaaaaa-0000-0000-0000-000000000001', 'PK-7QXM-4HRT-9KZ2', 'aaaaaaaa-7700-0000-0004-000000000002', 80000, now())),
  50000, 'reservation större än saldot tar bara saldot');
-- Genomförd → betalning `gift_card` (deposit: 300 kr kvar att ta betalt).
update public.bookings set status = 'completed' where id = 'aaaaaaaa-7700-0000-0004-000000000002';
select is(
  (select kind::text || ':' || amount_clp from public.payments where booking_id = 'aaaaaaaa-7700-0000-0004-000000000002' and method = 'gift_card'),
  'deposit:50000', 'genomförd bokning: reservationen blir betalning');
select is((select status from public.gift_cards where code = 'PK-7QXM-4HRT-9KZ2'), 'depleted', 'saldo 0 → depleted');

-- 34-37. Kumulativ återbetalning från Stripe på ett nytt kort: 500, inlöst 200,
-- Stripe återbetalar 500 → saldo 0, aldrig negativt; samma anrop igen → ingen ändring.
create temp table o2 as
  select * from private.gift_card_open_order('aaaaaaaa-0000-0000-0000-000000000001', null,
    'Gäst', 'gast@example.com', 'Moa', null, null, 'lime', null, 50000, 100, 31, now());
update public.gift_card_orders set session_id = 'cs_pk_2' where id = (select order_id from o2);
select created from private.gift_card_fulfill((select order_id from o2), 'cs_pk_2', 'pi_pk_2', 50000, 'sek', 'PK-2222-3333-4444', repeat('b', 43), repeat('v', 43), now());
select is(
  (select outcome || ':' || balance_minor from private.gift_card_redeem_at_till('aaaaaaaa-0000-0000-0000-000000000001', 'PK-2222-3333-4444', 20000, null, now())),
  'redeemed:30000', 'kassan löser in 200 kr');
select is(
  (select outcome from private.gift_card_redeem_at_till('aaaaaaaa-0000-0000-0000-000000000001', 'PK-2222-3333-4444', 30001, null, now())),
  'empty', 'mer än saldot nekas');
select is(private.gift_card_mark_payment('pi_pk_2', 'refunded', 50000, now()), 1, 'Stripe-återbetalning speglas');
select is((select balance_minor || ':' || status from public.gift_cards where code = 'PK-2222-3333-4444'), '0:refunded', 'saldo 0, aldrig negativt');
select is(private.gift_card_mark_payment('pi_pk_2', 'refunded', 50000, now()), 0, 'samma återbetalning igen ändrar inget');

-- 39-40. Utgång: kortet förfaller med sitt saldo; utgånget kort vid avbokning → release + expire.
create temp table o3 as
  select * from private.gift_card_open_order('aaaaaaaa-0000-0000-0000-000000000001', null,
    'Gäst', 'gast3@example.com', 'Ida', null, null, 'photo', null, 30000, 100, 31, now());
update public.gift_card_orders set session_id = 'cs_pk_3' where id = (select order_id from o3);
select created from private.gift_card_fulfill((select order_id from o3), 'cs_pk_3', 'pi_pk_3', 30000, 'sek', 'PK-3333-4444-5555', repeat('b', 43), repeat('v', 43), now());
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-7700-0000-0004-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-7700-0000-0002-000000000001',
   tstzrange(now() + interval '4 days', now() + interval '4 days 30 minutes', '[)'), tstzrange(now() + interval '4 days', now() + interval '4 days 30 minutes', '[)'), 'confirmed', 'web', 10000, 0);
select is(
  (select held_minor from private.gift_card_hold('aaaaaaaa-0000-0000-0000-000000000001', 'PK-3333-4444-5555', 'aaaaaaaa-7700-0000-0004-000000000003', 10000, now())),
  10000, 'reservation 100 kr');
update public.gift_cards set expires_at = now() - interval '1 minute', purchased_at = now() - interval '25 months'
 where code = 'PK-3333-4444-5555';
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'customer' where id = 'aaaaaaaa-7700-0000-0004-000000000003';
select is(
  (select balance_minor || ':' || status from public.gift_cards where code = 'PK-3333-4444-5555'),
  '0:expired', 'utgånget kort vid avbokning: release + expire');

-- 41-42. Ledger är append-only även för service_role; saldot kan aldrig bli negativt.
set local role service_role;
select throws_ok($$ update public.gift_card_ledger set delta_minor = 1 $$, '42501', null, 'ledger kan inte uppdateras');
select throws_ok($$ delete from public.gift_card_ledger $$, '42501', null, 'ledger kan inte raderas');
reset role;
select throws_ok(
  $$ insert into public.gift_card_ledger (business_id, gift_card_id, kind, delta_minor)
     select business_id, id, 'redeem', -1 from public.gift_cards where code = 'PK-2222-3333-4444' $$,
  '23514', null, 'saldot kan aldrig bli negativt');


-- 47-52. Säkerhetsgranskning #116 B1/B2: ett kort betalar två besök (unik
-- provider_ref per betalning), reservationen syns som betald direkt (kassan
-- kan inte lösa in samma belopp igen), svepet körs efteråt utan fel.
create temp table o4 as
  select * from private.gift_card_open_order('aaaaaaaa-0000-0000-0000-000000000001', null,
    'Gäst', 'gast4@example.com', 'Liv', null, null, 'lime', null, 100000, 100, 31, now());
update public.gift_card_orders set session_id = 'cs_pk_4' where id = (select order_id from o4);
select created from private.gift_card_fulfill((select order_id from o4), 'cs_pk_4', 'pi_pk_4', 100000, 'sek', 'PK-4444-5555-6666', repeat('b', 43), repeat('v', 43), now());
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-7700-0000-0004-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-7700-0000-0002-000000000001',
   tstzrange(now() + interval '5 days', now() + interval '5 days 30 minutes', '[)'), tstzrange(now() + interval '5 days', now() + interval '5 days 30 minutes', '[)'), 'confirmed', 'web', 40000, 0),
  ('aaaaaaaa-7700-0000-0004-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-7700-0000-0002-000000000001',
   tstzrange(now() + interval '6 days', now() + interval '6 days 30 minutes', '[)'), tstzrange(now() + interval '6 days', now() + interval '6 days 30 minutes', '[)'), 'confirmed', 'web', 40000, 0);
select is(
  (select held_minor from private.gift_card_hold('aaaaaaaa-0000-0000-0000-000000000001', 'PK-4444-5555-6666', 'aaaaaaaa-7700-0000-0004-000000000004', 30000, now())),
  30000, 'reservation på besök 1 (delbetalning)');
select is(
  (select held_minor from private.gift_card_hold('aaaaaaaa-0000-0000-0000-000000000001', 'PK-4444-5555-6666', 'aaaaaaaa-7700-0000-0004-000000000005', 40000, now())),
  40000, 'samma kort reserverar besök 2');
select is(
  (select kind::text || ':' || status::text from public.payments where booking_id = 'aaaaaaaa-7700-0000-0004-000000000004' and method = 'gift_card'),
  'deposit:approved', 'reservationen är en godkänd betalning direkt (B2)');
select is(
  (select outcome from private.gift_card_redeem_at_till('aaaaaaaa-0000-0000-0000-000000000001', 'PK-4444-5555-6666', 10000, 'aaaaaaaa-7700-0000-0004-000000000005', now())),
  'invalid_amount', 'kassan kan inte lösa in en redan reserverad bokning igen (B2)');
select is(
  (select outcome from private.gift_card_redeem_at_till('aaaaaaaa-0000-0000-0000-000000000001', 'PK-4444-5555-6666', 10000, 'aaaaaaaa-7700-0000-0004-000000000004', now())),
  'redeemed', 'kassan tar resten av besök 1 (egen provider_ref, B1)');
update public.bookings set status = 'completed' where id in ('aaaaaaaa-7700-0000-0004-000000000004', 'aaaaaaaa-7700-0000-0004-000000000005');
select lives_ok($$ select * from private.gift_card_sweep(now()) $$, 'svepet efter två genomförda besök på samma kort (B1)');
select is(
  (select count(*)::int from public.payments where provider_ref like 'gift_card:' || (select id::text from public.gift_cards where code = 'PK-4444-5555-6666') || ':%' and status = 'approved'),
  3, 'tre presentkortsbetalningar på samma kort');

-- 54. Avbokning efter reservation: betalningsraden blir `refunded`.
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-7700-0000-0004-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0001-000000000001', 'aaaaaaaa-7700-0000-0002-000000000001',
   tstzrange(now() + interval '7 days', now() + interval '7 days 30 minutes', '[)'), tstzrange(now() + interval '7 days', now() + interval '7 days 30 minutes', '[)'), 'confirmed', 'web', 10000, 0);
select held_minor from private.gift_card_hold('aaaaaaaa-0000-0000-0000-000000000001', 'PK-4444-5555-6666', 'aaaaaaaa-7700-0000-0004-000000000006', 10000, now());
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'customer' where id = 'aaaaaaaa-7700-0000-0004-000000000006';
select is(
  (select status::text from public.payments where booking_id = 'aaaaaaaa-7700-0000-0004-000000000006' and method = 'gift_card'),
  'refunded', 'avbokad reservation: betalningen återförs');

-- 55. Kontoradering fastnar inte på presentkorten (BÖR 3).
delete from auth.users where id = 'c0000000-7700-0000-0000-000000000001';
select is((select count(*)::int from public.gift_cards where code = 'PK-7QXM-4HRT-9KZ2' and user_id is null), 1, 'kontoradering nollar köparen');

-- 44. Invarianten efter alla fall.
select is(
  (select count(*)::int from public.gift_cards g
    where g.balance_minor <> (select coalesce(sum(delta_minor), 0) from public.gift_card_ledger l where l.gift_card_id = g.id)),
  0, 'balance_minor = sum(delta_minor) för alla kort');

select * from finish();
rollback;
