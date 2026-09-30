-- WP-36 · Superadmin (grunddel) · private.platform_admins / private.admin_audit_log
-- Ägarens arbetssätt 2026-09-30: EN pgTAP för den här migrationen. Bevisar
-- att varken `authenticated` eller `anon` kan läsa eller skriva de två
-- tabellerna (ingen policy alls, RLS-på-utan-policy = default deny, samma
-- mönster/test-stil som 104_rate_limits.test.sql). Globala tabeller (inget
-- business_id/tenant-koppling), inget _helpers.psql-fixturbehov.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 1-2. platform_admins: authenticated kan varken läsa eller skriva.
set local role authenticated;
select throws_ok(
  $$ select * from private.platform_admins $$,
  '42501'
);
select throws_ok(
  $$ insert into private.platform_admins (user_id) values ('11111111-1111-1111-1111-111111111111') $$,
  '42501'
);
reset role;

-- 3-4. platform_admins: anon kan varken läsa eller skriva.
set local role anon;
select throws_ok(
  $$ select * from private.platform_admins $$,
  '42501'
);
select throws_ok(
  $$ insert into private.platform_admins (user_id) values ('11111111-1111-1111-1111-111111111111') $$,
  '42501'
);
reset role;

-- 5-6. admin_audit_log: authenticated kan varken läsa eller skriva.
set local role authenticated;
select throws_ok(
  $$ select * from private.admin_audit_log $$,
  '42501'
);
select throws_ok(
  $$ insert into private.admin_audit_log (admin_user_id, action) values ('11111111-1111-1111-1111-111111111111', 'test') $$,
  '42501'
);
reset role;

-- 7-8. admin_audit_log: anon kan varken läsa eller skriva.
set local role anon;
select throws_ok(
  $$ select * from private.admin_audit_log $$,
  '42501'
);
select throws_ok(
  $$ insert into private.admin_audit_log (admin_user_id, action) values ('11111111-1111-1111-1111-111111111111', 'test') $$,
  '42501'
);
reset role;

select finish();
rollback;
