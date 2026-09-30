-- INV-3/INV-4: tenant-isolering för `staff`. WP-46 (steg 2): staff ser nu
-- HELA personallistan (`private.is_member(business_id, array['owner','staff'])`),
-- men kan fortfarande inte skriva utan `can_manage_team`. `vendor` (WP-35)
-- är oförändrad: ingen åtkomst alls (FRÅGA 4, se 010/011).
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s personal, noll av B:s.
select is((select count(*) from public.staff where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s personal');
select is((select count(*) from public.staff where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s personal');

-- 2. ownerA kan inte skapa personal i B.
select throws_ok(
  $$ insert into public.staff (business_id, name, color) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Intruso', 'staff-1') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.staff set name = 'Hackeado' where id = 'bbbbbbbb-1000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s personal (0 rader)');
with deleted as (
  delete from public.staff where id = 'bbbbbbbb-1000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s personal (0 rader)');

reset role;
select is((select name from public.staff where id = 'bbbbbbbb-1000-0000-0000-000000000001'), 'Staff B', 'B:s personal är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s personal till B.
select throws_ok(
  $$ update public.staff set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-1000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.staff $$, '42501');
select throws_ok($$ insert into public.staff (business_id, name, color) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Anon', 'staff-1') $$, '42501');
select throws_ok($$ update public.staff set name = 'x' where id = 'aaaaaaaa-1000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.staff where id = 'aaaaaaaa-1000-0000-0000-000000000001' $$, '42501');

-- 6. staffA ser nu A:s personal (WP-46: hela kalendern/katalogen är läsbar
-- för owner+staff), men kan fortfarande inte skriva (ingen can_manage_team).
-- vendorA ser fortfarande noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.staff)::int, 1, 'staffA ser A:s personal (bara läsning)');
select throws_ok(
  $$ insert into public.staff (business_id, name, color) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Otro', 'staff-1') $$,
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.staff)::int, 0, 'vendorA ser noll personal');

-- 7. Användare utan medlemskap ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.staff)::int, 0, 'nomember ser noll personal');

reset role;

-- Tabellspecifikt: ogiltig färg avvisas.
select throws_ok(
  $$ insert into public.staff (business_id, name, color) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', '#C9B8F5') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.staff (business_id, name, color) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 'staff-7') $$,
  '23514'
);

-- WP-41 steg 1: title (rollen som visas på profilsidan), max 100 tecken.
select throws_ok(
  $$ insert into public.staff (business_id, name, color, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 'staff-1', repeat('a', 101)) $$,
  '23514'
);

-- WP-46 uppföljning 2: en profesional utan can_manage_team kan ändra
-- SIN EGEN title (photo_url bara via servern) (`private.staff_guard_self_update`), men inte
-- name (kolumnspärr via triggern, inte RLS) och inte en kollegas rad alls
-- (RLS `using` filtrerar bort den, 0 rader — ingen exception).
insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A2', 'staff-2');
insert into auth.users (id, email, role, aud) values
  ('66666666-2222-2222-2222-222222222222', 'self-profile@example.com', 'authenticated', 'authenticated');
insert into public.memberships (business_id, user_id, role, staff_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '66666666-2222-2222-2222-222222222222', 'staff', 'aaaaaaaa-1000-0000-0000-000000000001');

select set_config('request.jwt.claims', json_build_object('sub', '66666666-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ update public.staff set photo_url = 'https://example.com/foto.jpg' where id = 'aaaaaaaa-1000-0000-0000-000000000001' $$,
  '42501',
  null,
  'photo_url sätts bara via servern, inte direkt (säkerhetsgranskning WP-46)'
);
select lives_ok(
  $$ update public.staff set title = 'Barbero senior' where id = 'aaaaaaaa-1000-0000-0000-000000000001' $$,
  'en profesional kan sätta sin EGEN title utan can_manage_team'
);
select throws_ok(
  $$ update public.staff set name = 'Otro nombre' where id = 'aaaaaaaa-1000-0000-0000-000000000001' $$,
  '42501'
);
with updated as (
  update public.staff set photo_url = 'https://example.com/otro.jpg' where id = 'aaaaaaaa-1000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'en profesional kan inte ändra en kollegas photo_url (0 rader)');

reset role;

select finish();
rollback;
