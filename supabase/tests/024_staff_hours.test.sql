-- INV-3/INV-4: tenant-isolering för `staff_hours`, plus överlappning och tvärtenant-FK.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.staff_hours (id, business_id, staff_id, weekday, start_time, end_time) values
  ('aaaaaaaa-2400-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 1, '10:00', '19:00'),
  ('bbbbbbbb-2400-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 1, '10:00', '19:00');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s personaltider, noll av B:s.
select is((select count(*) from public.staff_hours where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s personaltider');
select is((select count(*) from public.staff_hours where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s personaltider');

-- 2. ownerA kan inte skapa personaltider i B.
select throws_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 2, '10:00', '19:00') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.staff_hours set end_time = '20:00' where id = 'bbbbbbbb-2400-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s personaltider (0 rader)');
with deleted as (
  delete from public.staff_hours where id = 'bbbbbbbb-2400-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s personaltider (0 rader)');

reset role;
select is((select end_time::text from public.staff_hours where id = 'bbbbbbbb-2400-0000-0000-000000000001'), '19:00:00', 'B:s personaltider är oförändrade');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s rad till B.
select throws_ok(
  $$ update public.staff_hours set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-2400-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.staff_hours $$, '42501');
select throws_ok($$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 3, '10:00', '19:00') $$, '42501');
select throws_ok($$ update public.staff_hours set end_time = '18:00' where id = 'aaaaaaaa-2400-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.staff_hours where id = 'aaaaaaaa-2400-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.staff_hours)::int, 0, 'staffA ser noll personaltider');
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.staff_hours)::int, 0, 'vendorA ser noll personaltider');

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.staff_hours)::int, 0, 'nomember ser noll personaltider');

reset role;

-- 8. Tvärtenant-FK: en rad i A kan inte peka på personal i B.
select throws_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-1000-0000-0000-000000000001', 4, '10:00', '19:00') $$,
  '23503'
);

-- Tabellspecifikt: weekday, start<end och överlapp (samma mönster som business_hours).
select throws_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 0, '10:00', '19:00') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 8, '10:00', '19:00') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 2, '10:00', '10:00') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 1, '12:00', '15:00') $$,
  '23P01'
);
select lives_ok(
  $$ insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 3, '10:00', '13:30'), ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 3, '14:30', '19:00') $$,
  'två icke överlappande intervall samma dag för samma profesional är tillåtna'
);

select finish();
rollback;
