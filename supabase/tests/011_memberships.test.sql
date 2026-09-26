-- INV-3/INV-4: tenant-isolering för `memberships`, plus skydd av sista owner.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
\ir _helpers.psql

-- Fixturer för tvärtenant-FK-testet (staff i A och B).
insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');

-- 1. ownerA ser A:s tre medlemmar, noll av B:s.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 3,
  'ownerA ser A:s tre medlemskap'
);
select is(
  (select count(*) from public.memberships where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0,
  'ownerA ser noll av B:s medlemskap'
);

-- 2. ownerA kan inte lägga till medlemskap i B.
select throws_ok(
  $$ insert into public.memberships (business_id, user_id, role) values ('bbbbbbbb-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'staff') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.memberships set role = 'staff' where business_id = 'bbbbbbbb-0000-0000-0000-000000000002' and user_id = '22222222-2222-2222-2222-222222222222'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s medlemskap (0 rader)');

with deleted as (
  delete from public.memberships where business_id = 'bbbbbbbb-0000-0000-0000-000000000002' and user_id = '22222222-2222-2222-2222-222222222222'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s medlemskap (0 rader)');

reset role;
select is(
  (select role from public.memberships where business_id = 'bbbbbbbb-0000-0000-0000-000000000002' and user_id = '22222222-2222-2222-2222-222222222222'),
  'owner'::public.member_role,
  'B:s medlemskap är oförändrat'
);

-- 4. ownerA kan inte flytta sin egen rad till B.
set local role authenticated;
select throws_ok(
  $$ update public.memberships set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501'
);

-- 5. anon: select, insert, update, delete -> permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.memberships $$, '42501');
select throws_ok(
  $$ insert into public.memberships (business_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'staff') $$,
  '42501'
);
select throws_ok(
  $$ update public.memberships set role = 'owner' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '33333333-3333-3333-3333-333333333333' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '33333333-3333-3333-3333-333333333333' $$,
  '42501'
);

-- 6. staffA och vendorA ser bara sin egen rad.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.memberships)::int, 1, 'staffA ser bara sin egen membership-rad');

-- staffA kan inte uppgradera sig själv till owner.
with updated as (
  update public.memberships set role = 'owner' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '33333333-3333-3333-3333-333333333333'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte uppgradera sig själv (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.memberships)::int, 1, 'vendorA ser bara sin egen membership-rad');

-- 7. Användare utan medlemskap ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.memberships)::int, 0, 'nomember ser noll medlemskap');

reset role;

-- 8. Tvärtenant-FK: en rad i A kan inte peka på staff i B, även som postgres.
select throws_ok(
  $$ update public.memberships set staff_id = 'bbbbbbbb-1000-0000-0000-000000000001' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '33333333-3333-3333-3333-333333333333' $$,
  '23503'
);

-- Sista owner: kan varken tas bort eller degraderas.
select throws_ok(
  $$ delete from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001'
);
select throws_ok(
  $$ update public.memberships set role = 'staff' where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001'
);

-- Med två ägare går det bra.
insert into auth.users (id, email, role, aud) values
  ('66666666-6666-6666-6666-666666666666', 'ownera2@example.com', 'authenticated', 'authenticated');
insert into public.memberships (business_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'owner');

select lives_ok(
  $$ delete from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111' $$,
  'ownerA kan tas bort när det finns en andra owner'
);

select finish();
rollback;
