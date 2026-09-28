-- WP-20 · granskningsfynd · `bookings_business_id_idempotency_key_uidx`
-- förhindrar en andra bekräftad bokning från samma `idempotencyKey`. Körs
-- som postgres (bypasser RLS) — testar databasens invariant, inte
-- behörigheter.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 1', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B1', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte B', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');

-- 1. Första bokningen med en nyckel skapas.
select lives_ok(
  $$ insert into public.bookings
       (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, idempotency_key)
     values ('11111111-b000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), 'confirmed', 'web', 12000,
             'c0000000-0000-4000-8000-000000000001') $$,
  'bokning med idempotency_key skapas'
);

-- 2. Samma nyckel, samma företag, en annan tid/rad -> 23505 (inte 23P01:
-- ingen tidsöverlappning här, bara nyckel-kollisionen ska trigga).
select throws_ok(
  $$ insert into public.bookings
       (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, idempotency_key)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-03 15:00+00', '2026-11-03 15:35+00', '[)'), tstzrange('2026-11-03 15:00+00', '2026-11-03 15:35+00', '[)'), 'confirmed', 'web', 12000,
             'c0000000-0000-4000-8000-000000000001') $$,
  '23505'
);

-- 3. Samma nyckel men ett annat företag -> tillåtet (indexet är per business_id).
select lives_ok(
  $$ insert into public.bookings
       (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, idempotency_key)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
             tstzrange('2026-11-03 15:00+00', '2026-11-03 15:35+00', '[)'), tstzrange('2026-11-03 15:00+00', '2026-11-03 15:35+00', '[)'), 'confirmed', 'web', 12000,
             'c0000000-0000-4000-8000-000000000001') $$,
  'samma nyckel i ett annat företag skapas'
);

-- 4/5. Flera rader utan idempotency_key (null) i samma företag -> alltid
-- tillåtet (det partiella indexet gäller bara `is not null`).
select lives_ok(
  $$ insert into public.bookings
       (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-03 16:00+00', '2026-11-03 16:35+00', '[)'), tstzrange('2026-11-03 16:00+00', '2026-11-03 16:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'bokning utan idempotency_key (ägarens manuella) skapas'
);
select lives_ok(
  $$ insert into public.bookings
       (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-03 17:00+00', '2026-11-03 17:35+00', '[)'), tstzrange('2026-11-03 17:00+00', '2026-11-03 17:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'en andra bokning utan idempotency_key skapas — flera null tillåtna'
);

select finish();
rollback;
