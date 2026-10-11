-- WP-67 · Kundkonton (D-054) · INV-3: konsumentisolering.
-- - En konsument (utan membership) ser bara sitt eget konto/länkar/favoriter.
-- - Konsumenten får 0 rader från tenant-tabellerna (customers, bookings,
--   reviews, payments) — rollseparationen bygger på att `is_member` inte ändras.
-- - link_customer_rows: bara bekräftad e-post, skiftlägesokänsligt, inte
--   anonymiserade kunder, idempotent, två företag ⇒ två länkar.
-- - my_bookings visar inte `notes`, my_booking_ref nekar andras bokningar.
-- - delete_my_account: konsument raderas helt; ägare som också är konsument
--   behåller auth-användaren (och företaget).
-- - anon: inga grants.
-- - Säkerhetsgranskning B1: synlighet per BOKNING (contact_email /
--   account_user_id). Angripare som delar telefon med offret ser 0 av
--   offrets bokningar; export utan notes/andras data; favoriter; adminspår
--   behåller auth-användaren; anonymisering tar bort kopplingar.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);
\ir _helpers.psql

-- Konsumenter: c1 (bekräftad e-post), c2 (annan person), c3 (obekräftad).
insert into auth.users (id, email, role, aud, email_confirmed_at) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'Elin@Example.com', 'authenticated', 'authenticated', now()),
  ('c2c2c2c2-0000-0000-0000-000000000002', 'other@example.com', 'authenticated', 'authenticated', now()),
  ('c3c3c3c3-0000-0000-0000-000000000003', 'unconfirmed@example.com', 'authenticated', 'authenticated', null);
-- ownerA (från _helpers) bekräftar sin e-post för ägare+konsument-fallet.
update auth.users set email_confirmed_at = now() where id = '11111111-1111-1111-1111-111111111111';

insert into public.customers (id, business_id, phone_e164, name, email, notes) values
  ('c1000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '+56911110001', 'Elin K', 'elin@example.com', 'hemlig anteckning'),
  ('c1000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', '+56911110002', 'Elin K', 'ELIN@example.com', null),
  ('c3000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '+56911110003', 'Unconf', 'unconfirmed@example.com', null),
  ('c2000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '+56911110004', 'Other', 'other@example.com', null),
  ('0a000000-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000002', '+56911110005', 'Owner A som kund', 'ownera@example.com', null);
-- Anonymiserad kundrad med c1:s e-post kopplas aldrig.
insert into public.customers (id, business_id, phone_e164, name, email, anonymized_at) values
  ('c1000000-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000001', null, null, 'elin@example.com', now());

insert into public.staff (id, business_id, name, color) values
  ('5aaa0000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ida', 'staff-1'),
  ('5bbb0000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Jonas', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('5e0a0000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('5e0b0000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Masaje', 60, 20000);
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, notes, contact_email) values
  ('b1000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '5aaa0000-0000-0000-0000-000000000001', '5e0a0000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-00000000000a',
   tstzrange('2030-01-10 10:00+00', '2030-01-10 10:30+00', '[)'), tstzrange('2030-01-10 10:00+00', '2030-01-10 10:30+00', '[)'), 'confirmed', 'manual', 10000, 'nota interna', 'elin@example.com'),
  ('b1000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', '5bbb0000-0000-0000-0000-000000000001', '5e0b0000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-00000000000b',
   tstzrange('2026-09-01 10:00+00', '2026-09-01 11:00+00', '[)'), tstzrange('2026-09-01 10:00+00', '2026-09-01 11:00+00', '[)'), 'completed', 'manual', 20000, null, 'ELIN@example.com'),
  ('b2000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '5aaa0000-0000-0000-0000-000000000001', '5e0a0000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-00000000000a',
   tstzrange('2030-01-11 10:00+00', '2030-01-11 10:30+00', '[)'), tstzrange('2030-01-11 10:00+00', '2030-01-11 10:30+00', '[)'), 'confirmed', 'manual', 10000, null, 'other@example.com');

-- 1-6. c1 (konsument utan membership)
select set_config('request.jwt.claims', json_build_object('sub', 'c1c1c1c1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok($$ select private.ensure_customer_account('Elin K') $$, 'c1 skapar sitt konto');
select is((select private.link_customer_rows()), 2, 'c1 kopplas till två företag (skiftlägesokänsligt), inte den anonymiserade raden');
select is((select private.link_customer_rows()), 0, 'link_customer_rows är idempotent');
select is((select count(*) from public.customer_account_links)::int, 2, 'c1 ser sina två länkar');
select is((select count(*) from private.my_bookings())::int, 2, 'c1 ser sina två bokningar via my_bookings');
select is((select count(*) from private.my_booking_ref('b2000000-0000-0000-0000-00000000000a'))::int, 0, 'c1 når inte en annan kunds bokning');

-- 7-11. Rollseparation: 0 rader från tenant-tabeller
select is((select count(*) from public.customers)::int, 0, 'konsument ser 0 customers');
select is((select count(*) from public.bookings)::int, 0, 'konsument ser 0 bookings');
select is((select count(*) from public.reviews)::int, 0, 'konsument ser 0 reviews');
select is((select count(*) from public.payments)::int, 0, 'konsument ser 0 payments');
select is((select count(*) from public.staff)::int, 0, 'konsument ser 0 staff');

-- 12-16. Skrivskydd
select throws_ok($$ insert into public.customer_account_links (user_id, business_id, customer_id, linked_via)
  values ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-00000000000a', 'email') $$, '42501');
select throws_ok($$ update public.customer_accounts set marketing_consent_at = now() $$, '42501');
select lives_ok($$ update public.customer_accounts set display_name = 'Elin' $$, 'c1 kan ändra sitt visningsnamn');
select lives_ok($$ insert into public.favorites (user_id, business_id) values ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001') $$, 'c1 sparar en favorit');
select throws_ok($$ insert into public.favorites (user_id, business_id) values ('c2c2c2c2-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001') $$, '42501');

-- 17-18. Samtycke loggas, loggen är oföränderlig
select lives_ok($$ select private.set_account_marketing_consent(true, '2026-10') $$, 'c1 ger samtycke');
select is((select count(*) from public.account_consent_events)::int, 1, 'samtycket loggas');

-- 19. my_bookings exponerar ingen notes-kolumn
reset role;
select ok(
  (select position('notes' in pg_get_function_result('private.my_bookings()'::regprocedure)) = 0),
  'my_bookings returnerar aldrig notes'
);

-- 21-23. c2 ser inte c1:s data
select set_config('request.jwt.claims', json_build_object('sub', 'c2c2c2c2-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.customer_accounts)::int, 0, 'c2 ser inte c1:s konto');
select is((select count(*) from public.favorites)::int, 0, 'c2 ser inte c1:s favoriter');
select is((select count(*) from public.account_consent_events)::int, 0, 'c2 ser inte c1:s samtycken');

-- 24. c3: obekräftad e-post kopplas inte
select set_config('request.jwt.claims', json_build_object('sub', 'c3c3c3c3-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select private.ensure_customer_account(null);
select is((select private.link_customer_rows()), 0, 'obekräftad e-post kopplas inte');

-- 25-26. anon: inga grants
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.customer_accounts $$, '42501');
select throws_ok($$ select private.my_bookings() $$, '42501');
reset role;

-- 27-28. Ägare som också är konsument: företagsdata bara via membership,
-- radering behåller auth-användaren.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select private.ensure_customer_account('Owner A');
select private.link_customer_rows();
select is((select count(*) from public.customers where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ägaren A ser inte B:s kunder trots länk');
select is((select private.delete_my_account()), false, 'ägare+konsument: auth-användaren behålls');
reset role;

-- 30-35. B1: angripare (atk) bokar först med offrets (vic) telefon + egen
-- e-post; offret bokar sedan med samma telefon → samma kundrad (e-post =
-- angriparens). Angriparen får ALDRIG se offrets bokning.
insert into auth.users (id, email, role, aud, email_confirmed_at) values
  ('a7a7a7a7-0000-0000-0000-000000000001', 'attacker@example.com', 'authenticated', 'authenticated', now()),
  ('d1d1d1d1-0000-0000-0000-000000000001', 'victim@example.com', 'authenticated', 'authenticated', now());
insert into public.customers (id, business_id, phone_e164, name, email) values
  ('cccc0000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '+56922220001', 'Atk', 'attacker@example.com');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, contact_email) values
  ('bbbb0000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', '5aaa0000-0000-0000-0000-000000000001', '5e0a0000-0000-0000-0000-000000000001', 'cccc0000-0000-0000-0000-00000000000a',
   tstzrange('2030-02-01 10:00+00', '2030-02-01 10:30+00', '[)'), tstzrange('2030-02-01 10:00+00', '2030-02-01 10:30+00', '[)'), 'confirmed', 'web', 10000, 'attacker@example.com'),
  ('bbbb0000-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-000000000001', '5aaa0000-0000-0000-0000-000000000001', '5e0a0000-0000-0000-0000-000000000001', 'cccc0000-0000-0000-0000-00000000000a',
   tstzrange('2030-02-02 10:00+00', '2030-02-02 10:30+00', '[)'), tstzrange('2030-02-02 10:00+00', '2030-02-02 10:30+00', '[)'), 'confirmed', 'web', 10000, 'victim@example.com');

select set_config('request.jwt.claims', json_build_object('sub', 'a7a7a7a7-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select private.ensure_customer_account(null);
select private.link_customer_rows();
select is((select count(*) from private.my_bookings() where booking_id = 'bbbb0000-0000-0000-0000-0000000000d1')::int, 0, 'B1: angriparen ser inte offrets bokning');
select is((select count(*) from private.my_booking_ref('bbbb0000-0000-0000-0000-0000000000d1'))::int, 0, 'B1: angriparen kan inte avboka/recensera offrets bokning');
select is((select count(*) from private.my_bookings())::int, 1, 'B1: angriparen ser bara sin egen bokning');
select ok(position('bbbb0000-0000-0000-0000-0000000000d1' in private.export_my_account()::text) = 0
  and position('2030-02-02' in private.export_my_account()::text) = 0, 'B1: exporten innehåller inte offrets bokning');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'd1d1d1d1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select private.ensure_customer_account(null);
select private.link_customer_rows();
select is((select count(*) from private.my_bookings())::int, 1, 'B1: offret ser sin egen bokning (koppling via contact_email)');
select is((select booking_id from private.my_bookings()), 'bbbb0000-0000-0000-0000-0000000000d1'::uuid, 'B1: offret ser inte angriparens bokning');
reset role;

-- 36-37. Export utan notes; favoriter via my_favorites (c1 före radering)
select set_config('request.jwt.claims', json_build_object('sub', 'c1c1c1c1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(position('nota interna' in private.export_my_account()::text) = 0, 'exporten innehåller aldrig notes');
select is((select count(*) from private.my_favorites())::int, 1, 'my_favorites visar c1:s favorit');
reset role;

-- 38. Bokning gjord inloggad (claim) syns även utan matchande e-post
select set_config('request.jwt.claims', json_build_object('sub', 'c2c2c2c2-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select private.ensure_customer_account(null);
reset role;
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, contact_email) values
  ('bbbb0000-0000-0000-0000-0000000000c2', 'bbbbbbbb-0000-0000-0000-000000000002', '5bbb0000-0000-0000-0000-000000000001', '5e0b0000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-00000000000b',
   tstzrange('2030-03-01 10:00+00', '2030-03-01 11:00+00', '[)'), tstzrange('2030-03-01 10:00+00', '2030-03-01 11:00+00', '[)'), 'confirmed', 'web', 20000, null);
set local role authenticated;
select is((select private.claim_booking('bbbbbbbb-0000-0000-0000-000000000002', 'bbbb0000-0000-0000-0000-0000000000c2')), true, 'claim_booking markerar en nyss gjord bokning');
reset role;

-- 39. Anonymiserad kundrad → kopplingarna försvinner
update public.customers set anonymized_at = now(), name = null, phone_e164 = null where id = 'cccc0000-0000-0000-0000-00000000000a';
select is((select count(*) from public.customer_account_links where customer_id = 'cccc0000-0000-0000-0000-00000000000a')::int, 0, 'anonymisering tar bort kontokopplingar');

-- 40. Plattformsadmin: bara konsumentdelen raderas
insert into private.platform_admins (user_id) values ('d1d1d1d1-0000-0000-0000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'd1d1d1d1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select private.delete_my_account()), false, 'plattformsadmin: auth-användaren behålls');
reset role;

-- 39-40. Konsumentens radering
select set_config('request.jwt.claims', json_build_object('sub', 'c1c1c1c1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select private.delete_my_account()), true, 'c1 raderas helt');
reset role;
select ok(
  not exists (select 1 from auth.users where id = 'c1c1c1c1-0000-0000-0000-000000000001')
  and not exists (select 1 from public.customer_account_links where user_id = 'c1c1c1c1-0000-0000-0000-000000000001')
  and exists (select 1 from public.customers where id = 'c1000000-0000-0000-0000-00000000000a')
  and (select count(*) from public.account_consent_events where user_id is null and created_at = now()) = 1,
  'radering: konto och länkar borta, företagets kundrad kvar, samtyckesloggen anonymiserad'
);

select * from finish();
rollback;
