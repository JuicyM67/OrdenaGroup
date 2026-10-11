-- WP-69 (D-057) · Värdebevis: tenant-isolering och RLS (köparen ser bara sina,
-- medlemmar ser företagets utan koden), atomisk kvantitetsvakt (ingen
-- översäljning), idempotent leverans + kvittomejl i utkorgen, inlösen och
-- återlämning via bokningens status, utgång och återbetalning/tvist.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
\ir _helpers.psql

insert into auth.users (id, email, role, aud) values
  ('c0000000-6900-0000-0000-000000000001', 'kopare1@example.com', 'authenticated', 'authenticated'),
  ('c0000000-6900-0000-0000-000000000002', 'kopare2@example.com', 'authenticated', 'authenticated');

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-6900-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-6900-0000-0001-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('bbbbbbbb-6900-0000-0001-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte B', 30, 10000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-6900-0000-0002-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+46700000069', 'Kund');
insert into public.stripe_accounts (business_id, stripe_account_id, charges_enabled) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'acct_vb_a', true);
insert into public.offers (id, business_id, service_id, slug, title, regular_price_minor, offer_price_minor, currency, category, status, quantity_total) values
  ('aaaaaaaa-6900-0000-0003-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6900-0000-0001-000000000001', 'vb-corte-a', 'Corte A', 1, 8000, 'SEK', 'har', 'published', 1),
  ('bbbbbbbb-6900-0000-0003-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-6900-0000-0001-000000000001', 'vb-corte-b', 'Corte B', 1, 8000, 'SEK', 'har', 'published', null);

-- 1-3. Atomisk kvantitetsvakt: sista exemplaret går till en köpare.
create temp table o1 as
  select * from private.voucher_open_order('aaaaaaaa-6900-0000-0003-000000000001', 'c0000000-6900-0000-0000-000000000001', 100, 31, now());
select is((select outcome from o1), 'created', 'köpare 1 öppnar en order');
select is((select quantity_sold from public.offers where slug = 'vb-corte-a'), 1, 'öppen order räknas i quantity_sold');
select is(
  (select outcome from private.voucher_open_order('aaaaaaaa-6900-0000-0003-000000000001', 'c0000000-6900-0000-0000-000000000002', 100, 31, now())),
  'sold_out', 'köpare 2 får inte sista exemplaret (ingen översäljning)');

-- 4. Avgiften räknas på servern: 1 % av 8 000 öre, avrundat nedåt.
select is((select fee_minor from o1), 80, 'avgift = floor(belopp × bps / 10 000)');

-- 5. Dubbelklick: samma köpare återanvänder den öppna ordern.
update public.voucher_orders set session_id = 'cs_vb_1' where id = (select order_id from o1);
select is(
  (select outcome from private.voucher_open_order('aaaaaaaa-6900-0000-0003-000000000001', 'c0000000-6900-0000-0000-000000000001', 100, 31, now())),
  'reused', 'en öppen order med levande session återanvänds');

-- 6. Företag utan Stripe-konto som kan ta betalt: inget köp.
select is(
  (select outcome from private.voucher_open_order('bbbbbbbb-6900-0000-0003-000000000001', 'c0000000-6900-0000-0000-000000000001', 100, 31, now())),
  'unavailable', 'inget köp utan charges_enabled');

-- 7-9. Utgången session lämnar tillbaka exemplaret, en gång.
select ok(private.voucher_release_order((select order_id from o1), 'expired'), 'ordern släpps');
select is((select quantity_sold from public.offers where slug = 'vb-corte-a'), 0, 'exemplaret tillbaka');
select ok(not private.voucher_release_order((select order_id from o1), 'expired'), 'släpp är idempotent');

-- 10-14. Köpare 2 köper; leverans kontrollerar belopp och är idempotent.
create temp table o2 as
  select * from private.voucher_open_order('aaaaaaaa-6900-0000-0003-000000000001', 'c0000000-6900-0000-0000-000000000002', 100, 31, now());
update public.voucher_orders set session_id = 'cs_vb_2' where id = (select order_id from o2);
select throws_ok(
  $$ select * from private.voucher_fulfill((select order_id from o2), 'cs_vb_2', 'pi_vb_2', 1, 'sek', 'BB-AAAA-AAAA', now()) $$,
  'P0001', null, 'fel belopp ger ett synligt fel');
select throws_ok(
  $$ select * from private.voucher_fulfill((select order_id from o2), 'cs_annan', 'pi_vb_2', 8000, 'clp', 'BB-AAAA-AAAA', now()) $$,
  'P0001', null, 'fel session ger ett synligt fel');
select is(
  (select created from private.voucher_fulfill((select order_id from o2), 'cs_vb_2', 'pi_vb_2', 8000, 'clp', 'BB-7K2Q-94MZ', now())),
  true, 'betald order ger ett värdebevis');
select is(
  (select created from private.voucher_fulfill((select order_id from o2), 'cs_vb_2', 'pi_vb_2', 8000, 'clp', 'BB-ZZZZ-ZZZZ', now())),
  false, 'samma händelse två gånger ger inget nytt värdebevis');
select is(
  (select count(*)::int from public.message_outbox where template = 'valeComprado'
     and payload->>'voucherId' = (select id::text from public.vouchers where code = 'BB-7K2Q-94MZ')),
  1, 'kvittomejlet köas en gång (outbox)');

-- 15. Giltigt minst 12 månader, sista sekunden på dagen.
select ok(
  (select expires_at >= purchased_at + interval '12 months' from public.vouchers where code = 'BB-7K2Q-94MZ'),
  'giltigt minst 12 månader');

-- 16-21. RLS: köparen ser sitt, andra köpare och företag B ser inget; ägaren A
-- ser företagets värdebevis men aldrig koden.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-6900-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.vouchers), 1, 'köparen ser sitt värdebevis');
select is((select code from private.my_vouchers() limit 1), 'BB-7K2Q-94MZ', 'köparen ser koden via my_vouchers');
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-6900-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.vouchers), 0, 'en annan köpare ser inget');
select is((select count(*)::int from private.my_vouchers()), 0, 'my_vouchers ger bara egna');
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.vouchers), 0, 'ägaren B ser inte A:s värdebevis');
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.vouchers where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1, 'ägaren A ser företagets värdebevis');
select throws_ok($$ select code from public.vouchers $$, '42501', null, 'medlemmar ser aldrig koden');
select throws_ok(
  $$ update public.vouchers set status = 'redeemed', redeemed_at = now() $$,
  '42501', null, 'klienten kan inte skriva värdebevis');
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.vouchers $$, '42501', null, 'anon når inte vouchers');
reset role;

-- 25-27. Inlösen vid bokning: nekad/avbokad → tillbaka, genomförd → inlöst.
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-6900-0000-0004-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6900-0000-0000-000000000001', 'aaaaaaaa-6900-0000-0001-000000000001', 'aaaaaaaa-6900-0000-0002-000000000001',
   tstzrange(now() + interval '2 days', now() + interval '2 days 30 minutes', '[)'), tstzrange(now() + interval '2 days', now() + interval '2 days 30 minutes', '[)'), 'requested', 'web', 10000, 10000);
update public.vouchers set status = 'reserved', booking_id = 'aaaaaaaa-6900-0000-0004-000000000001' where code = 'BB-7K2Q-94MZ';
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'declined' where id = 'aaaaaaaa-6900-0000-0004-000000000001';
select is((select status || ':' || coalesce(booking_id::text, '-') from public.vouchers where code = 'BB-7K2Q-94MZ'), 'active:-', 'nekad förfrågan lämnar tillbaka värdebeviset');

insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-6900-0000-0004-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6900-0000-0000-000000000001', 'aaaaaaaa-6900-0000-0001-000000000001', 'aaaaaaaa-6900-0000-0002-000000000001',
   tstzrange(now() - interval '2 hours', now() - interval '90 minutes', '[)'), tstzrange(now() - interval '2 hours', now() - interval '90 minutes', '[)'), 'confirmed', 'web', 10000, 10000);
update public.vouchers set status = 'reserved', booking_id = 'aaaaaaaa-6900-0000-0004-000000000002' where code = 'BB-7K2Q-94MZ';
select throws_ok(
  $$ update public.vouchers set status = 'active' where code = 'BB-7K2Q-94MZ' $$,
  '23514', null, 'ett ledigt värdebevis kan inte ha en bokning');
select is((select redeemed from private.voucher_sweep(now())), 1, 'genomförd bekräftad bokning förbrukar värdebeviset');
select is((select status from public.vouchers where code = 'BB-7K2Q-94MZ'), 'redeemed', 'status redeemed');

-- 28. Ett inlöst värdebevis återbetalas inte i efterhand; en tvist märks.
select is(private.voucher_mark_payment('pi_vb_2', 'refunded', now()), 0, 'inlöst värdebevis ändras inte av återbetalning');
select is(private.voucher_mark_payment('pi_vb_2', 'disputed', now()), 1, 'tvist märks');

-- 30. Utgång: aktivt värdebevis efter giltighetstiden blir utgånget.
update public.vouchers set status = 'active', booking_id = null, redeemed_at = null,
       expires_at = now() - interval '1 minute', purchased_at = now() - interval '13 months'
 where code = 'BB-7K2Q-94MZ';
select is((select expired from private.voucher_sweep(now())), 1, 'utgånget värdebevis sveps');

select * from finish();
rollback;
