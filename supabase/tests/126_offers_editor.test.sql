-- WP-70 (D-056) · Erbjudanderedigeraren: bucket `offer-images`, prisvakten
-- (`service_price_history`, lägsta pris 30 dagar, höjningsspärr), planspärren
-- `offers` och redigeringsrättigheter (katalog = utkast, bara ägaren publicerar).
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);
\ir _helpers.psql
set local storage.allow_delete_query = 'true';

-- A har Team (erbjudanden ingår), B har Gratis.
update public.businesses set plan = 'equipo' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-7000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('aaaaaaaa-7000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Barba', 30, 8000),
  ('bbbbbbbb-7000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte B', 30, 12000);

-- 1-4. Bucket: publik, 5 MiB, bara jpeg/png/webp.
select is((select public from storage.buckets where id = 'offer-images'), true, 'offer-images är publik');
select is((select file_size_limit from storage.buckets where id = 'offer-images')::bigint, 5242880::bigint, 'max 5 MiB');
select is(
  (select allowed_mime_types from storage.buckets where id = 'offer-images'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'bara jpeg/png/webp'
);
select is(private.plan_has_feature('free', 'offers'), false, 'Gratis: inga erbjudanden');

-- 5-7. ownerA skriver i sitt eget prefix, inte i B:s eller utan uuid-prefix.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-images', 'aaaaaaaa-0000-0000-0000-000000000001/oferta.jpg') $$,
  'ownerA laddar upp i sitt prefix'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-images', 'bbbbbbbb-0000-0000-0000-000000000002/intruso.jpg') $$,
  '42501'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-images', 'no-uuid/x.jpg') $$,
  '42501'
);
reset role;

-- 8-9. staffA utan katalogrätt: ser inget och kan inte ladda upp.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from storage.objects where bucket_id = 'offer-images')::int, 0, 'staffA utan katalog ser inga objekt');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-images', 'aaaaaaaa-0000-0000-0000-000000000001/staff.jpg') $$,
  '42501'
);
reset role;

-- 10. anon ser inga objekt (publik läsning går via bucket.public, inte RLS).
set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'offer-images')::int, 0, 'anon ser inga objekt');
reset role;

-- 11-12. Prishistorik: en rad per ny tjänst; ownerA ser inte B:s historik.
select is(
  (select count(*) from public.service_price_history where service_id = 'aaaaaaaa-7000-0000-0000-000000000001')::int,
  1, 'ny tjänst ⇒ en historikrad'
);
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.service_price_history where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int,
  0, 'ownerA ser inte B:s prishistorik'
);
-- 13. Klienten skriver aldrig historiken själv.
select throws_ok(
  $$ insert into public.service_price_history (business_id, service_id, price_minor)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000001', 1) $$,
  '42501'
);

-- 14-15. ownerA skapar ett utkast och publicerar det (Team).
select lives_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, offer_price_minor, category)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000001', 'corte-wp70', 'Corte', 7000, 'har') $$,
  'ownerA crea un borrador'
);
select lives_ok(
  $$ update public.offers set status = 'published' where slug = 'corte-wp70' $$,
  'ownerA publica'
);

-- 16-17. Prisvakten: höjning nekas medan erbjudandet är publicerat, sänkning går.
select throws_ok(
  $$ update public.services set price_clp = 11000 where id = 'aaaaaaaa-7000-0000-0000-000000000001' $$,
  '23514', 'services: priset kan inte höjas under eller 30 dagar efter ett erbjudande'
);
select lives_ok(
  $$ update public.services set price_clp = 9500 where id = 'aaaaaaaa-7000-0000-0000-000000000001' $$,
  'sänkt pris går'
);
-- 18. Lägsta pris senaste 30 dagarna = 9 500.
select is(
  private.service_lowest_price_30d('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000001'),
  9500, 'lägsta pris 30 dagar'
);

-- 19-20. Pausat i dag ⇒ fortfarande spärrat; last_unpublished_at sätts.
select lives_ok(
  $$ update public.offers set status = 'paused' where slug = 'corte-wp70' $$,
  'ownerA pausa'
);
select throws_ok(
  $$ update public.services set price_clp = 9900 where id = 'aaaaaaaa-7000-0000-0000-000000000001' $$,
  '23514'
);
reset role;

-- 21. Pausat för 31 dagar sedan ⇒ höjningen tillåts.
update public.offers set last_unpublished_at = now() - interval '31 days' where slug = 'corte-wp70';
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ update public.services set price_clp = 12000 where id = 'aaaaaaaa-7000-0000-0000-000000000001' $$,
  'höjning 31 dagar efter erbjudandet går'
);
-- 22. …men då kan erbjudandet inte publiceras igen förrän priset gällt i 30 dagar.
select throws_ok(
  $$ update public.offers set status = 'published' where slug = 'corte-wp70' $$,
  '23514', 'offers: tjänstens pris har höjts senaste 30 dagarna'
);
reset role;

-- 23-24. Pris som gällt längre än 30 dagar räknas som det som gällde vid fönstrets start.
delete from public.service_price_history where service_id = 'aaaaaaaa-7000-0000-0000-000000000002';
insert into public.service_price_history (business_id, service_id, price_minor, valid_from) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002', 6000, now() - interval '90 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002', 8000, now() - interval '40 days');
select is(
  private.service_lowest_price_30d('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002'),
  8000, 'priset före fönstret räknas, äldre priser inte'
);
insert into public.service_price_history (business_id, service_id, price_minor, valid_from) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002', 7000, now() - interval '10 days');
select is(
  private.service_lowest_price_30d('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002'),
  7000, 'lägre pris inom fönstret vinner'
);

-- 25. Ett utkast på tjänsten spärrar inte en höjning (bara publicerat/nyss avslutat).
insert into public.offers (business_id, service_id, slug, title, regular_price_minor, offer_price_minor, currency, category)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002', 'barba-wp70', 'Barba', 1, 5000, 'CLP', 'har');
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ update public.services set price_clp = 8500 where id = 'aaaaaaaa-7000-0000-0000-000000000002' $$,
  'utkast spärrar inte höjning'
);
reset role;

-- 26. Planspärren: ownerB (Gratis) kan inte skapa erbjudanden.
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, offer_price_minor, category)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-7000-0000-0000-000000000001', 'b-wp70', 'B', 100, 'har') $$,
  '42501', 'offers: planen saknar erbjudanden'
);
reset role;

-- 27-30. Personal med katalogrätt: laddar upp bild, skapar och redigerar utkast,
-- men publicerar inte.
update public.memberships set can_edit_catalog = true
 where user_id = '33333333-3333-3333-3333-333333333333';
update public.offers set last_unpublished_at = null, status = 'draft' where slug = 'barba-wp70';
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-images', 'aaaaaaaa-0000-0000-0000-000000000001/staff-ok.jpg') $$,
  'staffA con catálogo sube imagen'
);
select lives_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, offer_price_minor, category)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000002', 'staff-wp70', 'Staff', 4000, 'har') $$,
  'staffA con catálogo crea un borrador'
);
select lives_ok(
  $$ update public.offers set title = 'Barba editada' where slug = 'staff-wp70' $$,
  'staffA con catálogo edita el borrador'
);
select throws_ok(
  $$ update public.offers set status = 'published' where slug = 'staff-wp70' $$,
  '42501', 'offers: bara ägaren publicerar'
);
reset role;

-- 31-32. Säkerhetsgranskning #111 B1: tjänsten kan inte bytas på ett erbjudande
-- som publicerats (prisvakten kringgås annars). corte-wp70 publicerades i 15.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ update public.offers set service_id = 'aaaaaaaa-7000-0000-0000-000000000002' where slug = 'corte-wp70' $$,
  '23514', 'offers: tjänsten kan inte bytas på ett publicerat erbjudande'
);
select lives_ok(
  $$ update public.offers set service_id = 'aaaaaaaa-7000-0000-0000-000000000001' where slug = 'staff-wp70' $$,
  'utkast kan byta tjänst'
);

-- 33-35. S2/S3: bara relativ sökväg i egen mapp; ingen full URL, ingen annan mapp.
select lives_ok(
  $$ update public.offers set image_url = 'offer-images/aaaaaaaa-0000-0000-0000-000000000001/aaaaaaaa-1111-2222-3333-444444444444.jpg' where slug = 'staff-wp70' $$,
  'relativ sökväg i egen mapp'
);
select throws_ok(
  $$ update public.offers set image_url = 'offer-images/bbbbbbbb-0000-0000-0000-000000000002/aaaaaaaa-1111-2222-3333-444444444444.jpg' where slug = 'barba-wp70' $$,
  '23514'
);
select throws_ok(
  $$ update public.offers set image_url = 'https://abc.supabase.co/storage/v1/object/public/offer-images/aaaaaaaa-0000-0000-0000-000000000001/aaaaaaaa-1111-2222-3333-444444444444.jpg' where slug = 'barba-wp70' $$,
  '23514'
);
-- 36. K4: samma bild på två erbjudanden nekas.
select throws_ok(
  $$ update public.offers set image_url = 'offer-images/aaaaaaaa-0000-0000-0000-000000000001/aaaaaaaa-1111-2222-3333-444444444444.jpg' where slug = 'barba-wp70' $$,
  '23505'
);
reset role;

-- 37. S1: personal med katalogrätt kan inte radera bilder (bara ägaren).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
delete from storage.objects where bucket_id = 'offer-images' and name = 'aaaaaaaa-0000-0000-0000-000000000001/staff-ok.jpg';
reset role;
select is(
  (select count(*) from storage.objects where bucket_id = 'offer-images' and name = 'aaaaaaaa-0000-0000-0000-000000000001/staff-ok.jpg')::int,
  1, 'staffA raderar inte bilder'
);

-- 38. K1: företag utan planfunktionen kan inte ladda upp (ownerB, Gratis).
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-images', 'bbbbbbbb-0000-0000-0000-000000000002/gratis.jpg') $$,
  '42501'
);
reset role;

select * from finish();
rollback;
