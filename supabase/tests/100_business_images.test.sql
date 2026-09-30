-- INV-3/INV-4: tenant-isolering för `business_images` (WP-41 steg 1).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);
\ir _helpers.psql

insert into public.business_images (id, business_id, path, sort) values
  ('aaaaaaaa-4100-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/portada.jpg', 1),
  ('bbbbbbbb-4100-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002/portada.jpg', 1);

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s bilder, noll av B:s.
select is((select count(*) from public.business_images where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s bilder');
select is((select count(*) from public.business_images where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s bilder');

-- 2. ownerA kan inte skapa en bildrad i B.
select throws_ok(
  $$ insert into public.business_images (business_id, path) values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002/intruso.jpg') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.business_images set sort = 99 where id = 'bbbbbbbb-4100-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s bild (0 rader)');
with deleted as (
  delete from public.business_images where id = 'bbbbbbbb-4100-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s bild (0 rader)');

reset role;
select is((select sort from public.business_images where id = 'bbbbbbbb-4100-0000-0000-000000000001')::int, 1, 'B:s bild är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s bild till B.
select throws_ok(
  $$ update public.business_images set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-4100-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.business_images $$, '42501');
select throws_ok($$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/anon.jpg') $$, '42501');
select throws_ok($$ update public.business_images set sort = 2 where id = 'aaaaaaaa-4100-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.business_images where id = 'aaaaaaaa-4100-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA/nomember ser noll rader och kan inte skriva. staffA:
-- kräver can_edit_settings (WP-46 uppföljning 2), default false. vendor har
-- fortfarande ingen åtkomst alls (WP-01 fas 1).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.business_images)::int, 0, 'staffA ser noll bilder');
select throws_ok(
  $$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/otro.jpg') $$,
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.business_images)::int, 0, 'vendorA ser noll bilder');
select throws_ok(
  $$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/otro.jpg') $$,
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.business_images)::int, 0, 'nomember ser noll bilder');

reset role;

-- Tabellspecifikt: tomt path avvisas och en rad måste peka in i sitt eget
-- företags prefix (business_images_path_prefix).
select throws_ok(
  $$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', '') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002/no-es-mio.jpg') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/galeria-1.jpg') $$,
  'ett path under det egna företagets prefix är okej'
);
-- Samma path två gånger i samma företag är inte tillåtet (unique (business_id, path)).
select throws_ok(
  $$ insert into public.business_images (business_id, path) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/galeria-1.jpg') $$,
  '23505'
);

select finish();
rollback;
