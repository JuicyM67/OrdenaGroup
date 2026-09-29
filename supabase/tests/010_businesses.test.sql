-- INV-3/INV-4: tenant-isolering för `businesses` + `create_business()`.
-- `businesses` är tenant-roten: den har inget eget business_id-kolumn, så
-- punkterna "insert med business_id = B" och "flytta en rad till B" i
-- mallen (§5) motsvaras här av "ingen insert-policy alls" respektive
-- "inte tillämpligt" (en business kan inte peka på en annan business).
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);
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

-- WP-41 steg 1 (fortsättning, 20260929140000_business_profile_grants_and_media_check.sql):
-- ownerA får också ändra about/cover_url/instagram (kolumngrant, saknades i
-- den ursprungliga B2/qa4-listan eftersom kolumnerna inte fanns än när den
-- skrevs). Fortfarande som authenticated/ownerA.
select lives_ok(
  $$ update public.businesses set about = 'Historia de la barbería.' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ownerA kan ändra about (tillåten kolumn)'
);
select lives_ok(
  $$ update public.businesses set cover_url = 'https://example.com/cover.jpg' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ownerA kan ändra cover_url (tillåten kolumn)'
);
select lives_ok(
  $$ update public.businesses set instagram = 'barberia.norte' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ownerA kan ändra instagram (tillåten kolumn)'
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
select is(
  (select timezone from public.businesses where slug = 'nuevo-negocio-test'),
  'America/Santiago',
  'create_business() utan sjätte parameter behåller standard-timezone America/Santiago'
);

-- D-025/D-026 (20260929100000_businesses_timezone_markets.sql): servern
-- skickar marketConfig.timeZone som sjätte parameter (aldrig klienten,
-- se complete-onboarding.ts) — bevisar bara att parametern sätts och att
-- CHECK-constraint fortfarande skyddar mot godtyckliga zoner.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ select public.create_business('Bokning SE', 'bokning-se-test', 'Providencia', 'barberia', null, 'Europe/Stockholm') $$,
  'create_business() accepterar timezone-parametern för Sveriges installation'
);
-- (2-argsformen, samma mönster som övriga throws_ok-anrop i den här filen:
-- pgTAPs 3-argsvariant tolkar det tredje argumentet som förväntat SQLERRM,
-- inte som en fri beskrivning, när det andra argumentet är en 5-tecken kod.)
select throws_ok(
  $$ select public.create_business('Bad TZ', 'bad-tz-test', 'Providencia', 'barberia', null, 'America/New_York') $$,
  '23514'
);
reset role;
select is(
  (select timezone from public.businesses where slug = 'bokning-se-test'),
  'Europe/Stockholm',
  'create_business() satte timezone från den sjätte parametern'
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

-- WP-41 steg 1: about (max 1500 tecken), cover_url (samma https-regel som
-- logo_url), instagram (handtag utan @, 1–30 tecken a-z/0-9/./_).
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category, about) values ('wp41-test-about', 'X', 'Providencia', 'barberia', repeat('a', 1501)) $$,
  '23514'
);
select lives_ok(
  $$ insert into public.businesses (slug, name, comuna, category, about) values ('wp41-test-about', 'X', 'Providencia', 'barberia', 'Barbería de barrio en Providencia.') $$,
  'about inom gränsen är okej'
);
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category, cover_url) values ('wp41-test-cover', 'X', 'Providencia', 'barberia', 'http://example.com/cover.jpg') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.businesses (slug, name, comuna, category, cover_url) values ('wp41-test-cover', 'X', 'Providencia', 'barberia', 'https://example.com/cover.jpg') $$,
  'cover_url https:// accepteras'
);
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category, instagram) values ('wp41-test-ig', 'X', 'Providencia', 'barberia', '@barberianorte') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.businesses (slug, name, comuna, category, instagram) values ('wp41-test-ig', 'X', 'Providencia', 'barberia', 'barberia.norte_cl') $$,
  'instagram-handtag utan @ accepteras'
);

-- 20260929140000: lokal Supabase Storage svarar med
-- http://127.0.0.1:<port>/... (ingen TLS lokalt). Checken tillåter
-- uttryckligen bara de två loopback-värdnamnen, inget annat http://-ursprung.
select lives_ok(
  $$ insert into public.businesses (slug, name, comuna, category, cover_url) values ('wp41-test-cover-local', 'X', 'Providencia', 'barberia', 'http://127.0.0.1:54321/storage/v1/object/public/business-media/x.jpg') $$,
  'cover_url http://127.0.0.1:<port>/... accepteras (lokal Storage)'
);
select lives_ok(
  $$ insert into public.businesses (slug, name, comuna, category, logo_url) values ('wp41-test-logo-local', 'X', 'Providencia', 'barberia', 'http://localhost:54321/storage/v1/object/public/business-media/x.jpg') $$,
  'logo_url http://localhost:<port>/... accepteras (lokal Storage)'
);
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category, cover_url) values ('wp41-test-cover-bad-http', 'X', 'Providencia', 'barberia', 'http://evil.example.com/cover.jpg') $$,
  '23514'
);

-- Säkerhet S2 (rättad): service_role kan radera ett företag (WP-26), och
-- kaskaden tar bort memberships (bypasserar RLS helt, ingen delete-policy behövs).
insert into public.businesses (id, slug, name, comuna, category) values
  ('dddddddd-0000-0000-0000-000000000004', 'wp01-test-service-delete', 'Negocio D', 'Providencia', 'barberia');
insert into auth.users (id, email, role, aud) values
  ('88888888-8888-8888-8888-888888888888', 'ownerd@example.com', 'authenticated', 'authenticated');
insert into public.memberships (business_id, user_id, role) values
  ('dddddddd-0000-0000-0000-000000000004', '88888888-8888-8888-8888-888888888888', 'owner');

set local role service_role;
select lives_ok(
  $$ delete from public.businesses where id = 'dddddddd-0000-0000-0000-000000000004' $$,
  'service_role kan radera ett företag'
);
reset role;
select is(
  (select count(*) from public.memberships where business_id = 'dddddddd-0000-0000-0000-000000000004')::int, 0,
  'kaskaden tog bort medlemskapet när service_role raderade företaget'
);

select finish();
rollback;
