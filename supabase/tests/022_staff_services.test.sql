-- INV-3/INV-4: tenant-isolering för `staff_services` (junction-tabell).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 35, 12000);
insert into public.staff_services (business_id, staff_id, service_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s rad, noll av B:s.
select is((select count(*) from public.staff_services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s staff_services');
select is((select count(*) from public.staff_services where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s staff_services');

-- 2. ownerA kan inte skapa en rad i B.
select throws_ok(
  $$ insert into public.staff_services (business_id, staff_id, service_id) values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001') on conflict do nothing $$,
  '42501'
);

-- 3. ownerA:s delete på B:s rad påverkar 0 rader (junction-tabellen har ingen update av business_id-relevans utöver delete/insert).
with deleted as (
  delete from public.staff_services where business_id = 'bbbbbbbb-0000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s staff_services (0 rader)');

reset role;
select is((select count(*) from public.staff_services where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 1, 'B:s staff_services är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- qa7: punkt 4 (flytta en egen rad till B).
select throws_ok(
  $$ update public.staff_services set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and staff_id = 'aaaaaaaa-1000-0000-0000-000000000001' and service_id = 'aaaaaaaa-2000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied (inklusive update, qa7).
set local role anon;
select throws_ok($$ select count(*) from public.staff_services $$, '42501');
select throws_ok($$ insert into public.staff_services (business_id, staff_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001') $$, '42501');
select throws_ok($$ update public.staff_services set staff_id = 'bbbbbbbb-1000-0000-0000-000000000001' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.staff_services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.staff_services)::int, 0, 'staffA ser noll staff_services');
select throws_ok(
  $$ insert into public.staff_services (business_id, staff_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001') $$,
  '42501'
);
with deleted as (
  delete from public.staff_services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'staffA kan inte radera en staff_services-rad (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.staff_services)::int, 0, 'vendorA ser noll staff_services');
select throws_ok(
  $$ insert into public.staff_services (business_id, staff_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001') $$,
  '42501'
);

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.staff_services)::int, 0, 'nomember ser noll staff_services');

reset role;

-- 8. Tvärtenant-FK: en rad i A kan inte peka på personal eller tjänst i B.
select throws_ok(
  $$ insert into public.staff_services (business_id, staff_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001') $$,
  '23503'
);
select throws_ok(
  $$ insert into public.staff_services (business_id, staff_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001') $$,
  '23503'
);

select finish();
rollback;
