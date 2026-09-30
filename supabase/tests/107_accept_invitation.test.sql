-- WP-46 · Steg 5 (db-engineer) · `public.accept_invitation(token)`
-- Lyckad väg (rätt token, rätt e-post, rätt status) + varje felväg planen
-- kräver: fel e-post, utgången, återkallad, redan använd, okänd token, ingen
-- session. Plus skiftlägesokänslig e-postjämförelse.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
\ir _helpers.psql

-- D-037: personalgräns per plan (free/emprende 1, equipo 3, local 10,
-- totalt inklusive ägaren). _helpers.psql:s A är 'free' (default) — bara
-- ägarens egen plats. Den här filen testar accept_invitation, inte gränsen
-- i sig (se 108_plan_staff_limits.test.sql), och skapar flera samtidiga
-- inbjudningar — höj planen så att de får plats.
update public.businesses set plan = 'local' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 'Happy', 'staff-1'),
  ('aaaaaaaa-1000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001', 'WrongEmail', 'staff-2'),
  ('aaaaaaaa-1000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001', 'Expired', 'staff-3'),
  ('aaaaaaaa-1000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-000000000001', 'Revoked', 'staff-4'),
  ('aaaaaaaa-1000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-000000000001', 'CaseInsensitive', 'staff-5');

insert into auth.users (id, email, role, aud) values
  ('99999999-1000-0000-0000-000000000001', 'nuevo@example.com', 'authenticated', 'authenticated'),
  ('99999999-1000-0000-0000-000000000002', 'otra-persona@example.com', 'authenticated', 'authenticated'),
  ('99999999-1000-0000-0000-000000000003', 'mayus@example.com', 'authenticated', 'authenticated');

insert into public.member_invitations (id, business_id, email, staff_id, invited_by, token_hash, expires_at) values
  ('aaaaaaaa-6000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 'nuevo@example.com',
   'aaaaaaaa-1000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', extensions.digest('t-happy', 'sha256'), now() + interval '7 days'),
  ('aaaaaaaa-6000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001', 'alguien@example.com',
   'aaaaaaaa-1000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', extensions.digest('t-wrongemail', 'sha256'), now() + interval '7 days'),
  ('aaaaaaaa-6000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001', 'nuevo@example.com',
   'aaaaaaaa-1000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', extensions.digest('t-expired', 'sha256'), now() - interval '1 hour'),
  ('aaaaaaaa-6000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-000000000001', 'MAYUS@example.com',
   'aaaaaaaa-1000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', extensions.digest('t-case', 'sha256'), now() + interval '7 days');

-- Återkallad inbjudan (kan inte sättas direkt vid insert p.g.a.
-- member_invitations_accepted_xor_revoked, men revoked_at ensamt är okej —
-- konstruerad med en egen insert + update som postgres).
insert into public.member_invitations (id, business_id, email, staff_id, invited_by, token_hash, expires_at) values
  ('aaaaaaaa-6000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-000000000001', 'nuevo@example.com',
   'aaaaaaaa-1000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', extensions.digest('t-revoked', 'sha256'), now() + interval '7 days');
update public.member_invitations set revoked_at = now() where id = 'aaaaaaaa-6000-0000-0000-000000000014';

-- 1. Ingen session (anon saknar EXECUTE-grant, och funktionen kräver auth.uid() ändå).
set local role anon;
select throws_ok($$ select public.accept_invitation('t-happy') $$, '42501');
reset role;

-- 2. Okänd token -> P0002.
select set_config('request.jwt.claims', json_build_object('sub', '99999999-1000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select public.accept_invitation('does-not-exist') $$, 'P0002');

-- 3. Fel e-post: loggad in som nuevo@example.com, men inbjudan …0012 är för alguien@example.com.
select throws_ok($$ select public.accept_invitation('t-wrongemail') $$, '42501');

-- 4. Utgången inbjudan.
select throws_ok($$ select public.accept_invitation('t-expired') $$, 'P0001');

-- 5. Återkallad inbjudan.
select throws_ok($$ select public.accept_invitation('t-revoked') $$, 'P0001');

-- 6. Lyckad väg: rätt e-post, skapar membership med rätt roll/staff_id/flaggor.
select lives_ok(
  $$ select public.accept_invitation('t-happy') $$,
  'rätt token + rätt e-post accepterar inbjudan'
);
select is(
  (select role::text from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '99999999-1000-0000-0000-000000000001'),
  'staff',
  'membership fick rollen staff'
);
select is(
  (select staff_id from public.memberships where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '99999999-1000-0000-0000-000000000001'),
  'aaaaaaaa-1000-0000-0000-000000000011',
  'membership kopplades till rätt personalrad'
);
-- `member_invitations` är bara läsbar för ägaren (D-034) — inte för den
-- nyaccepterade staff-medlemmen själv, så kontrollen görs som `postgres`
-- (förbigår RLS, samma mönster som resten av filen när en rad ska läsas
-- oavsett roll).
reset role;
select is(
  (select accepted_at is not null from public.member_invitations where id = 'aaaaaaaa-6000-0000-0000-000000000011'),
  true,
  'inbjudan har fått accepted_at'
);
select set_config('request.jwt.claims', json_build_object('sub', '99999999-1000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 7. Redan använd (samma token igen).
select throws_ok($$ select public.accept_invitation('t-happy') $$, 'P0001');

-- 8. Skiftlägesokänslig e-postjämförelse: inbjudan för "MAYUS@example.com",
-- kontot har "mayus@example.com".
reset role;
select set_config('request.jwt.claims', json_build_object('sub', '99999999-1000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ select public.accept_invitation('t-case') $$,
  'e-postjämförelsen är skiftlägesokänslig'
);

reset role;

select finish();
rollback;
