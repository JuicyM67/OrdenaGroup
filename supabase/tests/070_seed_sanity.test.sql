-- Seed-kontroll (den enda testfilen som läser seed). Kräver att `supabase db
-- reset` har körts (seed.sql laddas då). Beror INTE på fixturer från
-- _helpers.psql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  (select count(*) from public.businesses where slug = 'barberia-norte')::int, 1,
  'Barbería Norte finns'
);
select is(
  (select count(*) from public.staff where business_id = 'b0000000-0000-0000-0000-000000000001')::int, 3,
  '3 profesionales'
);
select is(
  (select count(*) from public.services where business_id = 'b0000000-0000-0000-0000-000000000001')::int, 3,
  '3 tjänster'
);
select is(
  (select count(*) from public.business_hours where business_id = 'b0000000-0000-0000-0000-000000000001')::int, 6,
  '6 öppetdagar (lun-sáb)'
);
select is(
  (select count(*) from public.bookings where business_id = 'b0000000-0000-0000-0000-000000000001')::int, 23,
  '23 bokningar, som i Agenda-designen'
);
select ok(
  not exists (
    select 1 from public.customers
    where business_id = 'b0000000-0000-0000-0000-000000000001'
      and phone_e164 is not null
      and phone_e164 !~ '^\+5690000[0-9]{4}$'
  ),
  'inga telefoner utanför +5690000xxxx'
);
select ok(
  not exists (
    select 1 from public.customers
    where business_id = 'b0000000-0000-0000-0000-000000000001'
      and email is not null
      and email !~ '@example\.com$'
  ),
  'inga e-postadresser utanför @example.com'
);
-- Bara seed-företagets medlemmar: i staging finns även riktiga testinloggningar.
select ok(
  not exists (
    select 1 from auth.users u
    join public.memberships m on m.user_id = u.id
    join public.businesses b on b.id = m.business_id
    where b.slug = 'barberia-norte' and u.email is not null and u.email !~ '@example\.com$'
  ),
  'ägarens e-post är också @example.com'
);
-- qa6/K6: företagets eget telefonnummer är också fiktivt (+5690000xxxx).
select ok(
  (select phone from public.businesses where slug = 'barberia-norte') ~ '^\+5690000[0-9]{4}$',
  'Barbería Nortes telefon är +5690000xxxx'
);

select finish();
rollback;
