-- Tid och sommartid (DB-delen). Logiken (lokal tid <-> UTC, slot-generering)
-- testas i WP-04/WP-10 — det här bevisar bara att postgres tzdata känner
-- Chiles regler och att databasen lagrar/jämför korrekt i UTC oavsett dem.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff TZ', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-6000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900007777', 'Cliente TZ');

-- Postgres tzdata känner Chiles regler: -03 på sommaren (2026-10-02), -04 på vintern (2026-07-01).
select ok(
  ('2026-10-02 12:00:00'::timestamp at time zone 'America/Santiago') = '2026-10-02 15:00:00+00'::timestamptz,
  'America/Santiago är UTC-03 (sommartid) den 2026-10-02'
);
select ok(
  ('2026-07-01 12:00:00'::timestamp at time zone 'America/Santiago') = '2026-07-01 16:00:00+00'::timestamptz,
  'America/Santiago är UTC-04 (vintertid) den 2026-07-01'
);

-- Övergången 2026-09-06 (00:00 -> 01:00): den lokala timmen 00:00-01:00 finns inte.
-- 23:30 dagen innan (UTC-04) till 01:30 (UTC-03) är nominellt 2 timmar lokal
-- tid, men bara 1 timme verklig tid.
select is(
  extract(epoch from (('2026-09-06 01:30:00'::timestamp at time zone 'America/Santiago') - ('2026-09-05 23:30:00'::timestamp at time zone 'America/Santiago'))) / 60,
  60::numeric,
  'våren 2026-09-06: 23:30 till 01:30 lokal tid är bara 60 verkliga minuter (den saknade timmen)'
);

-- Övergången 2027-04-04 (00:00 -> 23:00 dagen innan): den lokala timmen
-- 23:00-00:00 den 3:e finns två gånger (en gång i UTC-03, en gång i UTC-04).
select is(
  abs(extract(epoch from (('2027-04-03 23:30:00-03'::timestamptz) - ('2027-04-03 23:30:00-04'::timestamptz)))) / 60,
  60::numeric,
  'hösten 2027-04-04: 23:30 lokal tid finns två gånger, en timme isär i UTC'
);

-- En bokning som korsar övergången (2026-09-05/06) sparas med exakt 35 min varaktighet.
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-6000-0000-0000-000000000003',
             tstzrange('2026-09-05 23:50:00-04', '2026-09-05 23:50:00-04'::timestamptz + interval '35 minutes', '[)'),
             tstzrange('2026-09-05 23:50:00-04', '2026-09-05 23:50:00-04'::timestamptz + interval '35 minutes', '[)'), 'confirmed', 'manual', 12000) $$,
  'en bokning som korsar sommartidsövergången skapas'
);
select is(
  (select extract(epoch from (upper(period) - lower(period))) / 60 from public.bookings where business_id = 'aaaaaaaa-0000-0000-0000-000000000001' and staff_id = 'aaaaaaaa-6000-0000-0000-000000000001'),
  35::numeric,
  'bokningen har exakt 35 minuters varaktighet (upper - lower), oavsett övergången'
);

-- Den dubbla lokala timmen 2027-04-03 23:30: samma profesional kan bokas i
-- båda (olika UTC-tider), men inte två gånger vid samma UTC-tid.
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-6000-0000-0000-000000000003',
             tstzrange('2027-04-03 23:30:00-03', '2027-04-04 00:05:00-03', '[)'), tstzrange('2027-04-03 23:30:00-03', '2027-04-04 00:05:00-03', '[)'), 'confirmed', 'manual', 12000) $$,
  '23:30 lokal tid (första gången, UTC-03) skapas'
);
select lives_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-6000-0000-0000-000000000003',
             tstzrange('2027-04-03 23:30:00-04', '2027-04-04 00:05:00-04', '[)'), tstzrange('2027-04-03 23:30:00-04', '2027-04-04 00:05:00-04', '[)'), 'confirmed', 'manual', 12000) $$,
  '23:30 lokal tid (andra gången, UTC-04, en annan verklig tid) är okej'
);
select throws_ok(
  $$ insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-6000-0000-0000-000000000003',
             tstzrange('2027-04-03 23:30:00-03', '2027-04-04 00:05:00-03', '[)'), tstzrange('2027-04-03 23:30:00-03', '2027-04-04 00:05:00-03', '[)'), 'confirmed', 'manual', 12000) $$,
  '23P01'
);

-- businesses.timezone: default America/Santiago, annan zon avvisas (v1).
select is(
  (select timezone from public.businesses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'America/Santiago',
  'timezone default är America/Santiago'
);
select throws_ok(
  $$ insert into public.businesses (slug, name, comuna, category, timezone) values ('wp01-test-tz', 'X', 'Providencia', 'barberia', 'America/New_York') $$,
  '23514'
);

select finish();
rollback;
