-- INV-3/INV-4: tenant-isolering för `booking_question_targets` (WP-40 steg 1),
-- plus "exakt en av service/kategori satt" och tvärtenant-FK mot tjänst/kategori.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);
\ir _helpers.psql

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 35, 12000);
insert into public.service_categories (id, business_id, name) values
  ('aaaaaaaa-2900-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dama'),
  ('bbbbbbbb-2900-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Dama');
insert into public.booking_questions (id, business_id, label, kind) values
  ('aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '¿Alergias?', 'yes_no'),
  ('bbbbbbbb-2800-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '¿Alergias?', 'yes_no');

insert into public.booking_question_targets (id, business_id, question_id, service_id) values
  ('aaaaaaaa-2700-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001'),
  ('bbbbbbbb-2700-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-2800-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s mål, noll av B:s.
select is((select count(*) from public.booking_question_targets where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s mål');
select is((select count(*) from public.booking_question_targets where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s mål');

-- 2. ownerA kan inte skapa ett mål i B.
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, service_id) values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-2800-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001') $$,
  '42501'
);

-- 3. ownerA:s delete på B:s rad påverkar 0 rader, B oförändrat.
with deleted as (
  delete from public.booking_question_targets where id = 'bbbbbbbb-2700-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s mål (0 rader)');
reset role;
select is((select count(*) from public.booking_question_targets where id = 'bbbbbbbb-2700-0000-0000-000000000001')::int, 1, 'B:s mål finns kvar');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.booking_question_targets $$, '42501');
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001') $$,
  '42501'
);
select throws_ok($$ delete from public.booking_question_targets where id = 'aaaaaaaa-2700-0000-0000-000000000001' $$, '42501');

-- 5. staffA/vendorA/nomember ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.booking_question_targets)::int, 0, 'staffA ser noll mål');
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.booking_question_targets)::int, 0, 'vendorA ser noll mål');
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.booking_question_targets)::int, 0, 'nomember ser noll mål');

reset role;

-- Tabellspecifikt: exakt en av service_id/category_id.
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, service_id, category_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-2900-0000-0000-000000000001') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, category_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-2900-0000-0000-000000000001') $$,
  'ett kategori-mål för samma fråga (utöver tjänste-målet) är okej'
);

-- Tvärtenant-FK: A:s fråga kan inte peka på B:s tjänst eller B:s kategori.
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001') $$,
  '23503'
);
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, category_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'bbbbbbbb-2900-0000-0000-000000000001') $$,
  '23503'
);

-- Dubblett: samma fråga kan inte målas mot samma tjänst två gånger.
select throws_ok(
  $$ insert into public.booking_question_targets (business_id, question_id, service_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001') $$,
  '23505'
);

select finish();
rollback;
