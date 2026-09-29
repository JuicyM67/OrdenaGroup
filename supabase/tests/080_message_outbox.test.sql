-- INV-3/INV-4: tenant-isolering för `message_outbox`, plus D-029 (klartext-
-- token bara i payload, oläsbar för anon/andra företag) och
-- `private.owner_emails()` (bara service_role).
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);
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

-- Rader skrivna av servern (service_role, D-019), en per företag. A:s rad har
-- fortfarande kundens klartext-token i payload (D-029, raden är 'queued').
set local role service_role;
insert into public.message_outbox
  (id, business_id, booking_id, channel, recipient_kind, template, payload, category, status, dedupe_key) values
  ('aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001',
   'email', 'customer', 'reservaConfirmada', jsonb_build_object('token', 'secreto-a'), 'utility', 'queued',
   'reservaConfirmada:email:customer:aaaaaaaa-4000-0000-0000-000000000001:1'),
  ('bbbbbbbb-5000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001',
   'email', 'customer', 'reservaConfirmada', jsonb_build_object('token', 'secreto-b'), 'utility', 'queued',
   'reservaConfirmada:email:customer:bbbbbbbb-4000-0000-0000-000000000001:1');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s rad (med payload), noll av B:s.
select is((select count(*) from public.message_outbox where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s meddelanderad');
select is((select count(*) from public.message_outbox where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s meddelanden (payload oläsbar)');
select is(
  (select payload ->> 'token' from public.message_outbox where id = 'aaaaaaaa-5000-0000-0000-000000000001'),
  'secreto-a',
  'ownerA ser sin egen rads payload'
);

-- 2. ownerA kan inte skapa en rad (ingen insert-grant för authenticated).
select throws_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'email', 'customer', 'x', 'utility', 'queued', 'x:1') $$,
  '42501'
);

-- 3. ownerA kan inte uppdatera eller radera, varken B:s rad eller sin egen (ingen update/delete-grant).
select throws_ok(
  $$ update public.message_outbox set status = 'cancelled' where id = 'bbbbbbbb-5000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update public.message_outbox set status = 'cancelled' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.message_outbox where id = 'bbbbbbbb-5000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.message_outbox where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);

reset role;
select is(
  (select status from public.message_outbox where id = 'aaaaaaaa-5000-0000-0000-000000000001')::text,
  'queued',
  'A:s rad är oförändrad (ingen update lyckades)'
);

-- 4. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.message_outbox $$, '42501');
select throws_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'email', 'customer', 'x', 'utility', 'queued', 'x:2') $$,
  '42501'
);
select throws_ok($$ update public.message_outbox set status = 'cancelled' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.message_outbox where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$, '42501');

-- 5. staffA/vendorA/nomember ser noll rader (samma "owner/admin"-nivå som bookings/customers).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.message_outbox)::int, 0, 'staffA ser noll meddelanden');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.message_outbox)::int, 0, 'vendorA ser noll meddelanden');

select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.message_outbox)::int, 0, 'nomember ser noll meddelanden');

reset role;

-- 6. Tvärtenant-FK: en rad i A kan inte peka på en bokning i B (D-014).
set local role service_role;
select throws_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-4000-0000-0000-000000000001', 'email', 'customer', 'x', 'utility', 'queued', 'x:3') $$,
  '23503'
);

-- 7. dedupe_key är unik (global, redan tenant-scopad via booking_id i formatet).
select throws_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'email', 'owner', 'nuevaReservaDueno', 'utility', 'queued',
             'reservaConfirmada:email:customer:aaaaaaaa-4000-0000-0000-000000000001:1') $$,
  '23505'
);
select lives_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'email', 'owner', 'nuevaReservaDueno', 'utility', 'queued',
             'nuevaReservaDueno:email:owner:aaaaaaaa-4000-0000-0000-000000000001:1') $$,
  'ett nytt dedupe_key för samma bokning skapas'
);

-- 8. sent_at måste sättas exakt när status = 'sent'.
select throws_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'email', 'customer', 'x', 'utility', 'sent', 'x:4') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.message_outbox (business_id, booking_id, channel, recipient_kind, template, category, status, sent_at, dedupe_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'email', 'customer', 'x', 'utility', 'sent', now(), 'x:5') $$,
  'status sent med sent_at satt är okej'
);

reset role;

-- 9. private.owner_emails(): bara service_role, aldrig authenticated/anon.
-- ownerA (11111111…) är den enda owner-medlemmen i negocio A i _helpers.psql.
set local role service_role;
select is(
  (select array_agg(email order by email) from private.owner_emails('aaaaaaaa-0000-0000-0000-000000000001') as email)::text[],
  array['ownera@example.com'],
  'owner_emails(A) ger ownerA:s e-post, som service_role'
);
select is(
  (select array_agg(email order by email) from private.owner_emails('bbbbbbbb-0000-0000-0000-000000000002') as email)::text[],
  array['ownerb@example.com'],
  'owner_emails(B) ger ownerB:s e-post, inte ownerA:s'
);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ select * from private.owner_emails('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501'
);
reset role;

set local role anon;
select throws_ok(
  $$ select * from private.owner_emails('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501'
);
reset role;

select finish();
rollback;
