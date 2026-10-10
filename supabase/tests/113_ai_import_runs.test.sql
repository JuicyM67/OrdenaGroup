-- WP-66 · AI-import (D-046) · INV-3: tenant-isolering för `ai_import_runs`.
-- Läsning: egna rader (user_id) eller ägaren av företaget. Inga skrivgrants
-- för `authenticated` (bara servern via service_role), inget för anon.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
\ir _helpers.psql

insert into public.ai_import_runs (id, business_id, user_id, source, platform, status, model, input_tokens, output_tokens, cost_usd) values
  ('aaaaaaaa-6600-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'url', 'bokadirekt', 'ok', 'claude-opus-5-5', 20000, 3000, 0.14),
  ('bbbbbbbb-6600-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'url', 'fresha', 'ok', 'claude-opus-5-5', 20000, 3000, 0.14),
  -- onboarding: inget företag än
  ('55555555-6600-0000-0000-000000000001', null, '55555555-5555-5555-5555-555555555555', 'text', null, 'ok', 'claude-opus-5-5', 5000, 2000, 0.06);

-- 1-4. ownerA
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.ai_import_runs where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1, 'ownerA ve la importación de A');
select is((select count(*) from public.ai_import_runs where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA no ve importaciones de B');
select is((select count(*) from public.ai_import_runs where business_id is null)::int, 0, 'ownerA no ve importaciones de onboarding ajenas');
select throws_ok(
  $$ insert into public.ai_import_runs (business_id, user_id, source, status, model)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'url', 'ok', 'x') $$,
  '42501'
);
reset role;

-- 5-6. staffA (no es dueño): no ve las del negocio, no puede borrar
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.ai_import_runs)::int, 0, 'staffA no ve importaciones');
select throws_ok($$ delete from public.ai_import_runs $$, '42501');
reset role;

-- 7-8. nomember ve solo su propia fila de onboarding, no puede actualizarla
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.ai_import_runs)::int, 1, 'nomember ve solo su propia importación');
select throws_ok($$ update public.ai_import_runs set cost_usd = 0 $$, '42501');
reset role;

-- 9-10. anon: cero acceso
set local role anon;
select throws_ok($$ select count(*) from public.ai_import_runs $$, '42501');
select throws_ok(
  $$ insert into public.ai_import_runs (user_id, source, status, model)
     values ('11111111-1111-1111-1111-111111111111', 'url', 'ok', 'x') $$,
  '42501'
);
reset role;

-- 11-12. service_role escribe; CHECK de plataforma rechaza una URL
set local role service_role;
select lives_ok(
  $$ update public.ai_import_runs set status = 'ok' where id = 'aaaaaaaa-6600-0000-0000-000000000001' $$,
  'service_role actualiza'
);
select throws_ok(
  $$ insert into public.ai_import_runs (user_id, source, platform, status, model)
     values ('11111111-1111-1111-1111-111111111111', 'url', 'https://x.se/a', 'ok', 'x') $$,
  '23514'
);
reset role;

select * from finish();
rollback;
