-- INV-3/INV-4: tenant-isolering för `businesses` + `create_business()`.
-- `businesses` är tenant-roten: den har inget eget business_id-kolumn, så
-- punkterna "insert med business_id = B" och "flytta en rad till B" i
-- mallen (§5) motsvaras här av "ingen insert-policy alls" respektive
-- "inte tillämpligt" (en business kan inte peka på en annan business).
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);
\ir _helpers.psql

-- 1. ownerA ser bara A (en rad), aldrig B.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.businesses)::int, 1,
  'ownerA ser exakt en business (sin egen)'
);

-- 2. Ingen insert-policy: ownerA kan inte skapa en business direkt (bara via create_business).
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category) values ('directo-a', 'Directo', 'Providencia', 'barberia') $$,
  '42501'
);

-- 3. ownerA:s update på B:s rad påverkar 0 rader.
with updated as (
  update public.businesses set name = 'Hackeado' where id = 'bbbbbbbb-0000-0000-0000-000000000002'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B (0 rader påverkade)');

reset role;
-- B:s namn är oförändrat (kontrollerat som postgres).
select is(
  (select name from public.businesses where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'Negocio B',
  'B:s namn är oförändrat efter ownerA:s försök'
);

-- Säkerhet B2/qa4: ownerA får ändra affärsfält, men inte plan/status/
-- trial_ends_at/id/timezone — de styrs bara av servern (billing, D-011,
-- WP-26). Kolumngrant, inte bara RLS: felet är "permission denied for
-- column", inte en RLS-policyträff.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select lives_ok(
  $$ update public.businesses set name = 'Negocio A renombrado' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ownerA kan ändra name (tillåten kolumn)'
);
select throws_ok(
  $$ update public.businesses set plan = 'equipo' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update public.businesses set status = 'frozen' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update public.businesses set trial_ends_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update public.businesses set timezone = 'America/Santiago' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update public.businesses set id = 'aaaaaaaa-0000-0000-0000-000000000099' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: select, insert, update, delete -> permission denied.
set local role anon;
select throws_ok(
  $$ select count(*) from public.businesses $$,
  '42501'
);
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category) values ('anon-x', 'Anon', 'Providencia', 'barberia') $$,
  '42501'
);
select throws_ok(
  $$ update public.businesses set name = 'x' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);

-- 6. staffA och vendorA ser företagets businesses-rad (men bara den).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.businesses)::int, 1, 'staffA ser sin egen businesses-rad');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.businesses)::int, 1, 'vendorA ser sin egen businesses-rad');

-- staffA kan inte uppdatera företaget.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
with updated as (
  update public.businesses set name = 'Hackeado' where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte uppdatera businesses (0 rader)');

-- 7. Användare utan medlemskap ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.businesses)::int, 0, 'nomember ser noll businesses');

reset role;

-- create_business(): skapar företag + owner-medlemskap atomärt.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ select public.create_business('Nuevo Negocio', 'nuevo-negocio-test', 'Ñuñoa', 'barberia', null) $$,
  'create_business() lyckas för en inloggad användare'
);
reset role;
select is(
  (select count(*) from public.businesses where slug = 'nuevo-negocio-test')::int, 1,
  'create_business() skapade en business'
);
select is(
  (select count(*) from public.memberships mb
     join public.businesses b on b.id = mb.business_id
     where b.slug = 'nuevo-negocio-test'
       and mb.user_id = '55555555-5555-5555-5555-555555555555'
       and mb.role = 'owner')::int,
  1,
  'create_business() skapade ett owner-medlemskap för uppringaren'
);

-- anon kan inte anropa create_business().
set local role anon;
select throws_ok(
  $$ select public.create_business('Anon Negocio', 'anon-negocio', 'Providencia', 'barberia', null) $$,
  '42501'
);
reset role;

-- Ogiltig/reserverad slug och dubblettslug ger fel.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select public.create_business('X', 'Barberia', 'Providencia', 'barberia', null) $$,
  '23514'
);
select throws_ok(
  $$ select public.create_business('X', 'api', 'Providencia', 'barberia', null) $$,
  '23514'
);
select throws_ok(
  $$ select public.create_business('X', 'test-negocio-a', 'Providencia', 'barberia', null) $$,
  '23505'
);
-- qa7: för kort/felformad slug ("-x": börjar med bindestreck, bara 2 tecken).
select throws_ok(
  $$ select public.create_business('X', '-x', 'Providencia', 'barberia', null) $$,
  '23514'
);
reset role;

-- K5: logo_url måste vara https://.
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category, logo_url) values ('wp01-test-logo', 'X', 'Providencia', 'barberia', 'http://example.com/logo.png') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.businesses (slug, name, comuna, category, logo_url) values ('wp01-test-logo', 'X', 'Providencia', 'barberia', 'https://example.com/logo.png') $$,
  'https:// accepteras'
);

select finish();
rollback;
