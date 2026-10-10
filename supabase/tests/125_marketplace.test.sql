-- WP-68 (D-055) · Marknadsplats: `offers` + geodata på `businesses`.
-- INV-3: RLS, inga anon-grants. INV-4: tenant-isolering. Ordinarie pris och
-- valuta sätts av servern (trigger), bara ägaren publicerar, medlemmar kan
-- inte skriva koordinater, `distance_km` räknar rätt.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
\ir _helpers.psql

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-6800-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('bbbbbbbb-6800-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte B', 30, 12000);

insert into public.offers (id, business_id, service_id, slug, title, regular_price_minor, offer_price_minor, currency, category, status) values
  ('aaaaaaaa-6800-0000-0009-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6800-0000-0000-000000000001', 'corte-a', 'Corte A', 1, 8000, 'SEK', 'har', 'published'),
  ('bbbbbbbb-6800-0000-0009-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-6800-0000-0000-000000000001', 'corte-b', 'Corte B', 1, 9000, 'SEK', 'har', 'draft');

-- 1-2. Servern bestämmer ordinarie pris (= tjänstens pris) och valuta (företagets marknad).
select is((select regular_price_minor from public.offers where slug = 'corte-a'), 10000, 'ordinarie pris = tjänstens pris');
select is((select currency from public.offers where slug = 'corte-a'), 'CLP', 'valuta ur företagets tidszon');

-- 3. Erbjudandepriset måste vara lägre än ordinarie.
select throws_ok(
  $$ update public.offers set offer_price_minor = 10000 where slug = 'corte-a' $$,
  '23514'
);

-- 4-5. ownerA ser sitt företags erbjudanden, inte B:s.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.offers where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ve sus ofertas');
select is((select count(*) from public.offers where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA no ve ofertas de B');

-- 6. ownerA kan inte skapa ett erbjudande i B.
select throws_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, offer_price_minor, category)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-6800-0000-0000-000000000001', 'x-b', 'X', 100, 'har') $$,
  '42501'
);

-- 7-8. ownerA skapar ett utkast (status tvingas till draft) och publicerar det.
select lives_ok(
  $$ insert into public.offers (business_id, service_id, slug, title, offer_price_minor, category)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6800-0000-0000-000000000001', 'nuevo-a', 'Nuevo', 7000, 'har') $$,
  'ownerA crea un borrador'
);
select lives_ok(
  $$ update public.offers set status = 'published' where slug = 'nuevo-a' $$,
  'ownerA publica'
);

-- 9. Klienten kan aldrig skriva `quantity_sold` (ingen kolumn-grant).
select throws_ok(
  $$ update public.offers set quantity_sold = 5 where slug = 'nuevo-a' $$,
  '42501'
);

-- 10. Ingen delete-grant.
select throws_ok($$ delete from public.offers where slug = 'nuevo-a' $$, '42501');

-- 11. Medlemmar kan inte skriva koordinater på företaget.
select throws_ok(
  $$ update public.businesses set lat = 1, lng = 1 where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);

-- 12. …men kan stänga av blixttider i Upptäck.
select lives_ok(
  $$ update public.businesses set marketplace_flash_visible = false where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ownerA apaga horas flash en el marketplace'
);
reset role;

-- 13. staffA (utan can_edit_catalog) kan inte publicera (RLS: 0 rader).
update public.offers set status = 'draft', published_at = null where slug = 'nuevo-a';
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
update public.offers set status = 'published' where slug = 'nuevo-a';
select is((select status from public.offers where slug = 'nuevo-a'), 'draft', 'staffA no publica');
reset role;

-- 14. anon: ingen åtkomst.
set local role anon;
select throws_ok($$ select count(*) from public.offers $$, '42501');
reset role;

-- 15-16. Ändrad adress ⇒ geokodas om; samma sats som sätter koordinater behåller dem.
update public.businesses set geocode_status = 'ok', lat = 59.3, lng = 18.0 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.businesses set address = 'Nueva 1' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select geocode_status from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'pending', 'ny adress => pending');
update public.businesses set address = 'Nueva 2', lat = 59.31, lng = 18.01, geocode_status = 'ok' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select geocode_status from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'ok', 'adress + koordinater i samma sats behålls');

-- 17-18. Haversine: Stockholm–Uppsala ~64 km; null in ⇒ null ut.
select ok(
  private.distance_km(59.32938, 18.06871, 59.85856, 17.63893) between 63 and 66,
  'Stockholm–Uppsala ≈ 64 km'
);
select is(private.distance_km(null, 18, 59, 17), null::float8, 'null ⇒ null');

select * from finish();
rollback;
