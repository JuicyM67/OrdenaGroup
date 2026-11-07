-- WP-85 (D-070) · Descubre som företagskatalog: 20261030010000_descubre_negocios.sql
-- (port av SE:s pgTAP 144).
-- 16 kategorier på offers, extra kategorier på businesses (delmängd, ≤ 6),
-- marketplace_hidden bara för servern, business_service_areas med RLS och
-- tenant-isolering (INV-3/INV-4), högst 30 comunas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
\ir _helpers.psql

-- 1. Kategorilistan har exakt de 16 id:na (samma som src/config/marketplace.ts).
select is(
  private.marketplace_category_ids(),
  array['har', 'barberare', 'naglar', 'fransar', 'hudvard', 'skonhet', 'massage',
        'spa', 'halsa', 'holistiskt', 'traning', 'tatuering', 'djur', 'stad',
        'fordon', 'ovrigt']::text[],
  '16 kategorier i samma ordning som konfigurationen'
);

-- 2-3. Standardvärden: listad, inga extra kategorier, inte dold.
select is(
  (select marketplace_listed from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  true, 'marketplace_listed är på som standard');
select is(
  (select marketplace_hidden from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  false, 'marketplace_hidden är av som standard');

-- 4. Ett erbjudande kan ha en ny kategori.
update public.businesses set plan = 'equipo' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-8800-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Limpieza de hogar', 120, 35000);
select lives_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, regular_price_minor, offer_price_minor, currency, category)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8800-0000-0000-000000000001', 'limpieza-a', 'Limpieza', 1, 30000, 'CLP', 'stad') $$,
  'erbjudande i kategorin stad');

-- 5. Okänd kategori nekas fortfarande.
select throws_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, regular_price_minor, offer_price_minor, currency, category)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8800-0000-0000-000000000001', 'x-a', 'X', 1, 30000, 'CLP', 'soldadura') $$,
  '23514');

-- Som ägare A.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 6. Ägaren sparar extra kategorier, granskningstid och "kommer till kunden".
select lives_ok(
  $$ update public.businesses
        set marketplace_extra_categories = array['naglar', 'fransar'],
            marketplace_categories_reviewed_at = now(),
            serves_at_customer = true,
            marketplace_listed = false
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ägaren sparar Descubre-inställningarna');

-- 7-9. Ogiltiga extra kategorier nekas: okänd, dubblett, fler än 6.
select throws_ok(
  $$ update public.businesses set marketplace_extra_categories = array['soldadura']
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514');
select throws_ok(
  $$ update public.businesses set marketplace_extra_categories = array['naglar', 'naglar']
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514');
select throws_ok(
  $$ update public.businesses
        set marketplace_extra_categories = array['naglar', 'fransar', 'spa', 'halsa', 'massage', 'skonhet', 'traning']
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514');

-- 10. Ägaren kan inte ändra plattformens döljning.
select throws_ok(
  $$ update public.businesses set marketplace_hidden = false
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501');

-- 11. Ägaren lägger in comunas för sitt företag.
select lives_ok(
  $$ insert into public.business_service_areas (business_id, area_slug, area_name, sort) values
       ('aaaaaaaa-0000-0000-0000-000000000001', 'nunoa', 'Ñuñoa', 0),
       ('aaaaaaaa-0000-0000-0000-000000000001', 'la-reina', 'La Reina', 1) $$,
  'ägaren lägger in täckta comunas');

-- 12. ... men inte för B.
select throws_ok(
  $$ insert into public.business_service_areas (business_id, area_slug, area_name)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'nunoa', 'Ñuñoa') $$,
  '42501');

-- 13. Ogiltig slug nekas.
select throws_ok(
  $$ insert into public.business_service_areas (business_id, area_slug, area_name)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ñuñoa', 'Ñuñoa') $$,
  '23514');

-- 14. Ägare B ser inte A:s comunas.
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
select is(
  (select count(*) from public.business_service_areas where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  0, 'ägare B ser inte A:s comunas');

-- 15. Personal hos A ser comunas men får inte ändra dem (saknar can_edit_settings).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select is(
  (select count(*) from public.business_service_areas where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  2, 'personal ser företagets comunas');
select throws_ok(
  $$ insert into public.business_service_areas (business_id, area_slug, area_name)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'providencia', 'Providencia') $$,
  '42501');

reset role;

-- 17. Servern kan dölja ett företag.
select lives_ok(
  $$ update public.businesses set marketplace_hidden = true
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'service_role/servern döljer ett testkonto');

-- 18. Högst 30 comunas per företag.
insert into public.business_service_areas (business_id, area_slug, area_name, sort)
select 'aaaaaaaa-0000-0000-0000-000000000001', 'ort-' || g, 'Ort ' || g, g
  from generate_series(1, 28) g;
select throws_ok(
  $$ insert into public.business_service_areas (business_id, area_slug, area_name)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'ort-31', 'Ort 31') $$,
  '23514', 'service_areas_limit');

select * from finish();
rollback;
