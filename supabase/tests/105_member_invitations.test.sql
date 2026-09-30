-- WP-46 · Steg 4-5 (db-engineer) · INV-3/INV-4: tenant-isolering för
-- `member_invitations`, plus tabellspecifika regler (D-014, K1, partiellt
-- unikt index).
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A2', 'staff-2'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');

insert into public.member_invitations (id, business_id, email, staff_id, invited_by, token_hash) values
  ('aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'nuevo@example.com',
   'aaaaaaaa-1000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', extensions.digest('token-a', 'sha256')),
  ('bbbbbbbb-6000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'nuevo@example.com',
   'bbbbbbbb-1000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', extensions.digest('token-b', 'sha256'));

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s inbjudan, noll av B:s.
select is((select count(*) from public.member_invitations where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ser A:s inbjudan');
select is((select count(*) from public.member_invitations where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s inbjudningar');

-- 2. ownerA kan inte bjuda in till B.
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'intruso@example.com', 'bbbbbbbb-1000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', extensions.digest('token-x', 'sha256')) $$,
  '42501'
);

-- 3. ownerA:s update på B:s rad påverkar 0 rader, B oförändrat. Ingen delete-policy alls.
with updated as (
  update public.member_invitations set revoked_at = now() where id = 'bbbbbbbb-6000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte återkalla B:s inbjudan (0 rader)');
select throws_ok(
  $$ delete from public.member_invitations where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$,
  '42501'
);

reset role;
select is((select revoked_at from public.member_invitations where id = 'bbbbbbbb-6000-0000-0000-000000000001'), null, 'B:s inbjudan är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan återkalla A:s egen inbjudan.
select lives_ok(
  $$ update public.member_invitations set revoked_at = now() where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$,
  'ownerA kan återkalla A:s egen inbjudan'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.member_invitations $$, '42501');
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'anon@example.com', 'aaaaaaaa-1000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', extensions.digest('token-anon', 'sha256')) $$,
  '42501'
);
select throws_ok($$ update public.member_invitations set revoked_at = now() where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.member_invitations where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader och kan inte skriva (bara ägaren, D-034).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.member_invitations)::int, 0, 'staffA ser noll inbjudningar');
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'otro@example.com', 'aaaaaaaa-1000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', extensions.digest('token-staffa', 'sha256')) $$,
  '42501'
);
-- RLS-`using` filtrerar bort raden helt för staffA (ingen exception, precis
-- som update/delete-testerna mot B:s rad ovan): 0 rader, inte ett fel.
with updated as (
  update public.member_invitations set revoked_at = now() where id = 'aaaaaaaa-6000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte återkalla en inbjudan (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.member_invitations)::int, 0, 'vendorA ser noll inbjudningar');

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.member_invitations)::int, 0, 'nomember ser noll inbjudningar');

reset role;

-- 8. Tvärtenant-FK (D-014): A kan inte bjuda in med en staff_id som tillhör B.
set local role service_role;
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'x@example.com', 'bbbbbbbb-1000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', extensions.digest('token-cross', 'sha256')) $$,
  '23503'
);

-- K1: token_hash måste vara exakt 32 byte (SHA-256).
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'x@example.com', 'aaaaaaaa-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '\x1234') $$,
  '23514'
);

-- E-postformat.
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'no-es-un-correo', 'aaaaaaaa-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', extensions.digest('token-email', 'sha256')) $$,
  '23514'
);

-- Partiellt unikt index: högst EN levande (varken accepterad eller
-- återkallad) inbjudan per personalrad. aaaaaaaa-1000-…-0002 har ingen
-- inbjudan ännu (…0001 användes ovan och är nu återkallad, vilket INTE
-- räknas som "levande" längre).
select lives_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'staff-a2@example.com', 'aaaaaaaa-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', extensions.digest('token-a2-first', 'sha256')) $$,
  'en första levande inbjudan till en personalrad är okej'
);
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'staff-a2-otra@example.com', 'aaaaaaaa-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', extensions.digest('token-a2-second', 'sha256')) $$,
  '23505'
);
-- En återkallad inbjudan lämnar plats för en ny.
select lives_ok(
  $$ update public.member_invitations set revoked_at = now()
     where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and staff_id = 'aaaaaaaa-1000-0000-0000-000000000002' and revoked_at is null $$,
  'återkallar den första inbjudan till A2'
);
select lives_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'staff-a2-tercera@example.com', 'aaaaaaaa-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', extensions.digest('token-a2-third', 'sha256')) $$,
  'efter återkallelse kan en ny inbjudan skickas till samma personalrad'
);

reset role;

select finish();
rollback;
