-- INV-3/INV-4: tenant-isolering för `service_categories` (WP-40 steg 1, D-031).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);
\ir _helpers.psql

insert into public.service_categories (id, business_id, name, sort) values
  ('aaaaaaaa-2900-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dama', 1),
  ('bbbbbbbb-2900-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Dama', 1);

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s kategorier, noll av B:s.
select is((select count(*) from public.service_categories where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s kategorier');
select is((select count(*) from public.service_categories where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s kategorier');

-- 2. ownerA kan inte skapa en kategori i B.
select throws_ok(
  $$ insert into public.service_categories (business_id, name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Intruso') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.service_categories set name = 'Hackeado' where id = 'bbbbbbbb-2900-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s kategori (0 rader)');
with deleted as (
  delete from public.service_categories where id = 'bbbbbbbb-2900-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s kategori (0 rader)');

reset role;
select is((select name from public.service_categories where id = 'bbbbbbbb-2900-0000-0000-000000000001'), 'Dama', 'B:s kategori är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s kategori till B.
select throws_ok(
  $$ update public.service_categories set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-2900-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.service_categories $$, '42501');
select throws_ok($$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Anon') $$, '42501');
select throws_ok($$ update public.service_categories set name = 'x' where id = 'aaaaaaaa-2900-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.service_categories where id = 'aaaaaaaa-2900-0000-0000-000000000001' $$, '42501');

-- 6. staffA ser nu A:s kategorier (WP-46 steg 2: läsning för owner+staff),
-- men kan fortfarande inte skriva (ingen can_edit_catalog). vendorA/nomember
-- oförändrade (0) — staff/vendor-gränsen i WP-01 fas 1 gäller fortfarande
-- för vendor (se 20260927100200_catalog_and_hours.sql).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.service_categories)::int, 1, 'staffA ser A:s kategorier (bara läsning)');
select throws_ok(
  $$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Otro') $$,
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.service_categories)::int, 0, 'vendorA ser noll kategorier');
select throws_ok(
  $$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Otro') $$,
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.service_categories)::int, 0, 'nomember ser noll kategorier');

reset role;

-- Tabellspecifikt: tomt/blankt namn avvisas, namn är unikt per företag.
select throws_ok(
  $$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '   ') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Dama') $$,
  '23505'
);
-- Samma namn i ett ANNAT företag är okej (redan bevisat av fixturen ovan,
-- båda A och B har en kategori som heter 'Dama').
select lives_ok(
  $$ insert into public.service_categories (business_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Herrero') $$,
  'ett nytt, unikt namn i samma företag är okej'
);

select finish();
rollback;
