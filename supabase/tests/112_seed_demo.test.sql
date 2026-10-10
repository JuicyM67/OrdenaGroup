-- WP-63 (D-043) · private.seed_demo: idempotent och rör bara demoföretagets id.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
\ir _helpers.psql

-- Ögonblicksbild av allt som INTE är demo (fixturer + ev. seed).
create temp table before_other as
select
  (select count(*) from public.businesses where id::text not like 'de00000%') as biz,
  (select count(*) from public.staff where business_id::text not like 'de00000%') as staff,
  (select count(*) from public.services where business_id::text not like 'de00000%') as services,
  (select count(*) from public.bookings where business_id::text not like 'de00000%') as bookings,
  (select count(*) from public.customers where business_id::text not like 'de00000%') as customers,
  (select count(*) from public.flash_slots where business_id::text not like 'de00000%') as flash;

select lives_ok($$ select private.seed_demo('SE') $$, 'första körningen');

create temp table first_run as
select
  (select count(*) from public.staff where business_id = 'de000002-0000-0000-0000-000000000001') as staff,
  (select count(*) from public.services where business_id = 'de000002-0000-0000-0000-000000000001') as services,
  (select count(*) from public.bookings where business_id = 'de000002-0000-0000-0000-000000000001') as bookings,
  (select count(*) from public.flash_slots where business_id = 'de000002-0000-0000-0000-000000000001' and status = 'active') as flash;

select lives_ok($$ select private.seed_demo('SE') $$, 'andra körningen');

select is(
  (select row(
    (select count(*) from public.staff where business_id = 'de000002-0000-0000-0000-000000000001'),
    (select count(*) from public.services where business_id = 'de000002-0000-0000-0000-000000000001'),
    (select count(*) from public.bookings where business_id = 'de000002-0000-0000-0000-000000000001'),
    (select count(*) from public.flash_slots where business_id = 'de000002-0000-0000-0000-000000000001' and status = 'active')
  )::text),
  (select row(staff, services, bookings, flash)::text from first_run),
  'idempotent: samma antal efter andra körningen'
);

select ok(
  (select staff >= 4 and services >= 6 and bookings > 0 and flash > 0 from first_run),
  'demon har personal, tjänster, bokningar och horas flash'
);

select is(
  (select row(
    (select count(*) from public.businesses where id::text not like 'de00000%'),
    (select count(*) from public.staff where business_id::text not like 'de00000%'),
    (select count(*) from public.services where business_id::text not like 'de00000%'),
    (select count(*) from public.bookings where business_id::text not like 'de00000%'),
    (select count(*) from public.customers where business_id::text not like 'de00000%'),
    (select count(*) from public.flash_slots where business_id::text not like 'de00000%')
  )::text),
  (select row(biz, staff, services, bookings, customers, flash)::text from before_other),
  'andra företag rörs inte'
);

select throws_ok(
  $$ select private.seed_demo('XX') $$,
  '22023', null, 'okänd marknad avvisas'
);

select ok(
  not has_function_privilege('anon', 'private.seed_demo(text)', 'execute')
  and not has_function_privilege('authenticated', 'private.seed_demo(text)', 'execute'),
  'anon/authenticated kan inte köra seed_demo'
);

select finish();
rollback;
