-- WP-64 · Stripe Connect · INV-3/INV-4: tenant-isolering för `stripe_accounts`,
-- `stripe_checkouts` och `inbound_events`, samt `businesses.online_payment`.
-- Ägaren får LÄSA sitt eget företags rader men aldrig skriva dem (servern/
-- webhooken skriver med service role); `inbound_events` är servern-bara.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Klippning', 35, 45000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Klippning', 35, 45000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+46700000001', 'Kund A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+46700000001', 'Kund B');
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-12-02 10:00+00', '2026-12-02 10:35+00', '[)'), tstzrange('2026-12-02 10:00+00', '2026-12-02 10:35+00', '[)'), 'confirmed', 'web', 45000),
  ('bbbbbbbb-4000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-3000-0000-0000-000000000001',
   tstzrange('2026-12-02 10:00+00', '2026-12-02 10:35+00', '[)'), tstzrange('2026-12-02 10:00+00', '2026-12-02 10:35+00', '[)'), 'confirmed', 'web', 45000);

insert into public.stripe_accounts (business_id, stripe_account_id, charges_enabled) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'acct_test_a', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'acct_test_b', true);
insert into public.stripe_checkouts (id, business_id, booking_id, stripe_account_id, session_id, amount_minor, fee_minor, currency, status) values
  ('aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'acct_test_a', 'cs_test_a', 45000, 450, 'sek', 'authorized'),
  ('bbbbbbbb-6000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000001', 'acct_test_b', 'cs_test_b', 45000, 450, 'sek', 'authorized');
insert into public.inbound_events (provider, event_id) values ('stripe', 'evt_test_1');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- stripe_accounts
select is((select count(*) from public.stripe_accounts)::int, 1, 'ownerA ser bara sitt eget stripe-konto');
select throws_ok(
  $$ insert into public.stripe_accounts (business_id, stripe_account_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'acct_x') $$,
  '42501', null, 'ownerA kan inte skriva stripe_accounts (bara servern)'
);
select throws_ok(
  $$ update public.stripe_accounts set stripe_account_id = 'acct_hijack' $$,
  '42501', null, 'ownerA kan inte byta konto-id'
);

-- stripe_checkouts
select is((select count(*) from public.stripe_checkouts)::int, 1, 'ownerA ser bara sina egna checkouts');
select is((select count(*) from public.stripe_checkouts where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s checkouts');
select throws_ok(
  $$ update public.stripe_checkouts set status = 'captured' $$,
  '42501', null, 'ownerA kan inte ändra checkout-status'
);

-- inbound_events: servern-bara
select throws_ok($$ select * from public.inbound_events $$, '42501', null, 'authenticated kan inte läsa inbound_events');

-- online_payment: ägaren sätter sitt eget, inte B:s
select throws_ok(
  $$ update public.businesses set online_payment = 'optional' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'authenticated (inte ens ägaren) kan inte skriva online_payment direkt'
);

-- staffA (personal) ser inte stripe-tabellerna
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select is((select count(*) from public.stripe_accounts)::int, 0, 'personal ser inte stripe_accounts');
select is((select count(*) from public.stripe_checkouts)::int, 0, 'personal ser inte stripe_checkouts');

reset role;
select is((select online_payment from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'off', 'A: online_payment oförändrad (default)');
set local role service_role;
update public.businesses set online_payment = 'required' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select throws_ok(
  $$ update public.businesses set online_payment = 'bogus' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'ogiltigt online_payment avvisas'
);
reset role;
-- Företagsradering (purgeBusiness) måste fungera: en bokning med checkout-rad kan raderas.
delete from public.bookings where id = 'aaaaaaaa-4000-0000-0000-000000000001';
select is((select count(*) from public.stripe_checkouts where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 0, 'checkout-raden försvinner med bokningen (on delete cascade)');

set local role anon;
select throws_ok($$ select * from public.stripe_checkouts $$, '42501', null, 'anon kan inte läsa stripe_checkouts');

select finish();
rollback;
