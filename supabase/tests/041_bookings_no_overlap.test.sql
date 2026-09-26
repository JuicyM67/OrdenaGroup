-- INV-1: `no_overlap` (exclusion constraint) förhindrar dubbelbokning av
-- samma profesional. Körs som postgres (bypasser RLS) — det här testar
-- databasens invariant, inte behörigheter (se 040_bookings.test.sql för det).
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 1', 'staff-1'),
  ('aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 2', 'staff-2'),
  ('aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 3', 'staff-3'),
  ('aaaaaaaa-1000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 4', 'staff-4');
insert into public.services (id, business_id, name, duration_min, price_clp, buffer_after_min) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000, 0),
  ('aaaaaaaa-2000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte + barba', 35, 12000, 10);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A');

-- 1. Samma profesional, överlappande blocked -> 23P01.
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('11111111-a000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'bokning X skapas'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 10:15+00', '2026-11-02 10:50+00', '[)'), tstzrange('2026-11-02 10:15+00', '2026-11-02 10:50+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23P01'
);

-- 2. Kant mot kant: [10:00,10:35) och [10:35,11:10) är okej (halvöppet).
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 10:35+00', '2026-11-02 11:10+00', '[)'), tstzrange('2026-11-02 10:35+00', '2026-11-02 11:10+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'kant mot kant (samma sekund) är tillåtet'
);

-- 3. Buffert: A [12:00,12:35) blocked [12:00,12:45). B kl 12:40 -> 23P01. B kl 12:45 -> okej.
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('11111111-a000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-2000-0000-0000-000000000002', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 12:00+00', '2026-11-02 12:35+00', '[)'), tstzrange('2026-11-02 12:00+00', '2026-11-02 12:45+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'bokning med 10 min buffert skapas'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 12:40+00', '2026-11-02 13:15+00', '[)'), tstzrange('2026-11-02 12:40+00', '2026-11-02 13:15+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23P01'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 12:45+00', '2026-11-02 13:20+00', '[)'), tstzrange('2026-11-02 12:45+00', '2026-11-02 13:20+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'ny bokning precis efter buffertfönstret (12:45) är okej'
);

-- 4. Olika profesionales samma tid -> okej.
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 15:00+00', '2026-11-02 15:35+00', '[)'), tstzrange('2026-11-02 15:00+00', '2026-11-02 15:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'staff 3 kl 15:00 skapas'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000004', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 15:00+00', '2026-11-02 15:35+00', '[)'), tstzrange('2026-11-02 15:00+00', '2026-11-02 15:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'staff 4 samma tid (15:00) är okej'
);

-- 5. cancelled/no_show blockerar inte. pending_payment och completed blockerar.
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, cancelled_at, cancel_reason)
     values ('11111111-a000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 16:00+00', '2026-11-02 16:35+00', '[)'), tstzrange('2026-11-02 16:00+00', '2026-11-02 16:35+00', '[)'), 'cancelled', 'manual', 12000, now(), 'cliente canceló') $$,
  'en avbokad bokning kl 16:00 skapas'
);
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('11111111-a000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 16:00+00', '2026-11-02 16:35+00', '[)'), tstzrange('2026-11-02 16:00+00', '2026-11-02 16:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'en avbokad bokning blockerar inte samma tid'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 16:30+00', '2026-11-02 17:05+00', '[)'), tstzrange('2026-11-02 16:30+00', '2026-11-02 17:05+00', '[)'), 'no_show', 'manual', 12000) $$,
  'en no_show-bokning kl 16:30 skapas'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 16:30+00', '2026-11-02 17:05+00', '[)'), tstzrange('2026-11-02 16:30+00', '2026-11-02 17:05+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'en no_show blockerar inte samma tid'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, pending_expires_at)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 17:00+00', '2026-11-02 17:35+00', '[)'), tstzrange('2026-11-02 17:00+00', '2026-11-02 17:35+00', '[)'), 'pending_payment', 'web', 12000, now() + interval '15 minutes') $$,
  'en pending_payment-bokning kl 17:00 skapas'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 17:00+00', '2026-11-02 17:35+00', '[)'), tstzrange('2026-11-02 17:00+00', '2026-11-02 17:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23P01'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000004', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 18:00+00', '2026-11-02 18:35+00', '[)'), tstzrange('2026-11-02 18:00+00', '2026-11-02 18:35+00', '[)'), 'completed', 'manual', 12000) $$,
  'en completed-bokning kl 18:00 skapas'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000004', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 18:00+00', '2026-11-02 18:35+00', '[)'), tstzrange('2026-11-02 18:00+00', '2026-11-02 18:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23P01'
);

-- 6. Återaktivering: cancelled -> confirmed när tiden nu är upptagen (16:00-16:35 av bokning 4).
select throws_ok(
  $$ update public.bookings set status = 'confirmed', cancelled_at = null where id = '11111111-a000-0000-0000-000000000003' $$,
  '23P01'
);

-- 7. Flytt: att flytta en bokning in i en annan avvisas.
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('11111111-a000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 19:00+00', '2026-11-02 19:35+00', '[)'), tstzrange('2026-11-02 19:00+00', '2026-11-02 19:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'bokning P (19:00) skapas'
);
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('11111111-a000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 20:00+00', '2026-11-02 20:35+00', '[)'), tstzrange('2026-11-02 20:00+00', '2026-11-02 20:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'bokning Q (20:00) skapas'
);
select throws_ok(
  $$ update public.bookings set period = tstzrange('2026-11-02 19:15+00', '2026-11-02 19:50+00', '[)'), blocked = tstzrange('2026-11-02 19:15+00', '2026-11-02 19:50+00', '[)')
     where id = '11111111-a000-0000-0000-000000000006' $$,
  '23P01'
);

-- 8. Check-fel: blocked som avviker, pengar och pending_payment-koherens.
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 21:00+00', '2026-11-02 21:35+00', '[)'), tstzrange('2026-11-02 21:05+00', '2026-11-02 21:45+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 21:00+00', '2026-11-02 21:35+00', '[)'), tstzrange('2026-11-02 21:00+00', '2026-11-02 21:30+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), 'confirmed', 'manual', 12000, -1) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), 'confirmed', 'manual', 12000, 13000) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, deposit_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), 'confirmed', 'manual', 12000, 12001) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), tstzrange('2026-11-02 22:00+00', '2026-11-02 22:35+00', '[)'), 'pending_payment', 'web', 12000) $$,
  '23514'
);

select finish();
rollback;
