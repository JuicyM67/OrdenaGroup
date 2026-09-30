-- WP-24 · Caja (db-engineer) · payments RLS bredare regel: can_view_reports
-- ELLER "får hantera bokningen" (egen/alla), samma "ELLER"-form som
-- bookings (20260930150100/20260930170000). Fixturer i egen namnrymd
-- ('cccccccc-...') för att inte krocka med 050_payments/106_booking_
-- permissions fixturerna om testerna någon gång körs i samma session.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('cccccccc-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 1', 'staff-1'),
  ('cccccccc-1000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 2', 'staff-2');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('cccccccc-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('cccccccc-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900002001', 'Cliente Caja');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('cccccccc-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-1000-0000-0000-000000000001', 'cccccccc-2000-0000-0000-000000000001', 'cccccccc-3000-0000-0000-000000000001',
   tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), tstzrange('2026-11-03 10:00+00', '2026-11-03 10:35+00', '[)'), 'confirmed', 'manual', 12000),
  ('cccccccc-4000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-1000-0000-0000-000000000002', 'cccccccc-2000-0000-0000-000000000001', 'cccccccc-3000-0000-0000-000000000001',
   tstzrange('2026-11-03 11:00+00', '2026-11-03 11:35+00', '[)'), tstzrange('2026-11-03 11:00+00', '2026-11-03 11:35+00', '[)'), 'confirmed', 'manual', 12000);

insert into auth.users (id, email, role, aud) values
  ('cccccccc-9000-0000-0000-000000000001', 'own-mgr-caja@example.com', 'authenticated', 'authenticated'),
  ('cccccccc-9000-0000-0000-000000000002', 'all-mgr-caja@example.com', 'authenticated', 'authenticated'),
  ('cccccccc-9000-0000-0000-000000000003', 'reports-caja@example.com', 'authenticated', 'authenticated'),
  ('cccccccc-9000-0000-0000-000000000004', 'none-caja@example.com', 'authenticated', 'authenticated');

insert into public.memberships (business_id, user_id, role, staff_id, can_manage_own_bookings, can_manage_all_bookings, can_view_reports) values
  -- Bara sin egen agenda (staff 1), ingen can_view_reports/can_manage_all.
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-9000-0000-0000-000000000001', 'staff', 'cccccccc-1000-0000-0000-000000000001', true, false, false),
  -- Hanterar alla bokningar, ingen egen agenda, ingen can_view_reports.
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-9000-0000-0000-000000000002', 'staff', null, false, true, false),
  -- Bara kassan/informes, varken egen eller allas agenda.
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-9000-0000-0000-000000000003', 'staff', null, false, false, true),
  -- Ingen relevant flagga alls (explicit false, trots att can_manage_own_bookings defaultar till true).
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-9000-0000-0000-000000000004', 'staff', null, false, false, false);

-- 1. own-mgr kan markera betalt på sin EGEN bokning (booking1, staff 1).
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-9000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-4000-0000-0000-000000000001', 'full', 'cash', 12000, 'approved', now()) $$,
  'own-mgr kan markera betalt på sin egen bokning (can_manage_own_bookings räcker)'
);

-- 2. own-mgr kan INTE markera betalt på kollegans bokning (booking2, staff 2).
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-4000-0000-0000-000000000002', 'full', 'cash', 12000, 'approved', now()) $$,
  '42501'
);

-- 3. own-mgr ser bara sin egen betalning (1 rad, inte reports-mgr:s senare insert).
select is((select count(*) from public.payments where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'own-mgr ser bara betalningen på sin egen bokning');

-- 4. all-mgr (can_manage_all_bookings) kan markera betalt på VILKEN bokning som helst.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-9000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-4000-0000-0000-000000000002', 'full', 'swish', 12000, 'approved', now()) $$,
  'all-mgr kan markera betalt på kollegans bokning (can_manage_all_bookings)'
);

-- 5. reports-mgr (can_view_reports) ser BÅDA betalningarna ovan (kassan/informes, hela företaget).
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-9000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from public.payments where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 2, 'reports-mgr ser hela kassan');

-- 6. reports-mgr kan också SKRIVA en betalning (can_view_reports är en av "ELLER"-grenarna, inte bara läsning).
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-4000-0000-0000-000000000001', 'balance', 'transfer', 1000, 'approved', now()) $$,
  'reports-mgr kan skapa en betalning (can_view_reports räcker för skrivning också)'
);

-- 7. none-mgr (ingen av flaggorna) ser noll betalningar.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-9000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
select is((select count(*) from public.payments where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 0, 'none-mgr ser noll betalningar');

-- 8. none-mgr kan inte markera betalt på någon bokning, inte ens sin (ingen egen agenda alls).
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-4000-0000-0000-000000000001', 'full', 'cash', 12000, 'approved', now()) $$,
  '42501'
);

-- 9. own-mgr kan ångra (refunded) sin egen betalning samma dag, men fortfarande inte skriva mercadopago/provider_ref.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-9000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
with updated as (
  update public.payments set status = 'refunded'
   where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and booking_id = 'cccccccc-4000-0000-0000-000000000001' and method = 'cash'
  returning 1
)
select is((select count(*) from updated)::int, 1, 'own-mgr kan ångra (refunded) betalningen på sin egen bokning');

reset role;
select finish();
rollback;
