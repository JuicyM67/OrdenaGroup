-- INV-3/INV-4: tenant-isolering för `services`, plus `category_id`
-- (WP-40 steg 1, D-031: services.category (fritext) är ersatt av en FK mot
-- service_categories).
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);
\ir _helpers.psql

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte clásico', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte clásico', 35, 12000);

insert into public.service_categories (id, business_id, name) values
  ('aaaaaaaa-2900-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dama'),
  ('bbbbbbbb-2900-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Dama');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s tjänster, noll av B:s.
select is((select count(*) from public.services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s tjänster');
select is((select count(*) from public.services where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s tjänster');

-- 2. ownerA kan inte skapa en tjänst i B.
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Intruso', 30, 5000) $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.services set name = 'Hackeado' where id = 'bbbbbbbb-2000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s tjänst (0 rader)');
with deleted as (
  delete from public.services where id = 'bbbbbbbb-2000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s tjänst (0 rader)');

reset role;
select is((select name from public.services where id = 'bbbbbbbb-2000-0000-0000-000000000001'), 'Corte clásico', 'B:s tjänst är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s tjänst till B.
select throws_ok(
  $$ update public.services set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-2000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.services $$, '42501');
select throws_ok($$ insert into public.services (business_id, name, duration_min, price_clp) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Anon', 30, 5000) $$, '42501');
select throws_ok($$ update public.services set name = 'x' where id = 'aaaaaaaa-2000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.services where id = 'aaaaaaaa-2000-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader och kan inte skriva.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.services)::int, 0, 'staffA ser noll tjänster');
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Otro', 30, 5000) $$,
  '42501'
);

-- qa7: staffA:s update/delete-försök på en befintlig rad ger 0 rader.
with updated as (
  update public.services set name = 'Hackeado' where id = 'aaaaaaaa-2000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte uppdatera en tjänst (0 rader)');
with deleted as (
  delete from public.services where id = 'aaaaaaaa-2000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'staffA kan inte radera en tjänst (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.services)::int, 0, 'vendorA ser noll tjänster');
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Otro', 30, 5000) $$,
  '42501'
);

-- 7. Användare utan medlemskap ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.services)::int, 0, 'nomember ser noll tjänster');

reset role;

-- Tabellspecifikt: ogiltiga värden avvisas.
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 0, 5000) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 30, -1) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, deposit_kind, deposit_value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 30, 5000, 'percent', 0) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, deposit_kind, deposit_value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 30, 5000, 'percent', 101) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, deposit_kind, deposit_value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 30, 5000, 'fixed', 5001) $$,
  '23514'
);

-- category_id: sammansatt tvärtenant-FK (D-014) — A:s tjänst kan inte peka
-- på B:s kategori, ens med samma business_id-värde som A.
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, category_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 30, 5000, 'bbbbbbbb-2900-0000-0000-000000000001') $$,
  '23503'
);

-- category_id: `on delete set null` — tar bort kategorin utan att radera
-- tjänsten, svaret (booking_answers) hade motsvarande resonemang men här är
-- semantiken enklare (ingen snapshot behövs, category_id är bara en pekare).
set local role service_role;
update public.services set category_id = 'aaaaaaaa-2900-0000-0000-000000000001'
  where id = 'aaaaaaaa-2000-0000-0000-000000000001';
select is(
  (select category_id from public.services where id = 'aaaaaaaa-2000-0000-0000-000000000001')::text,
  'aaaaaaaa-2900-0000-0000-000000000001',
  'tjänsten har fått en kategori'
);
delete from public.service_categories where id = 'aaaaaaaa-2900-0000-0000-000000000001';
select is(
  (select category_id from public.services where id = 'aaaaaaaa-2000-0000-0000-000000000001'),
  null,
  'category_id sätts till null när kategorin tas bort, tjänsten finns kvar'
);
reset role;

select finish();
rollback;
