-- WP-86 (D-072) · Paquetes: 20261108010000_paquetes.sql.
-- Tenant-isolering (INV-3/INV-4) för package_templates,
-- package_template_services, customer_packages, customer_package_services och
-- customer_package_moves: RLS, behörigheter (can_edit_catalog för mallar,
-- kassan för försäljning, samma regel som "Marcar pagada" för inlösen),
-- append-only-ledger, planspärren och serverns ögonblicksbild av mallen.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
\ir _helpers.psql

-- Fixturer (som postgres, förbigår RLS).
update public.businesses set plan = 'emprende'
 where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');
insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-8600-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Kine A', 'staff-1'),
  ('bbbbbbbb-8600-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Kine B', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-8600-0000-0001-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Kinesiología', 45, 25000),
  ('aaaaaaaa-8600-0000-0001-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Masaje', 60, 30000),
  ('bbbbbbbb-8600-0000-0001-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Kinesiología B', 45, 25000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-8600-0000-0002-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56911111186', 'Clienta A'),
  ('aaaaaaaa-8600-0000-0002-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '+56922222286', 'Otra A'),
  ('bbbbbbbb-8600-0000-0002-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56933333386', 'Clienta B');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp) values
  ('aaaaaaaa-8600-0000-0004-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0001-000000000001', 'aaaaaaaa-8600-0000-0002-000000000001',
   tstzrange(now() - interval '2 hours', now() - interval '75 minutes', '[)'), tstzrange(now() - interval '2 hours', now() - interval '75 minutes', '[)'), 'completed', 'manual', 25000, 0),
  -- Masaje: ingår inte i paketet.
  ('aaaaaaaa-8600-0000-0004-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0001-000000000002', 'aaaaaaaa-8600-0000-0002-000000000001',
   tstzrange(now() - interval '5 hours', now() - interval '4 hours', '[)'), tstzrange(now() - interval '5 hours', now() - interval '4 hours', '[)'), 'completed', 'manual', 30000, 0),
  -- Annan kund.
  ('aaaaaaaa-8600-0000-0004-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0001-000000000001', 'aaaaaaaa-8600-0000-0002-000000000002',
   tstzrange(now() - interval '8 hours', now() - interval '7 hours', '[)'), tstzrange(now() - interval '8 hours', now() - interval '7 hours', '[)'), 'completed', 'manual', 25000, 0);

-- 1-5. RLS på alla nya tabeller.
select ok((select relrowsecurity from pg_class where oid = 'public.package_templates'::regclass), 'RLS på package_templates');
select ok((select relrowsecurity from pg_class where oid = 'public.package_template_services'::regclass), 'RLS på package_template_services');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_packages'::regclass), 'RLS på customer_packages');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_package_services'::regclass), 'RLS på customer_package_services');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_package_moves'::regclass), 'RLS på customer_package_moves');

-- Som ägare A.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 6. Ägaren skapar en mall och kopplar en tjänst.
select lives_ok(
  $$ insert into public.package_templates (id, business_id, name, sessions, price_clp, validity_days)
     values ('aaaaaaaa-8600-0000-0003-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '10 sesiones de kinesiología', 10, 200000, 90);
     insert into public.package_template_services (business_id, template_id, service_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0003-000000000001', 'aaaaaaaa-8600-0000-0001-000000000001') $$,
  'ägare A skapar en paketmall');

-- 7. ... men inte i B:s företag.
select throws_ok(
  $$ insert into public.package_templates (business_id, name, sessions, price_clp)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'Intrång', 5, 1000) $$,
  '42501');

-- 8. B:s tjänst kan inte kopplas till A:s mall (sammansatt FK).
select throws_ok(
  $$ insert into public.package_template_services (business_id, template_id, service_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0003-000000000001', 'bbbbbbbb-8600-0000-0001-000000000001') $$,
  '23503');

-- 9. Försäljning: klientens pris/sessioner ignoreras, mallens gäller.
select lives_ok(
  $$ insert into public.customer_packages (id, business_id, customer_id, template_id, name, sessions_total, price_clp, payment_method)
     values ('aaaaaaaa-8600-0000-0005-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0002-000000000001',
             'aaaaaaaa-8600-0000-0003-000000000001', 'Gratis', 99, 1, 'cash') $$,
  'ägare A säljer ett paket');
select is(
  (select row(name, sessions_total, price_clp, expires_on is not null)::text from public.customer_packages
    where id = 'aaaaaaaa-8600-0000-0005-000000000001'),
  row('10 sesiones de kinesiología', 10, 200000, true)::text,
  'namn, sessioner, pris och giltighet kopieras från mallen');
select is(
  (select count(*)::int from public.customer_package_services where customer_package_id = 'aaaaaaaa-8600-0000-0005-000000000001'),
  1, 'tjänsterna kopieras till det sålda paketet');

-- 11. Online-metoder nekas (bara efectivo/tarjeta/transferencia).
select throws_ok(
  $$ insert into public.customer_packages (business_id, customer_id, template_id, name, sessions_total, price_clp, payment_method)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0002-000000000001',
             'aaaaaaaa-8600-0000-0003-000000000001', 'x', 1, 1, 'mercadopago') $$,
  '23514');

-- 12. Ett paket kan inte säljas till B:s kund (sammansatt FK).
select throws_ok(
  $$ insert into public.customer_packages (business_id, customer_id, template_id, name, sessions_total, price_clp, payment_method)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-8600-0000-0002-000000000001',
             'aaaaaaaa-8600-0000-0003-000000000001', 'x', 1, 1, 'cash') $$,
  '23503');

-- 13. Ägaren kan inte skriva direkt i ögonblicksbilden.
select throws_ok(
  $$ insert into public.customer_package_services (business_id, customer_package_id, service_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001', 'aaaaaaaa-8600-0000-0001-000000000002') $$,
  '42501');

-- 14. Inlösen för en bokning som paketet täcker.
select lives_ok(
  $$ insert into public.customer_package_moves (id, business_id, customer_package_id, kind, delta, booking_id)
     values ('aaaaaaaa-8600-0000-0006-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001',
             'redeem', -1, 'aaaaaaaa-8600-0000-0004-000000000001') $$,
  'en session dras för bokningen');
select is(
  (select sessions_total + coalesce((select sum(delta) from public.customer_package_moves m
                                     where m.customer_package_id = cp.id), 0)::int
     from public.customer_packages cp where id = 'aaaaaaaa-8600-0000-0005-000000000001'),
  9, '9 sessioner kvar');

-- 16-18. Samma bokning två gånger, fel tjänst, fel kund: nekas.
select throws_ok(
  $$ insert into public.customer_package_moves (business_id, customer_package_id, kind, delta, booking_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001', 'redeem', -1, 'aaaaaaaa-8600-0000-0004-000000000001') $$,
  '23514', 'package_already_used');
select throws_ok(
  $$ insert into public.customer_package_moves (business_id, customer_package_id, kind, delta, booking_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001', 'redeem', -1, 'aaaaaaaa-8600-0000-0004-000000000002') $$,
  '23514', 'package_service_not_included');
select throws_ok(
  $$ insert into public.customer_package_moves (business_id, customer_package_id, kind, delta, booking_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001', 'redeem', -1, 'aaaaaaaa-8600-0000-0004-000000000003') $$,
  '23514', 'package_wrong_customer');

-- 19-20. Ledgern är append-only: ingen update eller delete.
select throws_ok(
  $$ update public.customer_package_moves set delta = 1 where id = 'aaaaaaaa-8600-0000-0006-000000000001' $$,
  '42501');
select throws_ok(
  $$ delete from public.customer_package_moves where id = 'aaaaaaaa-8600-0000-0006-000000000001' $$,
  '42501');

-- 21. Ett paket med använd session kan inte annulleras.
select throws_ok(
  $$ update public.customer_packages set status = 'voided' where id = 'aaaaaaaa-8600-0000-0005-000000000001' $$,
  '23514', 'customer_package_in_use');

-- 22. Priset kan inte ändras i efterhand (kolumn-grant).
select throws_ok(
  $$ update public.customer_packages set price_clp = 1 where id = 'aaaaaaaa-8600-0000-0005-000000000001' $$,
  '42501');

-- 23. Ägare B ser ingenting av A.
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
select is(
  (select (select count(*) from public.package_templates where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')
        + (select count(*) from public.package_template_services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')
        + (select count(*) from public.customer_packages where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')
        + (select count(*) from public.customer_package_services where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')
        + (select count(*) from public.customer_package_moves where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'))::int,
  0, 'ägare B ser inga av A:s paket');

-- 24. ... och kan inte dra en session på A:s paket.
select throws_ok(
  $$ insert into public.customer_package_moves (business_id, customer_package_id, kind, delta, booking_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001', 'redeem', -1, 'aaaaaaaa-8600-0000-0004-000000000001') $$,
  '42501');

-- 25. B kan inte annullera A:s försäljning (raden syns inte: 0 rader).
select is_empty(
  $$ update public.customer_packages set status = 'voided'
      where id = 'aaaaaaaa-8600-0000-0005-000000000001' returning id $$,
  'ägare B kan inte annullera A:s paket');

-- 26-27. Personal hos A ser paketen men får inte sälja (saknar kassan).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from public.customer_packages where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1, 'personal ser företagets sålda paket');
select throws_ok(
  $$ insert into public.customer_packages (business_id, customer_id, template_id, name, sessions_total, price_clp, payment_method)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0002-000000000001',
             'aaaaaaaa-8600-0000-0003-000000000001', 'x', 1, 1, 'cash') $$,
  '42501');

-- 28. anon har ingen åtkomst alls.
reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.customer_packages $$,
  '42501');
reset role;

-- 29. Ångra inlösen, sedan kan försäljningen annulleras.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.customer_package_moves (business_id, customer_package_id, kind, delta, booking_id, reverses_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-8600-0000-0005-000000000001', 'reverse', 1,
             'aaaaaaaa-8600-0000-0004-000000000001', 'aaaaaaaa-8600-0000-0006-000000000001');
     update public.customer_packages set status = 'voided' where id = 'aaaaaaaa-8600-0000-0005-000000000001' $$,
  'ångra inlösen och annullera försäljningen');

-- 30. Planspärren: utan betald plan kan ägaren inte skapa mallar.
reset role;
update public.businesses set plan = 'free' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(
  $$ insert into public.package_templates (business_id, name, sessions, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Pack 5 masajes', 5, 120000) $$,
  '42501', 'plan_locked');

select * from finish();
rollback;
