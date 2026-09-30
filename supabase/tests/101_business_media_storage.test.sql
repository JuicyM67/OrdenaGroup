-- WP-41 steg 1: bucket-konfiguration och RLS-policyer för Storage-bucketen
-- `business-media` (storage.objects/storage.buckets, utanför `public`-
-- schemat, se 20260929130000_business_profile_media.sql).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
\ir _helpers.psql

-- Storage skyddar mot direkta DELETE (storage.protect_delete(), ett statement-
-- level trigger): utan den här sessionsflaggan avvisas ALLA delete-satser med
-- 42501, oavsett roll och RLS. Sätts en gång för hela transaktionen (`set
-- local`), gäller alla rollbyten nedan.
set local storage.allow_delete_query = 'true';

-- 0. Bucket-konfiguration: publik läsning, mime/storleksgräns.
select is((select public from storage.buckets where id = 'business-media'), true, 'business-media är publik (bucket.public = true)');
select is((select file_size_limit from storage.buckets where id = 'business-media')::bigint, 2097152::bigint, 'business-media tillåter max 2 MiB per fil');
select is(
  (select allowed_mime_types from storage.buckets where id = 'business-media'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'business-media tillåter bara jpeg/png/webp'
);

-- Fixturer: ett objekt i A:s mapp, ett i B:s mapp (postgres förbigår RLS).
insert into storage.objects (bucket_id, name) values
  ('business-media', 'aaaaaaaa-0000-0000-0000-000000000001/portada.jpg'),
  ('business-media', 'bbbbbbbb-0000-0000-0000-000000000002/portada.jpg');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser bara sitt eget objekt.
select is(
  (select count(*) from storage.objects where bucket_id = 'business-media')::int, 1,
  'ownerA ser bara A:s objekt i business-media'
);

-- 2. ownerA kan ladda upp i sin egen mapp.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('business-media', 'aaaaaaaa-0000-0000-0000-000000000001/galeria-1.jpg') $$,
  'ownerA kan ladda upp i sin egen mapp (aaaaaaaa.../...)'
);

-- 3. ownerA kan inte ladda upp i B:s mapp.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('business-media', 'bbbbbbbb-0000-0000-0000-000000000002/intruso.jpg') $$,
  '42501'
);

-- 4. ownerA kan inte ladda upp med ett objektnamn utan giltigt business_id-prefix.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('business-media', 'no-es-un-uuid/x.jpg') $$,
  '42501'
);

-- 5. ownerA:s update/delete på B:s objekt påverkar 0 rader, B oförändrat.
with updated as (
  update storage.objects set metadata = '{"nota":"hackeado"}'::jsonb
  where bucket_id = 'business-media' and name = 'bbbbbbbb-0000-0000-0000-000000000002/portada.jpg'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s objekt (0 rader)');
with deleted as (
  delete from storage.objects
  where bucket_id = 'business-media' and name = 'bbbbbbbb-0000-0000-0000-000000000002/portada.jpg'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s objekt (0 rader)');

reset role;
select is(
  (select metadata from storage.objects where bucket_id = 'business-media' and name = 'bbbbbbbb-0000-0000-0000-000000000002/portada.jpg'),
  null,
  'B:s objekt är oförändrat'
);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 6. ownerA kan uppdatera sitt eget objekt.
select lives_ok(
  $$ update storage.objects set metadata = '{"nota":"ok"}'::jsonb where bucket_id = 'business-media' and name = 'aaaaaaaa-0000-0000-0000-000000000001/portada.jpg' $$,
  'ownerA kan uppdatera sitt eget objekt'
);

-- 7. anon: läsning ger noll rader (RLS filtrerar, ingen anon-policy finns),
-- skrivning ger fel/0 rader precis som för de andra rollerna.
set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'business-media')::int, 0, 'anon ser noll objekt i business-media');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('business-media', 'aaaaaaaa-0000-0000-0000-000000000001/anon.jpg') $$,
  '42501'
);
with updated as (
  update storage.objects set metadata = '{"nota":"anon"}'::jsonb
  where bucket_id = 'business-media' and name = 'aaaaaaaa-0000-0000-0000-000000000001/portada.jpg'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'anon kan inte uppdatera ett objekt (0 rader)');
with deleted as (
  delete from storage.objects
  where bucket_id = 'business-media' and name = 'aaaaaaaa-0000-0000-0000-000000000001/portada.jpg'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'anon kan inte radera ett objekt (0 rader)');

-- 8. staffA ser noll objekt (SELECT kräver can_edit_settings, WP-46
-- uppföljning 2), men KAN ladda upp i sitt eget företags mapp (INSERT är
-- bredare: alla medlemmar, owner+staff, så att personal kan ladda upp sitt
-- eget foto — se 20260930170100_business_social_links_and_staff_self_profile.sql).
-- vendorA/nomember oförändrade: ser inget och kan inte skriva.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from storage.objects where bucket_id = 'business-media')::int, 0, 'staffA ser noll objekt (ingen can_edit_settings)');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('business-media', 'aaaaaaaa-0000-0000-0000-000000000001/staff.jpg') $$,
  'staffA kan ladda upp i sitt eget företags mapp'
);

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where bucket_id = 'business-media')::int, 0, 'vendorA ser noll objekt');

select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where bucket_id = 'business-media')::int, 0, 'nomember ser noll objekt');

reset role;

select finish();
rollback;
