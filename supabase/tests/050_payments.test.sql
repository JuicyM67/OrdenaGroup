-- INV-3/INV-4: tenant-isolering för `payments`. Ingen delete-policy och inget
-- delete-grant (kassahistorik försvinner aldrig, se DATA_MODEL/CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900001111', 'Cliente B');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'confirmed', 'manual', 12000);
insert into public.payments (id, business_id, booking_id, kind, method, amount_clp, status, paid_at) values
  ('aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'full', 'cash', 12000, 'approved', now()),
  ('bbbbbbbb-5000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001', 'full', 'cash', 12000, 'approved', now());
-- Fixtur för B1: en mercadopago-betalning, skapad "utifrån" (som postgres,
-- motsvarar service role/webhooken i WP-25).
insert into public.payments (id, business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at) values
  ('aaaaaaaa-5000-0000-0000-000000000099', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'deposit', 'mercadopago', 3000, 'approved', 'mp-fixture-001', now());

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s betalningar (cash + mercadopago-fixturen), noll av B:s.
select is((select count(*) from public.payments where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 2, 'ownerA ser A:s betalningar');
select is((select count(*) from public.payments where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s betalningar');

-- 2. ownerA kan inte skapa en betalning i B.
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001', 'full', 'cash', 5000, 'pending') $$,
  '42501'
);

-- 3. ownerA:s update på B:s rad påverkar 0 rader, B oförändrat. Delete är inte ens tillåtet på egna rader (inget delete-grant).
with updated as (
  update public.payments set status = 'refunded' where id = 'bbbbbbbb-5000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s betalning (0 rader)');

-- Inget delete-grant alls (ingen delete-policy behövs ens): även ownerA:s
-- egen rad kan inte raderas.
select throws_ok(
  $$ delete from public.payments where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);

reset role;
select is((select status from public.payments where id = 'bbbbbbbb-5000-0000-0000-000000000001')::text, 'approved', 'B:s betalning är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s betalning till B.
select throws_ok(
  $$ update public.payments set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.payments $$, '42501');
select throws_ok($$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'full', 'cash', 5000, 'pending') $$, '42501');
select throws_ok($$ update public.payments set status = 'refunded' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.payments where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.payments)::int, 0, 'staffA ser noll betalningar');
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'balance', 'cash', 1000, 'pending') $$,
  '42501'
);
with updated as (
  update public.payments set status = 'refunded' where id = 'aaaaaaaa-5000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte uppdatera betalningar (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.payments)::int, 0, 'vendorA ser noll betalningar');
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'balance', 'cash', 1000, 'pending') $$,
  '42501'
);

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.payments)::int, 0, 'nomember ser noll betalningar');

reset role;

-- Säkerhet B1: `authenticated` kan bara skriva kontanta/manuella rader.
-- mercadopago-rader (med provider_ref) är skrivskyddade — bara service role
-- (WP-25:s webhook) skapar/ändrar dem.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'deposit', 'mercadopago', 3000, 'pending') $$,
  '42501'
);
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, provider_ref) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'deposit', 'cash', 3000, 'pending', 'anything') $$,
  '42501'
);
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'balance', 'transfer', 6000, 'pending') $$,
  'ownerA kan skapa en transfer-betalning utan provider_ref'
);
-- Kan inte ens ändra en befintlig mercadopago-rad (using-klausulen filtrerar
-- bort den helt, 0 rader påverkade, inget fel).
with updated as (
  update public.payments set status = 'refunded' where id = 'aaaaaaaa-5000-0000-0000-000000000099'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte ändra en mercadopago-rad (0 rader)');
select throws_ok(
  $$ update public.payments set method = 'mercadopago' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);
reset role;
select is(
  (select status from public.payments where id = 'aaaaaaaa-5000-0000-0000-000000000099')::text, 'approved',
  'mercadopago-raden är oförändrad'
);

-- service_role (WP-25:s webhook) förbigår RLS och kan skriva mercadopago-rader.
set local role service_role;
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'balance', 'mercadopago', 9000, 'approved', 'mp-fixture-002', now()) $$,
  'service_role kan skapa en mercadopago-rad'
);
select lives_ok(
  $$ update public.payments set status = 'refunded' where id = 'aaaaaaaa-5000-0000-0000-000000000099' $$,
  'service_role kan ändra en mercadopago-rad'
);
-- Säkerhetsgranskning WP-26 (punkt 6): `service_role` fick historiskt DELETE
-- via den lokala plattformens defaultprivilegier (samma gotcha som
-- D-014-korrigendumet, se DATA_MODEL.md) — INTE ett medvetet grant, trots att
-- migrationen bara skrev `select, insert, update`. Explicit revoke i
-- 20260930110000_revoke_unused_service_role_delete.sql.
select throws_ok(
  $$ delete from public.payments where id = 'aaaaaaaa-5000-0000-0000-000000000099' $$,
  '42501'
);
reset role;

-- 8. Tvärtenant-FK: en betalning i A kan inte peka på en bokning i B.
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-4000-0000-0000-000000000001', 'full', 'cash', 5000, 'pending') $$,
  '23503'
);

-- Tabellspecifikt: belopp, approved/paid_at-koherens, dubblett (method, provider_ref).
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'full', 'cash', 0, 'pending') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'full', 'mercadopago', 5000, 'approved') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'deposit', 'mercadopago', 3000, 'approved', 'mp-ref-001', now()) $$,
  'första betalningen med provider_ref mp-ref-001 (mercadopago) lyckas'
);
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'balance', 'mercadopago', 9000, 'approved', 'mp-ref-001', now()) $$,
  '23505'
);

select finish();
rollback;
