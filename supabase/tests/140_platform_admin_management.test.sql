-- WP-80 · Plattformsadmins hanteras i /admin (D-061):
-- 20261020010000_platform_admin_management.sql. Bevisar att
-- authenticated/anon fortfarande varken läser eller ändrar platform_admins,
-- att service_role nu kan lägga till/ta bort (bara servern efter
-- requireAdminForAction), och att databasen vägrar ta bort den sista adminen.
-- Fungerar oavsett hur många admins den lokala databasen redan har.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, role, aud) values
  ('e1400000-0000-4000-8000-000000000001', 'admin1-140@example.com', 'authenticated', 'authenticated'),
  ('e1400000-0000-4000-8000-000000000002', 'admin2-140@example.com', 'authenticated', 'authenticated'),
  ('e1400000-0000-4000-8000-000000000003', 'nobody-140@example.com', 'authenticated', 'authenticated');

-- 1-3. authenticated (även en admin själv) kan varken lägga till, ta bort eller läsa.
insert into private.platform_admins (user_id) values ('e1400000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'e1400000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ insert into private.platform_admins (user_id) values ('e1400000-0000-4000-8000-000000000003') $$,
  '42501'
);
select throws_ok(
  $$ delete from private.platform_admins where user_id = 'e1400000-0000-4000-8000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update private.platform_admins set added_by = null $$,
  '42501'
);
reset role;

-- 4. anon kan inte ta bort.
set local role anon;
select throws_ok(
  $$ delete from private.platform_admins $$,
  '42501'
);
reset role;

-- 5-6. service_role lägger till (med added_by) och tar bort en av flera.
set local role service_role;
select lives_ok(
  $$ insert into private.platform_admins (user_id, added_by)
     values ('e1400000-0000-4000-8000-000000000002', 'e1400000-0000-4000-8000-000000000001') $$,
  'service_role kan lägga till en admin'
);
select lives_ok(
  $$ delete from private.platform_admins where user_id = 'e1400000-0000-4000-8000-000000000002' $$,
  'service_role kan ta bort en admin när fler finns'
);
-- 7. service_role får fortfarande inte ändra rader (ingen update-grant).
select throws_ok(
  $$ update private.platform_admins set added_by = null $$,
  '42501'
);
-- 8. Sista-admin-spärren: att tömma tabellen nekas (23514), oavsett antal.
select throws_ok(
  $$ delete from private.platform_admins $$,
  '23514',
  'last_platform_admin'
);
reset role;

-- 9. Spärren gäller även postgres (och därmed kaskaden från auth.users).
select throws_ok(
  $$ delete from private.platform_admins $$,
  '23514',
  'last_platform_admin'
);

-- 10. Raderna finns kvar efter de nekade försöken.
select ok(
  exists (select 1 from private.platform_admins where user_id = 'e1400000-0000-4000-8000-000000000001'),
  'adminen finns kvar'
);

-- 11–12. Utan admins (ny miljö) blockeras inte vanliga kontoraderingar: spärren
-- gäller bara när en admin faktiskt tas bort (rättelse 20261020010200).
alter table private.platform_admins disable trigger platform_admins_keep_one;
delete from private.platform_admins;
alter table private.platform_admins enable trigger platform_admins_keep_one;
insert into auth.users (id, email, role, aud) values
  ('e1400000-0000-4000-8000-0000000000ff', 'vanlig-140@example.test', 'authenticated', 'authenticated');
select lives_ok(
  $$ delete from auth.users where id = 'e1400000-0000-4000-8000-0000000000ff' $$,
  'kontoradering fungerar när det inte finns någon admin'
);
select lives_ok(
  $$ delete from private.platform_admins where false $$,
  'en delete som inte tar bort någon admin blockeras inte'
);

select * from finish();
rollback;
