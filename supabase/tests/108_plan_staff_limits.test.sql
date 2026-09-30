-- WP-46 · Uppföljning (db-engineer) · D-037: personalgräns per plan
-- (free 1, emprende 1, equipo 3, local 10 — totalt antal konton inklusive
-- ägaren). `private.plan_staff_limit`/`private.staff_seat_count`,
-- 20260930160000_plan_staff_limits.sql. Triggern
-- `member_invitations_guard_limit` (20260930150300) är oförändrad — bara
-- gränsens SIFFROR och vad som räknas har bytts.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.businesses (id, slug, name, comuna, category, plan) values
  ('cccccccc-1000-0000-0000-000000000001', 'test-emprende', 'Emprende Biz', 'Providencia', 'barberia', 'emprende'),
  ('cccccccc-1000-0000-0000-000000000002', 'test-equipo', 'Equipo Biz', 'Providencia', 'barberia', 'equipo');

insert into auth.users (id, email, role, aud) values
  ('cccccccc-2000-0000-0000-000000000001', 'owner-emprende@example.com', 'authenticated', 'authenticated'),
  ('cccccccc-2000-0000-0000-000000000002', 'owner-equipo@example.com', 'authenticated', 'authenticated');

insert into public.memberships (business_id, user_id, role) values
  ('cccccccc-1000-0000-0000-000000000001', 'cccccccc-2000-0000-0000-000000000001', 'owner'),
  ('cccccccc-1000-0000-0000-000000000002', 'cccccccc-2000-0000-0000-000000000002', 'owner');

insert into public.staff (id, business_id, name, color) values
  ('cccccccc-3000-0000-0000-000000000001', 'cccccccc-1000-0000-0000-000000000001', 'E-Staff 1', 'staff-1'),
  ('cccccccc-3000-0000-0000-000000000011', 'cccccccc-1000-0000-0000-000000000002', 'Q-Staff 1', 'staff-1'),
  ('cccccccc-3000-0000-0000-000000000012', 'cccccccc-1000-0000-0000-000000000002', 'Q-Staff 2', 'staff-2'),
  ('cccccccc-3000-0000-0000-000000000013', 'cccccccc-1000-0000-0000-000000000002', 'Q-Staff 3', 'staff-3');

-- 1-2. Sanity: gränserna är exakt de beslutade siffrorna.
select is(private.plan_staff_limit('emprende'::public.business_plan), 1, 'emprende: gräns 1');
select is(private.plan_staff_limit('equipo'::public.business_plan), 3, 'equipo: gräns 3');

-- 3. emprende (bara ägaren, redan vid gränsen 1) kan inte bjuda in alls.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-2000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('cccccccc-1000-0000-0000-000000000001', 'nuevo@example.com', 'cccccccc-3000-0000-0000-000000000001',
             'cccccccc-2000-0000-0000-000000000001', extensions.digest('token-emprende', 'sha256')) $$,
  '42501'
);
reset role;

-- 4-6. equipo (ägaren + gräns 3): två inbjudningar går bra, den tredje
-- (skulle ge totalt 4 konton/platser) nekas.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-2000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('cccccccc-1000-0000-0000-000000000002', 'uno@example.com', 'cccccccc-3000-0000-0000-000000000011',
             'cccccccc-2000-0000-0000-000000000002', extensions.digest('token-equipo-1', 'sha256')) $$,
  'equipo: första inbjudan (totalt 2 platser) är okej'
);
select lives_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('cccccccc-1000-0000-0000-000000000002', 'dos@example.com', 'cccccccc-3000-0000-0000-000000000012',
             'cccccccc-2000-0000-0000-000000000002', extensions.digest('token-equipo-2', 'sha256')) $$,
  'equipo: andra inbjudan (totalt 3 platser, precis vid gränsen) är okej'
);
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('cccccccc-1000-0000-0000-000000000002', 'tres@example.com', 'cccccccc-3000-0000-0000-000000000013',
             'cccccccc-2000-0000-0000-000000000002', extensions.digest('token-equipo-3', 'sha256')) $$,
  '42501'
);
reset role;

select finish();
rollback;
