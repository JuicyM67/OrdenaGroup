-- INV-3/INV-4: tenant-isolering för `time_off`, plus intervallregler.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.time_off (id, business_id, staff_id, period, kind) values
  ('aaaaaaaa-2500-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', tstzrange('2026-10-05 13:30+00', '2026-10-05 14:30+00', '[)'), 'lunch'),
  ('bbbbbbbb-2500-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', null, tstzrange('2026-10-05 13:30+00', '2026-10-05 14:30+00', '[)'), 'lunch');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s frånvaro, noll av B:s.
select is((select count(*) from public.time_off where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s frånvaro');
select is((select count(*) from public.time_off where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s frånvaro');

-- 2. ownerA kan inte skapa frånvaro i B.
select throws_ok(
  $$ insert into public.time_off (business_id, staff_id, period, kind) values ('bbbbbbbb-0000-0000-0000-000000000002', null, tstzrange('2026-10-06 13:30+00', '2026-10-06 14:30+00', '[)'), 'lunch') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.time_off set note = 'Hackeado' where id = 'bbbbbbbb-2500-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s frånvaro (0 rader)');
with deleted as (
  delete from public.time_off where id = 'bbbbbbbb-2500-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s frånvaro (0 rader)');

reset role;
select is((select note from public.time_off where id = 'bbbbbbbb-2500-0000-0000-000000000001'), null, 'B:s frånvaro är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s rad till B.
select throws_ok(
  $$ update public.time_off set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-2500-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.time_off $$, '42501');
select throws_ok($$ insert into public.time_off (business_id, staff_id, period, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', null, tstzrange('2026-10-07 13:30+00', '2026-10-07 14:30+00', '[)'), 'lunch') $$, '42501');
select throws_ok($$ update public.time_off set note = 'x' where id = 'aaaaaaaa-2500-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.time_off where id = 'aaaaaaaa-2500-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.time_off)::int, 0, 'staffA ser noll frånvaro');
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.time_off)::int, 0, 'vendorA ser noll frånvaro');

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.time_off)::int, 0, 'nomember ser noll frånvaro');

reset role;

-- 8. Tvärtenant-FK: en rad i A kan inte peka på personal i B.
select throws_ok(
  $$ insert into public.time_off (business_id, staff_id, period, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-1000-0000-0000-000000000001', tstzrange('2026-10-08 13:30+00', '2026-10-08 14:30+00', '[)'), 'lunch') $$,
  '23503'
);

-- Tabellspecifikt: tomt intervall och slutet intervall avvisas, staff_id = null accepteras.
select throws_ok(
  $$ insert into public.time_off (business_id, staff_id, period, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', null, tstzrange('2026-10-09 13:30+00', '2026-10-09 13:30+00', '[)'), 'lunch') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.time_off (business_id, staff_id, period, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', null, tstzrange('2026-10-09 13:30+00', '2026-10-09 14:30+00', '[]'), 'lunch') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.time_off (business_id, staff_id, period, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', null, tstzrange('2026-10-09 13:30+00', '2026-10-09 14:30+00', '[)'), 'lunch') $$,
  'staff_id = null (hela företaget) accepteras'
);

select finish();
rollback;
