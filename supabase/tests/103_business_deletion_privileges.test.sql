-- Säkerhetsgranskning WP-26 (punkt 11, minimalt): `authenticated` (ägarens
-- app) kan inte köra de privilegierade funktionerna bakom kontoradering,
-- och kan inte ändra `deletion_requested_at` direkt (bara service_role,
-- via src/server/privacy/business.ts egen medlemskapskontroll).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
\ir _helpers.psql

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  $$ select private.run_retention() $$,
  '42501'
);

select throws_ok(
  $$ select private.delete_owner_account('11111111-1111-1111-1111-111111111111') $$,
  '42501'
);

select throws_ok(
  $$ update public.businesses set deletion_requested_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);

select throws_ok(
  $$ update public.businesses set status_before_deletion_request = 'active' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501'
);

select finish();
rollback;
