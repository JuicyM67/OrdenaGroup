-- WP-31 · Erbjudanden (kampanjer) (db-engineer) · INV-3/INV-4: tenant-
-- isolering för `campaigns` och `campaign_recipients` (inga anon-policies,
-- ägare eller can_manage_all_bookings via private.has_perm), plus
-- tvärtenant-FK (D-014) för campaign_recipients och för bookings'
-- nya `campaign_recipient_id`-kolumn. Egna fixturer utöver _helpers.psql
-- (staff/services/bookings behövs för FK-testerna, mgrA för
-- can_manage_all_bookings utan att vara owner, samma mönster som
-- 106_booking_permissions.test.sql).
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);
\ir _helpers.psql

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A1', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B1', 'staff-1');

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 30, 10000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 30, 10000);

insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), 'confirmed', 'manual', 10000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), tstzrange('2026-12-01 10:00+00', '2026-12-01 10:30+00', '[)'), 'confirmed', 'manual', 10000);

insert into public.campaigns (id, business_id, name, channel, audience, message, status, created_by) values
  ('aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Volvamos pronto', 'sms', '{"kind":"inactive","days":60}'::jsonb, 'Te extrañamos, vuelve con 10% dto', 'draft', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-5000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Vuelve pronto', 'sms', '{"kind":"inactive","days":60}'::jsonb, 'Te extrañamos', 'draft', '22222222-2222-2222-2222-222222222222');

insert into public.campaign_recipients (id, business_id, campaign_id, customer_id, token_hash) values
  ('aaaaaaaa-5100-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', extensions.digest('token-a', 'sha256')),
  ('bbbbbbbb-5100-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-5000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001', extensions.digest('token-b', 'sha256'));

-- mgrA: personal SIN staff_id propio, pero con can_manage_all_bookings = true
-- (no es owner) — demuestra que la RLS sigue el flag, no solo el rol.
insert into auth.users (id, email, role, aud) values
  ('99999999-0000-0000-0000-000000000001', 'mgr-a@example.com', 'authenticated', 'authenticated');
insert into public.memberships (business_id, user_id, role, can_manage_all_bookings) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'staff', true);

-- 1-4. ownerA: tenant-isolering, lectura ------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.campaigns where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ve la campaña de A');
select is((select count(*) from public.campaigns where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ve cero campañas de B');
select is((select count(*) from public.campaign_recipients where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ve el destinatario de A');
select is((select count(*) from public.campaign_recipients where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ve cero destinatarios de B');

-- 5-7. ownerA: escritura directa SIEMPRE prohibida (seguridad, 20261001130000)
-- -- aunque `has_perm` sea `true` para role = owner, el GRANT de
-- insert/update/delete ya no existe para `authenticated`: solo
-- `src/server/campaigns/send.ts` (service_role) puede escribir estas dos
-- tablas. `42501` (no `42P01`/fila inexistente): el permiso de tabla falla
-- antes de que la fila se busque.
select throws_ok(
  $$ insert into public.campaigns (id, business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-5000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Prueba', 'email', '{"kind":"all"}'::jsonb, 'Hola', 'draft', '11111111-1111-1111-1111-111111111111') $$,
  '42501'
);
select throws_ok(
  $$ update public.campaigns set status = 'sent', sent_at = now() where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.campaigns where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501'
);
reset role;

-- 8-10. staffA (sin can_manage_all_bookings): cero acceso -------------------
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.campaigns)::int, 0, 'staffA sin el permiso no ve campañas');
select is((select count(*) from public.campaign_recipients)::int, 0, 'staffA sin el permiso no ve destinatarios');
select throws_ok(
  $$ insert into public.campaigns (business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Hack', 'sms', '{"kind":"all"}'::jsonb, 'x', 'draft', '33333333-3333-3333-3333-333333333333') $$,
  '42501'
);
reset role;

-- 11-13. mgrA (can_manage_all_bookings = true, no es owner): lee igual que
-- ownerA (RLS sigue el flag, no el rol), pero tampoco puede escribir
-- directamente (seguridad, 20261001130000 — mismo motivo que 5-7).
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.campaigns where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'mgrA ve la campaña de A (can_manage_all_bookings)');
select is((select count(*) from public.campaign_recipients where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'mgrA ve el destinatario de A');
select throws_ok(
  $$ insert into public.campaigns (id, business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-5000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'De mgrA', 'sms', '{"kind":"selected","customerIds":["aaaaaaaa-3000-0000-0000-000000000001"]}'::jsonb, 'Hola', 'draft', '99999999-0000-0000-0000-000000000001') $$,
  '42501'
);
reset role;

-- 14-21. anon: cero acceso en ambas tablas (INV-3) ---------------------------
set local role anon;
select throws_ok($$ select count(*) from public.campaigns $$, '42501');
select throws_ok(
  $$ insert into public.campaigns (business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Hack', 'sms', '{"kind":"all"}'::jsonb, 'x', 'draft', '11111111-1111-1111-1111-111111111111') $$,
  '42501'
);
select throws_ok($$ update public.campaigns set status = 'sent' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.campaigns where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ select count(*) from public.campaign_recipients $$, '42501');
select throws_ok(
  $$ insert into public.campaign_recipients (business_id, campaign_id, customer_id, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', extensions.digest('x', 'sha256')) $$,
  '42501'
);
select throws_ok($$ update public.campaign_recipients set sent_at = now() where id = 'aaaaaaaa-5100-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.campaign_recipients where id = 'aaaaaaaa-5100-0000-0000-000000000001' $$, '42501');
reset role;

-- 22-25. Tvärtenant-FK (D-014): A kan inte peka på B:s kampanj/kund/mottagare
set local role service_role;
select throws_ok(
  $$ insert into public.campaign_recipients (business_id, campaign_id, customer_id, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-5000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', extensions.digest('x1', 'sha256')) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.campaign_recipients (business_id, campaign_id, customer_id, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-5000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001', extensions.digest('x2', 'sha256')) $$,
  '23503'
);
select throws_ok(
  $$ update public.bookings set campaign_recipient_id = 'bbbbbbbb-5100-0000-0000-000000000001' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  '23503'
);
select lives_ok(
  $$ update public.bookings set campaign_recipient_id = 'aaaaaaaa-5100-0000-0000-000000000001' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  'A:s bokning kan peka på A:s egen kampanj-mottagare'
);
reset role;

-- 26-28. audience: null-fällan (se migrationens kommentar) måste ge 23514,
-- inte tyst passera som "null".
select throws_ok(
  $$ insert into public.campaigns (business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Falta customerIds', 'sms', '{"kind":"selected"}'::jsonb, 'x', 'draft', '11111111-1111-1111-1111-111111111111') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.campaigns (id, business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-5000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Con customerIds', 'sms', '{"kind":"selected","customerIds":["aaaaaaaa-3000-0000-0000-000000000001"]}'::jsonb, 'x', 'draft', '11111111-1111-1111-1111-111111111111') $$,
  'selected con customerIds no vacío se guarda'
);
select throws_ok(
  $$ insert into public.campaigns (business_id, name, channel, audience, message, status, created_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Kind inválido', 'sms', '{"kind":"vip"}'::jsonb, 'x', 'draft', '11111111-1111-1111-1111-111111111111') $$,
  '23514'
);

select finish();
rollback;
