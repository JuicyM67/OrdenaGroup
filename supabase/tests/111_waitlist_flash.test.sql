-- WP-23/WP-30 · Väntelista + Horas flash (db-engineer) · INV-3/INV-4 för
-- `waitlist_entries` och `flash_slots` (tenant-isolering, inga anon-
-- policies, sammansatta FK mot B, D-014) + INV-1-mönstret för `flash_slots`
-- (ingen dubbelbokad/överlappande aktiv flash-tid för samma profesional).
-- EN fil för båda de nya tabellerna (ägarens instruktion), eftersom de
-- introduceras i samma arbetspaket och delar samma fixturer.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);
\ir _helpers.psql
-- WP-73 (D-048): blixttider kräver Team (flash_slots_guard_plan); det här
-- testet gäller behörigheter, inte planen.
update public.businesses set plan = 'equipo'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Personal, tjänster, kunder, en bokning per företag (för flash_slots.booking_id
-- och bookings.flash_slot_id/waitlist_entry_id-FK-testerna).
insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A1', 'staff-1'),
  ('aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A2', 'staff-2'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B1', 'staff-1');

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 30, 10000);

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');

insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), 'confirmed', 'manual', 10000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), 'confirmed', 'manual', 10000);

insert into public.waitlist_entries (id, business_id, customer_id, service_id, day) values
  ('aaaaaaaa-7000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', '2026-12-05'),
  ('aaaaaaaa-7000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', '2026-12-06'),
  ('bbbbbbbb-7000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', '2026-12-05');

insert into public.flash_slots (id, business_id, staff_id, starts_at, ends_at, discount_pct, created_by) values
  ('aaaaaaaa-8000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', '2026-12-05 09:00+00', '2026-12-05 09:30+00', 20, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-8000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', '2026-12-05 09:00+00', '2026-12-05 09:30+00', 20, '22222222-2222-2222-2222-222222222222');

-- own-mgr: solo su propia agenda (staff A1), sin can_manage_all_bookings.
insert into auth.users (id, email, role, aud) values
  ('99999999-0000-0000-0000-000000000001', 'own-mgr@example.com', 'authenticated', 'authenticated');
insert into public.memberships (business_id, user_id, role, staff_id, can_manage_own_bookings, can_manage_all_bookings) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'staff', 'aaaaaaaa-1000-0000-0000-000000000001', true, false);

-- 1-4. Tenant-isolering, lectura (ownerA ve lo de A, cero de B) -------------
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.waitlist_entries where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 2, 'ownerA ve sus 2 entradas de la cola');
select is((select count(*) from public.waitlist_entries where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ve cero entradas de B');
select is((select count(*) from public.flash_slots where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ve su flash_slot');
select is((select count(*) from public.flash_slots where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ve cero flash_slots de B');
reset role;

-- 5-6. staffA (sin flags especiales, _helpers.psql): "hela kalendern" —
-- lectura amplia para cualquier miembro owner/staff, igual que bookings.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.waitlist_entries where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 2, 'staffA (sin flags) igual ve las entradas de A');
select is((select count(*) from public.flash_slots where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'staffA (sin flags) igual ve el flash_slot de A');
reset role;

-- 7-14. anon: cero acceso en ambas tablas (INV-3) ----------------------------
set local role anon;
select throws_ok($$ select count(*) from public.waitlist_entries $$, '42501');
select throws_ok($$ select count(*) from public.flash_slots $$, '42501');
select throws_ok(
  $$ insert into public.waitlist_entries (business_id, customer_id, service_id, day)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', '2026-12-07') $$,
  '42501'
);
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', '2026-12-08 09:00+00', '2026-12-08 09:30+00', 20, '11111111-1111-1111-1111-111111111111') $$,
  '42501'
);
select throws_ok($$ update public.waitlist_entries set status = 'removed' where id = 'aaaaaaaa-7000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ update public.flash_slots set status = 'cancelled' where id = 'aaaaaaaa-8000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.waitlist_entries where id = 'aaaaaaaa-7000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.flash_slots where id = 'aaaaaaaa-8000-0000-0000-000000000001' $$, '42501');
reset role;

-- 15-18. waitlist_entries: skrivning bara via den smala "status -> removed"-
-- policyn (ingen insert/delete-grant för authenticated, se migrationen).
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ insert into public.waitlist_entries (business_id, customer_id, service_id, day)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', '2026-12-09') $$,
  '42501'
);
select throws_ok(
  $$ delete from public.waitlist_entries where id = 'aaaaaaaa-7000-0000-0000-000000000002' $$,
  '42501'
);
select throws_ok(
  $$ update public.waitlist_entries set status = 'booked' where id = 'aaaaaaaa-7000-0000-0000-000000000002' $$,
  '42501'
);
select lives_ok(
  $$ update public.waitlist_entries set status = 'removed' where id = 'aaaaaaaa-7000-0000-0000-000000000002' $$,
  'ownerA puede marcar su propia entrada como removed (can_manage_all_bookings)'
);
reset role;

-- 19. staffA (sin can_manage_all_bookings) no puede remover una entrada: la
-- política "owners remove waitlist_entries" exige el flag, así que la fila
-- simplemente no coincide con `using` (0 filas afectadas, sin excepción) —
-- se comprueba leyendo el estado después, como postgres (bypassa RLS).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
update public.waitlist_entries set status = 'removed' where id = 'aaaaaaaa-7000-0000-0000-000000000001';
reset role;
select is((select status::text from public.waitlist_entries where id = 'aaaaaaaa-7000-0000-0000-000000000001'), 'waiting', 'staffA sin el permiso no pudo cambiar el estado (0 filas afectadas)');

-- 20-22. flash_slots: can_manage_own_bookings alcanza para la propia agenda,
-- no para la de un colega (mismo patrón que "write bookings", 20260930150100).
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.flash_slots (id, business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-8000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', '2026-12-10 09:00+00', '2026-12-10 09:30+00', 15, '99999999-0000-0000-0000-000000000001') $$,
  'own-mgr crea una flash-tida para su propia agenda (staff A1)'
);
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', '2026-12-10 10:00+00', '2026-12-10 10:30+00', 15, '99999999-0000-0000-0000-000000000001') $$,
  '42501'
);
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', '2026-12-10 10:00+00', '2026-12-10 10:30+00', 15, '99999999-0000-0000-0000-000000000001') $$,
  '42501'
);
reset role;

-- 23-26. flash_slots: no_overlap (INV-1-mönstret). Dos activas superpuestas
-- para la MISMA profesional -> 23P01. Sin solapar -> ok. Una CANCELADA que se
-- superpone con una activa -> ok (la exclusión solo aplica a status='active').
-- Corre como postgres (después del "reset role" del bloque anterior, mismo
-- patrón que 041_bookings_no_overlap.test.sql): la exclusion constraint es
-- una invariante de la BASE DE DATOS, no de RLS, y se aplica sin importar el
-- rol — se prueba aquí sin cambiar de rol a propósito.
select lives_ok(
  $$ insert into public.flash_slots (id, business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-8000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', '2026-12-11 09:00+00', '2026-12-11 09:30+00', 20, '11111111-1111-1111-1111-111111111111') $$,
  'staff A2: flash-tida activa 09:00-09:30 se crea'
);
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', '2026-12-11 09:15+00', '2026-12-11 09:45+00', 20, '11111111-1111-1111-1111-111111111111') $$,
  '23P01'
);
select lives_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', '2026-12-11 09:30+00', '2026-12-11 10:00+00', 20, '11111111-1111-1111-1111-111111111111') $$,
  'kant mot kant (09:30) está permitido, igual que bookings.no_overlap'
);
select lives_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, status, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', '2026-12-11 09:10+00', '2026-12-11 09:20+00', 20, 'cancelled', '11111111-1111-1111-1111-111111111111') $$,
  'una flash-tida cancelled que se superpone con una activa no bloquea (status <> active)'
);
reset role;

-- 27-34. Tvärtenant-FK (D-014): A no puede apuntar a filas de B, ni siquiera
-- como service_role (bypasa RLS, pero no las FK compuestas).
set local role service_role;
select throws_ok(
  $$ insert into public.waitlist_entries (business_id, customer_id, service_id, day)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', '2026-12-12') $$,
  '23503'
);
select throws_ok(
  $$ insert into public.waitlist_entries (business_id, customer_id, service_id, day)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', '2026-12-12') $$,
  '23503'
);
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-1000-0000-0000-000000000001', '2026-12-13 09:00+00', '2026-12-13 09:30+00', 20, '11111111-1111-1111-1111-111111111111') $$,
  '23503'
);
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, booking_id, status, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', '2026-12-13 09:00+00', '2026-12-13 09:30+00', 20, 'bbbbbbbb-4000-0000-0000-000000000001', 'booked', '11111111-1111-1111-1111-111111111111') $$,
  '23503'
);
select throws_ok(
  $$ update public.bookings set flash_slot_id = 'bbbbbbbb-8000-0000-0000-000000000001' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  '23503'
);
select throws_ok(
  $$ update public.bookings set waitlist_entry_id = 'bbbbbbbb-7000-0000-0000-000000000001' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  '23503'
);
select lives_ok(
  $$ update public.bookings set flash_slot_id = 'aaaaaaaa-8000-0000-0000-000000000001' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  'la reserva de A puede apuntar a su propia flash_slot'
);
select lives_ok(
  $$ update public.bookings set waitlist_entry_id = 'aaaaaaaa-7000-0000-0000-000000000002' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  'la reserva de A puede apuntar a su propia waitlist_entry'
);
reset role;

select finish();
rollback;
