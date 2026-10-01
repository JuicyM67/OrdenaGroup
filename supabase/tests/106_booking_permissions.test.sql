-- WP-46 · Steg 2 (db-engineer) · Behörighetsflaggor på `bookings`:
-- can_manage_own_bookings/can_manage_all_bookings (bas-RLS) och
-- can_cancel_bookings (triggern `private.bookings_guard_status`, status →
-- 'cancelled'). Egna fixturer (inte `_helpers.psql`:s staffA, som saknar
-- staff_id och alltså inte kan representera "min egen bokning").
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 1', 'staff-1'),
  ('aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 2', 'staff-2'),
  ('aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff 3', 'staff-3');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A');

-- booking1: requested, staff 1 (own-mgr:s egen). booking2: confirmed,
-- staff 2 (kollegans, ingens egen). booking3: confirmed, staff 1 (own-mgr:s
-- egen, men redan bekräftad — inte en förfrågan, för punkt 6/8). booking4:
-- confirmed, staff 3 (cancel-mgr:s egen, för punkt 9). Tre olika
-- personalrader: en person per personalrad (det partiella unika indexet
-- `memberships_business_id_staff_id_uidx`, steg 1, tillåter bara ETT konto
-- per personalrad).
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), tstzrange('2026-11-02 10:00+00', '2026-11-02 10:35+00', '[)'), 'requested', 'web', 12000),
  ('aaaaaaaa-4000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 11:00+00', '2026-11-02 11:35+00', '[)'), tstzrange('2026-11-02 11:00+00', '2026-11-02 11:35+00', '[)'), 'confirmed', 'manual', 12000),
  ('aaaaaaaa-4000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 12:00+00', '2026-11-02 12:35+00', '[)'), tstzrange('2026-11-02 12:00+00', '2026-11-02 12:35+00', '[)'), 'confirmed', 'manual', 12000),
  ('aaaaaaaa-4000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 13:00+00', '2026-11-02 13:35+00', '[)'), tstzrange('2026-11-02 13:00+00', '2026-11-02 13:35+00', '[)'), 'confirmed', 'manual', 12000);

-- booking5: cancel_requested, staff 1 (own-mgr:s egen), väntande
-- avbokningsförfrågan på en tidigare confirmed bokning (WP-56-uppföljning,
-- punkt 5b).
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, status_before_cancel_request) values
  ('aaaaaaaa-4000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-11-02 14:00+00', '2026-11-02 14:35+00', '[)'), tstzrange('2026-11-02 14:00+00', '2026-11-02 14:35+00', '[)'), 'cancel_requested', 'web', 12000, 'confirmed');

-- Fyra nya konton, ett per scenario (inte _helpers.psql:s staffA).
insert into auth.users (id, email, role, aud) values
  ('99999999-0000-0000-0000-000000000001', 'own-mgr@example.com', 'authenticated', 'authenticated'),
  ('99999999-0000-0000-0000-000000000002', 'all-mgr@example.com', 'authenticated', 'authenticated'),
  ('99999999-0000-0000-0000-000000000003', 'cancel-mgr@example.com', 'authenticated', 'authenticated'),
  ('99999999-0000-0000-0000-000000000004', 'cancel-only@example.com', 'authenticated', 'authenticated');

insert into public.memberships (business_id, user_id, role, staff_id, can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings) values
  -- Staff 1, bara sin egen agenda.
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'staff', 'aaaaaaaa-1000-0000-0000-000000000001', true, false, false),
  -- Ingen egen personalrad, men hanterar ALLA bokningar.
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000002', 'staff', null, false, true, false),
  -- Staff 3, egen agenda + rätt att avboka (inte bara neka förfrågningar).
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000003', 'staff', 'aaaaaaaa-1000-0000-0000-000000000003', true, false, true),
  -- Bara can_cancel_bookings, varken egen eller allas agenda.
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000004', 'staff', null, false, false, true);

-- 1. "Hela kalendern": own-mgr ser alla fyra bokningarna i A, trots att hen
-- bara får ÄNDRA sin egen (staff 1).
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.bookings where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 5, 'own-mgr ser hela kalendern (5 bokningar)');

-- 2. own-mgr kan ändra sin EGEN bokning (booking1, staff 1).
select lives_ok(
  $$ update public.bookings set notes = 'Nota propia' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  'own-mgr kan ändra sin egen bokning'
);

-- 3. own-mgr kan INTE ändra kollegans bokning (booking2, staff 2) — 0 rader,
-- inget fel (RLS-`using` filtrerar bort raden helt för UPDATE).
with updated as (
  update public.bookings set notes = 'Hackeado' where id = 'aaaaaaaa-4000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'own-mgr kan inte ändra kollegans bokning (0 rader)');

-- 4. own-mgr kan INTE flytta sin EGEN bokning till en kollega: `using`
-- matchar (raden är hens, staff 1), men `with check` nekar (NEW.staff_id
-- måste också vara hens egen) — Postgres svarar med ett RLS-fel, inte "0
-- rader", eftersom raden redan var synlig/vald.
select throws_ok(
  $$ update public.bookings set staff_id = 'aaaaaaaa-1000-0000-0000-000000000002' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. Nekande (status requested -> cancelled) av EGEN förfrågan: tillåtet med
-- bara can_manage_own_bookings (ingen can_cancel_bookings behövs, planens
-- "ELLER"-regel).
select lives_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'declined' where id = 'aaaaaaaa-4000-0000-0000-000000000001' $$,
  'own-mgr kan neka sin egen förfrågan (requested -> cancelled) utan can_cancel_bookings'
);

-- 5b. Godkänna (cancel_requested -> cancelled) EGEN avbokningsförfrågan
-- (booking5, WP-56-uppföljning): tillåtet med bara can_manage_own_bookings,
-- samma lätta regel som att neka en vanlig förfrågan (punkt 5) — ingen
-- can_cancel_bookings krävs för att hantera en FÖRFRÅGAN, oavsett om den är
-- en ny bokning eller en avbokning.
select lives_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_at = now(), status_before_cancel_request = null where id = 'aaaaaaaa-4000-0000-0000-000000000005' $$,
  'own-mgr kan godkänna avbokning på egen bokning (cancel_requested -> cancelled) utan can_cancel_bookings'
);

-- 6. AVBOKA (inte neka) en redan CONFIRMED egen bokning (booking3) kräver
-- specifikt can_cancel_bookings — own-mgr saknar den, triggern nekar.
select throws_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'owner' where id = 'aaaaaaaa-4000-0000-0000-000000000003' $$,
  '42501'
);

-- 7. all-mgr (can_manage_all_bookings, ingen egen staff_id) KAN flytta
-- vem som helsts bokning till vem som helst.
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select lives_ok(
  $$ update public.bookings set staff_id = 'aaaaaaaa-1000-0000-0000-000000000001' where id = 'aaaaaaaa-4000-0000-0000-000000000002' $$,
  'all-mgr kan flytta valfri bokning till valfri profesional'
);

-- 8. all-mgr kan INTE avboka en confirmed bokning utan can_cancel_bookings
-- (samma regel som own-mgr i punkt 6 — manage_all räcker bara för att NEKA
-- en förfrågan, inte för att AVBOKA en redan bekräftad bokning).
select throws_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'owner' where id = 'aaaaaaaa-4000-0000-0000-000000000003' $$,
  '42501'
);

-- 9. cancel-mgr (egen agenda + can_cancel_bookings) KAN avboka sin egen
-- confirmed bokning (booking4, staff 3 — cancel-mgr:s egen personalrad).
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select lives_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'owner' where id = 'aaaaaaaa-4000-0000-0000-000000000004' $$,
  'cancel-mgr kan avboka sin egen confirmed-bokning (har can_cancel_bookings)'
);

-- 10. cancel-only (BARA can_cancel_bookings, varken manage_own eller
-- manage_all) kan inte ens RÖRA en bokning — bas-RLS:ens `using`-klausul
-- kräver manage_own/manage_all för att raden ska vara synlig för UPDATE
-- överhuvudtaget; can_cancel_bookings är bara en EXTRA spärr som triggern
-- lägger på OVANPÅ den bas-åtkomsten, inte en egen bas-åtkomst. Dokumenterat
-- val (WP-46-uppdraget: "välj en tydlig regel") — en ägare som bara vill ge
-- någon rätt att avboka måste alltså också ge can_manage_own_bookings eller
-- can_manage_all_bookings.
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
with updated as (
  update public.bookings set notes = 'x' where id = 'aaaaaaaa-4000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'cancel-only kan inte röra någon bokning utan manage_own/manage_all (0 rader)');

-- 11. cancel-only ser ändå hela kalendern (rollen staff räcker för SELECT).
select is((select count(*) from public.bookings where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 5, 'cancel-only ser ändå hela kalendern');

-- 12. own-mgr kan inte läsa `memberships` för de andra kontona (bara sin
-- egen rad — INV-4/S3, ingen ändring i WP-46: se 011_memberships.test.sql).
select set_config('request.jwt.claims', json_build_object('sub', '99999999-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is(
  (select count(*) from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id <> '99999999-0000-0000-0000-000000000001')::int,
  0,
  'own-mgr ser ingen annans membership-rad'
);

-- 13. own-mgr kan inte ändra sina EGNA flaggor (bara ägaren, D-034) — 0
-- rader, RLS-`using` på "owners update" kräver role = owner.
with updated as (
  update public.memberships set can_manage_all_bookings = true
   where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '99999999-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'own-mgr kan inte höja sina egna flaggor (0 rader)');

reset role;

-- 14. Ägaren (alltid allt, oavsett flaggor) kan avboka VILKEN status som
-- helst, inklusive en redan confirmed bokning, utan att någon can_cancel_
-- bookings-kolumn ens finns satt på owner-raden (D-034-kortslutningen i
-- `private.has_perm`).
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'owner' where id = 'aaaaaaaa-4000-0000-0000-000000000002' $$,
  'ownerA kan alltid avboka, oavsett status och flaggor'
);

reset role;

select finish();
rollback;
