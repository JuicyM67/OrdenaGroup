-- INV-3/INV-4: tenant-isolering för `customer_answers` (WP-40 steg 1) — senaste
-- värde per (kund, fråga), bara för frågor med `save_to_customer`. Till
-- skillnad från `booking_answers` finns ingen snapshot: tar man bort frågan
-- försvinner den sparade bekvämlighetskopian med den (cascade).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);
\ir _helpers.psql

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');
insert into public.booking_questions (id, business_id, label, kind, save_to_customer) values
  ('aaaaaaaa-2800-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '¿Alergias?', 'yes_no', true),
  ('bbbbbbbb-2800-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '¿Alergias?', 'yes_no', true);

set local role service_role;
insert into public.customer_answers (business_id, customer_id, question_id, value) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'true'::jsonb),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-2800-0000-0000-000000000001', 'false'::jsonb);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s svar, noll av B:s.
select is((select count(*) from public.customer_answers where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s kundsvar');
select is((select count(*) from public.customer_answers where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s kundsvar');

-- 2. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.customer_answers set value = '"hackeado"'::jsonb
  where customer_id = 'bbbbbbbb-3000-0000-0000-000000000001' and question_id = 'bbbbbbbb-2800-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s kundsvar (0 rader)');
with deleted as (
  delete from public.customer_answers
  where customer_id = 'bbbbbbbb-3000-0000-0000-000000000001' and question_id = 'bbbbbbbb-2800-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s kundsvar (0 rader)');

-- 3. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.customer_answers $$, '42501');
select throws_ok(
  $$ insert into public.customer_answers (business_id, customer_id, question_id, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', '"x"'::jsonb) $$,
  '42501'
);

-- 4. staffA/vendorA/nomember ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.customer_answers)::int, 0, 'staffA ser noll kundsvar');
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.customer_answers)::int, 0, 'vendorA ser noll kundsvar');
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.customer_answers)::int, 0, 'nomember ser noll kundsvar');

reset role;
set local role service_role;

-- Tvärtenant-FK: A:s rad kan inte peka på B:s kund eller B:s fråga.
select throws_ok(
  $$ insert into public.customer_answers (business_id, customer_id, question_id, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', '"x"'::jsonb) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.customer_answers (business_id, customer_id, question_id, value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'bbbbbbbb-2800-0000-0000-000000000001', '"x"'::jsonb) $$,
  '23503'
);

-- Upsert: nästa bokning skriver över det tidigare värdet (senaste värde per fråga).
insert into public.customer_answers (business_id, customer_id, question_id, value)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2800-0000-0000-000000000001', 'false'::jsonb)
on conflict (customer_id, question_id) do update set value = excluded.value;
select is(
  (select value from public.customer_answers where customer_id = 'aaaaaaaa-3000-0000-0000-000000000001' and question_id = 'aaaaaaaa-2800-0000-0000-000000000001')::text,
  'false',
  'upsert skriver över det tidigare värdet, en rad per (kund, fråga)'
);

-- Cascade: frågan tas bort → den sparade kopian försvinner med den (ingen
-- snapshot här, till skillnad från booking_answers).
delete from public.booking_questions where id = 'aaaaaaaa-2800-0000-0000-000000000001';
select is(
  (select count(*) from public.customer_answers where customer_id = 'aaaaaaaa-3000-0000-0000-000000000001')::int,
  0,
  'kundsvaret tas bort i kaskad när frågan tas bort'
);

reset role;

select finish();
rollback;
