-- INV-3/INV-4: tenant-isolering för `bookings`. Pengar/tid-invarianterna och
-- INV-1 (no_overlap) testas separat i 041_bookings_no_overlap.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900001111', 'Cliente B');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000);

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s bokning, noll av B:s.
select is((select count(*) from public.bookings where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s bokning');
select is((select count(*) from public.bookings where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s bokningar');

-- 2. ownerA kan inte skapa en bokning i B.
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
             tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.bookings set notes = 'Hackeado' where id = 'bbbbbbbb-4000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s bokning (0 rader)');
with deleted as (
  delete from public.bookings where id = 'bbbbbbbb-4000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s bokning (0 rader)');

reset role;
select is((select notes from public.bookings where id = 'bbbbbbbb-4000-0000-0000-000000000001'), null, 'B:s bokning är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s bokning till B.
select throws_ok(
  $$ update public.bookings set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.bookings $$, '42501');
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-04 10:00+00', '2026-11-04 10:35+00', '[)'), tstzrange('2026-11-04 10:00+00', '2026-11-04 10:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '42501'
);
select throws_ok($$ update public.bookings set notes = 'x' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.bookings where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.bookings)::int, 0, 'staffA ser noll bokningar');
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-06 10:00+00', '2026-11-06 10:35+00', '[)'), tstzrange('2026-11-06 10:00+00', '2026-11-06 10:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '42501'
);
with updated as (
  update public.bookings set notes = 'Hackeado' where id = 'aaaaaaaa-4000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte uppdatera bokningar (0 rader)');
with deleted as (
  delete from public.bookings where id = 'aaaaaaaa-4000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'staffA kan inte radera bokningar (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.bookings)::int, 0, 'vendorA ser noll bokningar');
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-06 11:00+00', '2026-11-06 11:35+00', '[)'), tstzrange('2026-11-06 11:00+00', '2026-11-06 11:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '42501'
);

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.bookings)::int, 0, 'nomember ser noll bokningar');

reset role;

-- 8. Tvärtenant-FK: en rad i A kan inte peka på personal, tjänst eller kund i B.
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-05 10:00+00', '2026-11-05 10:35+00', '[)'), tstzrange('2026-11-05 10:00+00', '2026-11-05 10:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-05 11:00+00', '2026-11-05 11:35+00', '[)'), tstzrange('2026-11-05 11:00+00', '2026-11-05 11:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
             tstzrange('2026-11-05 12:00+00', '2026-11-05 12:35+00', '[)'), tstzrange('2026-11-05 12:00+00', '2026-11-05 12:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23503'
);

-- K1: manage_token_hash måste vara exakt 32 byte (SHA-256) om den är satt.
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, manage_token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-06 09:00+00', '2026-11-06 09:35+00', '[)'), tstzrange('2026-11-06 09:00+00', '2026-11-06 09:35+00', '[)'), 'confirmed', 'manual', 12000, '\x1234') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, manage_token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-06 09:40+00', '2026-11-06 10:15+00', '[)'), tstzrange('2026-11-06 09:40+00', '2026-11-06 10:15+00', '[)'), 'confirmed', 'manual', 12000, extensions.digest('token', 'sha256')) $$,
  'en 32-byte hash (SHA-256) accepteras'
);

-- K2: en bokning måste ha ett bestämt slut, inte ett obegränsat intervall.
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-06 10:20+00', null, '[)'), tstzrange('2026-11-06 10:20+00', null, '[)'), 'confirmed', 'manual', 12000) $$,
  '23514'
);

select finish();
rollback;
