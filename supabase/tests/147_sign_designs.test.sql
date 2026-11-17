-- WP-96 (D-080) · Skylteditorn: 20261118010000_business_sign_designs.sql.
-- businesses.sign_designs skrivs bara av medlemmar med can_edit_settings i sitt
-- eget företag (RLS "owners update" + kolumngrant) och är alltid ett litet objekt.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
\ir _helpers.psql

-- 1. Standardvärdet är ett tomt objekt.
select is(
  (select sign_designs from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '{}'::jsonb, 'standard: tomt objekt');

-- Som ägare A.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 2. Ägaren sparar en design.
select lives_ok(
  $$ update public.businesses set sign_designs = '{"v": 1, "reservas": {"paleta": "rosa"}}'
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ägaren sparar en design');

-- 3-4. Checken: bara objekt, och en övre gräns för storleken.
select throws_ok(
  $$ update public.businesses set sign_designs = '[]'
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'en array nekas');
select throws_ok(
  $$ update public.businesses set sign_designs = jsonb_build_object('v', 1, 'x', repeat('a', 9000))
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'en för stor design nekas');

-- 5. Ägare B kan inte ändra företag A (RLS: ingen rad uppdateras).
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
update public.businesses set sign_designs = '{"v": 1, "reservas": {"paleta": "lima"}}'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- 6. Personal utan can_edit_settings kan inte heller.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
update public.businesses set sign_designs = '{"v": 1, "reservas": {"paleta": "salvia"}}'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';

reset role;

select is(
  (select sign_designs->'reservas'->>'paleta' from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'rosa', 'ägare B ändrade inte företag A');
select is(
  (select sign_designs->'reservas'->>'paleta' from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'rosa', 'personal utan can_edit_settings ändrade inte');

-- 7. Kolumngranten finns för authenticated (RLS styr vilka rader).
select is(
  has_column_privilege('authenticated', 'public.businesses', 'sign_designs', 'UPDATE'),
  true, 'authenticated har update på sign_designs');

select * from finish();
rollback;
