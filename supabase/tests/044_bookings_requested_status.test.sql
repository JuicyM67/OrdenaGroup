-- WP-45 · steg 1 · INV-1: `requested` blockerar tiden precis som
-- `pending_payment`/`confirmed`/`completed` (F4: dubbelbokning omöjlig även
-- för väntande förfrågningar). Körs som postgres (bypasser RLS) — testar
-- databasens invariant, inte behörigheter (se 041 för mönstret).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 5', 'staff-5');
insert into public.services (id, business_id, name, duration_min, price_clp, buffer_after_min) values
  ('aaaaaaaa-2000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000, 0);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900002222', 'Cliente B');

-- 1. En `requested`-bokning skapas och blockerar tiden.
select lives_ok(
  $$ insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('11111111-b000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000005', 'aaaaaaaa-2000-0000-0000-000000000003', 'aaaaaaaa-3000-0000-0000-000000000002',
             tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), 'requested', 'web', 12000) $$,
  'förfrågan (requested) skapas'
);

-- 2. En annan `requested`-förfrågan för samma profesional som överlappar -> 23P01.
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000005', 'aaaaaaaa-2000-0000-0000-000000000003', 'aaaaaaaa-3000-0000-0000-000000000002',
             tstzrange('2026-11-03 10:15+00', '2026-11-03 10:50+00', '[)'), tstzrange('2026-11-03 10:15+00', '2026-11-03 10:50+00', '[)'), 'requested', 'web', 12000) $$,
  '23P01'
);

-- 3. En `confirmed`-bokning som överlappar en väntande `requested` -> 23P01
--    (väntande förfrågningar blockerar redan bekräftade tider och tvärtom).
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000005', 'aaaaaaaa-2000-0000-0000-000000000003', 'aaaaaaaa-3000-0000-0000-000000000002',
             tstzrange('2026-11-03 10:20+00', '2026-11-03 10:55+00', '[)'), tstzrange('2026-11-03 10:20+00', '2026-11-03 10:55+00', '[)'), 'confirmed', 'manual', 12000) $$,
  '23P01'
);

-- 4. Nekad förfrågan (status -> cancelled, som `declineBooking` gör) frigör tiden.
update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'declined'
  where id = '11111111-b000-0000-0000-000000000001';
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000005', 'aaaaaaaa-2000-0000-0000-000000000003', 'aaaaaaaa-3000-0000-0000-000000000002',
             tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), 'confirmed', 'manual', 12000) $$,
  'en nekad (cancelled) förfrågan frigör tiden för en ny bokning'
);

select finish();
rollback;
