-- WP-65 · Verifierade recensioner (D-045) · INV-3/INV-4 för `reviews` och
-- `review_invites` (tenant-isolering, inga anon-policies, sammansatta FK)
-- + smala skrivningar för medlemmar och anonymiseringstriggern.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A1', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B1', 'staff-1');

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 30, 10000);

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');

insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-09-01 10:00+00', '2026-09-01 10:30+00', '[)'), tstzrange('2026-09-01 10:00+00', '2026-09-01 10:30+00', '[)'), 'completed', 'manual', 10000),
  ('aaaaaaaa-4000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-09-02 10:00+00', '2026-09-02 10:30+00', '[)'), tstzrange('2026-09-02 10:00+00', '2026-09-02 10:30+00', '[)'), 'completed', 'manual', 10000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-09-01 10:00+00', '2026-09-01 10:30+00', '[)'), tstzrange('2026-09-01 10:00+00', '2026-09-01 10:30+00', '[)'), 'completed', 'manual', 10000);

insert into public.review_invites (business_id, booking_id, token_hash) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', sha256('tok-a')),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001', sha256('tok-b'));

insert into public.reviews (id, business_id, booking_id, customer_id, rating, comment, display_name) values
  ('aaaaaaaa-9000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 5, 'Excelente', 'Cliente A.'),
  ('bbbbbbbb-9000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001', 2, 'Regular', 'Cliente B.');

-- 1-3. Tenant-isolering (ownerA) -------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.reviews where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ve su reseña');
select is((select count(*) from public.reviews where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ve cero reseñas de B');
select throws_ok($$ select count(*) from public.review_invites $$, '42501');

-- 4-7. ownerA: puede responder/reportar, no cambiar nota/texto/oculto ni borrar/insertar
select lives_ok(
  $$ update public.reviews set reply = 'Gracias', replied_at = now(), reported_at = now(), report_reason = 'other' where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$,
  'ownerA responde y reporta su reseña'
);
select throws_ok($$ update public.reviews set rating = 1 where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ update public.reviews set hidden_at = now() where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$, '42501');
select throws_ok(
  $$ insert into public.reviews (business_id, booking_id, customer_id, rating)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000002', 'aaaaaaaa-3000-0000-0000-000000000001', 5) $$,
  '42501'
);
-- 9-13. Guard (säkerhetsgranskning): la denuncia no se puede borrar ni
-- reescribir, y replied_at lo pone el trigger (no se puede bakdatera).
select throws_ok($$ update public.reviews set reported_at = null, report_reason = null where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ update public.reviews set report_reason = 'false' where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$, '42501');
select lives_ok(
  $$ update public.reviews set reply = 'Gracias de nuevo', replied_at = '2020-01-01' where id = 'aaaaaaaa-9000-0000-0000-000000000001' $$,
  'ownerA edita su respuesta'
);
reset role;
select ok((select replied_at > now() - interval '1 minute' from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001'), 'replied_at lo fija el trigger, no el cliente');
select is((select report_reason from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001'), 'other', 'la denuncia sigue intacta');
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
-- 14. ownerA no puede tocar la reseña de B (0 filas, sin excepción)
update public.reviews set reply = 'hack', replied_at = now() where id = 'bbbbbbbb-9000-0000-0000-000000000001';
reset role;
select is((select reply from public.reviews where id = 'bbbbbbbb-9000-0000-0000-000000000001'), null, 'ownerA no pudo responder la reseña de B');

-- 10-11. staffA (sin can_edit_settings): lee, pero no responde ------------
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.reviews)::int, 1, 'staffA ve las reseñas de A');
update public.reviews set reply = 'staff', replied_at = now() where id = 'aaaaaaaa-9000-0000-0000-000000000001';
reset role;
select is((select reply from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001'), 'Gracias de nuevo', 'staffA sin permiso no cambió la respuesta');

-- 12-13. vendorA / nomember: cero filas --------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.reviews)::int, 0, 'vendorA no ve reseñas');
reset role;
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.reviews)::int, 0, 'nomember no ve reseñas');
reset role;

-- 14-17. anon: cero acceso (INV-3) -------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.reviews $$, '42501');
select throws_ok($$ select count(*) from public.review_invites $$, '42501');
select throws_ok($$ update public.reviews set reply = 'x' $$, '42501');
select throws_ok(
  $$ insert into public.reviews (business_id, booking_id, customer_id, rating)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000002', 'aaaaaaaa-3000-0000-0000-000000000001', 5) $$,
  '42501'
);
reset role;

-- 18-20. Sammansatta FK + checks ---------------------------------------------
select throws_ok(
  $$ insert into public.reviews (business_id, booking_id, customer_id, rating)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000002', 'bbbbbbbb-3000-0000-0000-000000000001', 5) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.reviews (business_id, booking_id, customer_id, rating)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000002', 'aaaaaaaa-3000-0000-0000-000000000001', 6) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.reviews (business_id, booking_id, customer_id, rating)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 4) $$,
  '23505'
);

-- 21-24. Anonymisering: namn/text/svar nollas, betyget kvar, inbjudan raderad
update public.customers set anonymized_at = now(), name = null, phone_e164 = null
 where id = 'aaaaaaaa-3000-0000-0000-000000000001';
select is((select display_name from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001'), null, 'anonimizar borra el nombre');
select is((select comment from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001'), null, 'anonimizar borra el texto');
select is((select rating from public.reviews where id = 'aaaaaaaa-9000-0000-0000-000000000001')::int, 5, 'la nota se mantiene');
select is((select count(*) from public.review_invites where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 0, 'la invitación se borra');

select * from finish();
rollback;
