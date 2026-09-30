-- INV-3/INV-4: tenant-isolering för `consent_events` (WP-26 steg 1), plus
-- att `authenticated` bara får läsa (append-only, skrivning bara service_role).
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
\ir _helpers.psql

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');

-- Rader skrivna av servern (service_role, D-019): två kund-samtycken (en per
-- företag) och ett ägar-samtycke (onboarding, A).
set local role service_role;
insert into public.consent_events (id, business_id, customer_id, subject, kind, version, channel, granted) values
  ('aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'terms', '2026-10-v1', 'web', true),
  ('bbbbbbbb-6000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-3000-0000-0000-000000000001', 'customer', 'terms', '2026-10-v1', 'web', true),
  ('aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', null, 'owner', 'owner_terms', '2026-10-v1', 'web', true);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s två rader, noll av B:s.
select is((select count(*) from public.consent_events where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 2, 'ownerA ser A:s samtyckeshändelser');
select is((select count(*) from public.consent_events where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s samtyckeshändelser');

-- 2. ownerA kan inte skriva (ingen insert/update/delete-grant för authenticated).
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'terms', 'x', 'manual', true) $$,
  '42501'
);
select throws_ok(
  $$ update public.consent_events set customer_id = null where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.consent_events where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ update public.consent_events set customer_id = null where id = 'bbbbbbbb-6000-0000-0000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.consent_events where id = 'bbbbbbbb-6000-0000-0000-000000000001' $$,
  '42501'
);

reset role;
select is(
  (select customer_id from public.consent_events where id = 'aaaaaaaa-6000-0000-0000-000000000001')::text,
  'aaaaaaaa-3000-0000-0000-000000000001',
  'A:s rad är oförändrad (ingen update lyckades)'
);

-- 3. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.consent_events $$, '42501');
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'terms', 'x', 'manual', true) $$,
  '42501'
);
select throws_ok($$ update public.consent_events set customer_id = null where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.consent_events where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$, '42501');

-- 4. staffA/vendorA/nomember ser noll rader (samma "owner/admin"-nivå som message_outbox).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.consent_events)::int, 0, 'staffA ser noll samtyckeshändelser');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.consent_events)::int, 0, 'vendorA ser noll samtyckeshändelser');

select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.consent_events)::int, 0, 'nomember ser noll samtyckeshändelser');

reset role;

-- 5. service_role: kan läsa, skapa och nolla customer_id (append-only).
set local role service_role;
select lives_ok(
  $$ update public.consent_events set customer_id = null where id = 'aaaaaaaa-6000-0000-0000-000000000001' $$,
  'service_role kan koppla loss customer_id (anonymisering)'
);
select throws_ok(
  $$ update public.consent_events set version = 'x' where id = 'aaaaaaaa-6000-0000-0000-000000000002' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.consent_events where id = 'aaaaaaaa-6000-0000-0000-000000000002' $$,
  '42501'
);
reset role;

-- 6. Tvärtenant-FK: A kan inte peka på B:s kund (D-014).
set local role service_role;
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001', 'customer', 'terms', 'x', 'manual', true) $$,
  '23503'
);

-- 7. subject/kind måste höra ihop, och customer_id kräver subject = 'customer'.
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'owner_terms', 'x', 'manual', true) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'owner', 'owner_terms', 'x', 'manual', true) $$,
  '23514'
);
select lives_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', null, 'owner', 'dpa', 'x', 'web', true) $$,
  'ett giltigt ägar-samtycke (dpa, ingen customer_id) sparas'
);
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', null, 'customer', 'terms', '', 'manual', true) $$,
  '23514'
);
reset role;

select finish();
rollback;
