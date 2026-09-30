-- INV-3/INV-4: tenant-isolering för `booking_questions` (WP-40 steg 1, D-031),
-- plus typ-specifika constraints (options krävs/förbjuds beroende på `kind`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);
\ir _helpers.psql

insert into public.booking_questions (id, business_id, label, kind, required, applies_to) values
  ('aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '¿Alguna alergia?', 'yes_no', false, 'all'),
  ('bbbbbbbb-2800-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '¿Alguna alergia?', 'yes_no', false, 'all');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s frågor, noll av B:s.
select is((select count(*) from public.booking_questions where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s frågor');
select is((select count(*) from public.booking_questions where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s frågor');

-- 2. ownerA kan inte skapa en fråga i B.
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Intruso', 'short_text') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.booking_questions set label = 'Hackeado' where id = 'bbbbbbbb-2800-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s fråga (0 rader)');
with deleted as (
  delete from public.booking_questions where id = 'bbbbbbbb-2800-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s fråga (0 rader)');

reset role;
select is((select label from public.booking_questions where id = 'bbbbbbbb-2800-0000-0000-000000000001'), '¿Alguna alergia?', 'B:s fråga är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s fråga till B.
select throws_ok(
  $$ update public.booking_questions set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-2800-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.booking_questions $$, '42501');
select throws_ok($$ insert into public.booking_questions (business_id, label, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Anon', 'short_text') $$, '42501');
select throws_ok($$ update public.booking_questions set label = 'x' where id = 'aaaaaaaa-2800-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.booking_questions where id = 'aaaaaaaa-2800-0000-0000-000000000001' $$, '42501');

-- 6. staffA ser noll frågor (kräver can_edit_catalog, WP-46 uppföljning 2,
-- default false — booking_questions fick ingen bred SELECT-policy som
-- staff/services, bara write-policyns flagga). staffA kan därför inte
-- heller SKRIVA en fråga (samma gränstest som pgTAP-uppdraget bad om).
-- vendorA/nomember oförändrade.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.booking_questions)::int, 0, 'staffA ser noll frågor (ingen can_edit_catalog)');
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Otra', 'short_text') $$,
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.booking_questions)::int, 0, 'vendorA ser noll frågor');

select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.booking_questions)::int, 0, 'nomember ser noll frågor');

reset role;

-- Tabellspecifikt: label tom avvisas.
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', '  ', 'short_text') $$,
  '23514'
);

-- single_choice/multi_choice kräver options (icke-tom jsonb-array); andra
-- typer förbjuder options.
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Color', 'single_choice') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind, options) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Color', 'single_choice', '[]'::jsonb) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind, options) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Color', 'single_choice', '{"a":1}'::jsonb) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.booking_questions (business_id, label, kind, options) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Nombre', 'short_text', '["a"]'::jsonb) $$,
  '23514'
);
select lives_ok(
  $$ insert into public.booking_questions (business_id, label, kind, options) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Color', 'single_choice', '["Rubio","Castaño"]'::jsonb) $$,
  'single_choice med en icke-tom options-array är okej'
);
select lives_ok(
  $$ insert into public.booking_questions (business_id, label, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Nombre', 'short_text') $$,
  'short_text utan options är okej'
);

select finish();
rollback;
