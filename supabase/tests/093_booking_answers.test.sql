-- INV-3/INV-4: tenant-isolering för `booking_answers` (WP-40 steg 1), plus
-- snapshot-semantiken: `question_id` sätts till null (frågan borttagen) utan
-- att svaret försvinner, och högst ett svar per (booking_id, question_id)
-- medan frågan lever.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000);
insert into public.booking_questions (id, business_id, label, kind) values
  ('aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '¿Alergias?', 'yes_no'),
  ('bbbbbbbb-2800-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '¿Alergias?', 'yes_no');

-- Svar skrivs av service_role (bokningsflödet, samma transaktion som bokningen).
set local role service_role;
insert into public.booking_answers (id, business_id, booking_id, question_id, label_snapshot, kind_snapshot, value) values
  ('aaaaaaaa-2600-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', '¿Alergias?', 'yes_no', 'true'::jsonb),
  ('bbbbbbbb-2600-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-2800-0000-0000-000000000001', '¿Alergias?', 'yes_no', 'false'::jsonb);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s svar, noll av B:s.
select is((select count(*) from public.booking_answers where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s svar');
select is((select count(*) from public.booking_answers where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s svar');

-- 2. ownerA:s delete på B:s rad påverkar 0 rader, B oförändrat.
with deleted as (
  delete from public.booking_answers where id = 'bbbbbbbb-2600-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s svar (0 rader)');
reset role;
select is((select count(*) from public.booking_answers where id = 'bbbbbbbb-2600-0000-0000-000000000001')::int, 1, 'B:s svar finns kvar');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 3. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.booking_answers $$, '42501');
select throws_ok($$ delete from public.booking_answers where id = 'aaaaaaaa-2600-0000-0000-000000000001' $$, '42501');

-- 4. staffA/vendorA/nomember ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.booking_answers)::int, 0, 'staffA ser noll svar');
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.booking_answers)::int, 0, 'vendorA ser noll svar');
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.booking_answers)::int, 0, 'nomember ser noll svar');

reset role;
set local role service_role;

-- Tvärtenant-FK: A:s svar kan inte peka på B:s bokning eller B:s fråga.
select throws_ok(
  $$ insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-4000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'X', 'yes_no', 'true'::jsonb) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'bbbbbbbb-2800-0000-0000-000000000001', 'X', 'yes_no', 'true'::jsonb) $$,
  '23503'
);

-- label_snapshot tom avvisas.
select throws_ok(
  $$ insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', '  ', 'yes_no', 'true'::jsonb) $$,
  '23514'
);

-- Dubblett: högst ett svar per (booking_id, question_id) medan frågan lever.
select throws_ok(
  $$ insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'X', 'yes_no', 'true'::jsonb) $$,
  '23505'
);

-- Snapshot: frågan tas bort → svaret finns kvar med question_id = null,
-- label/typ oförändrade (INTE en primärnyckelkolumn, se migrationens
-- kommentar). En ny rad med question_id = null för SAMMA bokning är sedan
-- tillåten (det partiella unika indexet gäller bara när question_id är satt).
-- Säkerhetsgranskning WP-26 (punkt 6): service_role har inte längre DELETE på
-- booking_questions (ingen produktionskod raderar den så, se
-- 20260930110000_revoke_unused_service_role_delete.sql) — som postgres i
-- stället (bypassar RLS/grants precis som service_role gjorde).
reset role;
delete from public.booking_questions where id = 'aaaaaaaa-2800-0000-0000-000000000001';
select is(
  (select question_id from public.booking_answers where id = 'aaaaaaaa-2600-0000-0000-000000000001'),
  null,
  'question_id sätts till null när frågan tas bort'
);
select is(
  (select label_snapshot from public.booking_answers where id = 'aaaaaaaa-2600-0000-0000-000000000001'),
  '¿Alergias?',
  'label_snapshot är oförändrad efter att frågan tagits bort'
);
select lives_ok(
  $$ insert into public.booking_answers (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', null, 'Otra pregunta borrada', 'short_text', '"n/a"'::jsonb) $$,
  'ett andra svar med question_id = null för samma bokning är okej'
);

reset role;

select finish();
rollback;
