-- INV-3/INV-4: tenant-isolering för `customers`, plus dataskyddsregler (Ley 21.719).
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);
\ir _helpers.psql

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900001111', 'Cliente B');
-- En kund som samtyckte via det publika bokningsflödet (som servern/service
-- role skulle skapa), för att bevisa granskningsfyndet: ägaren måste kunna
-- redigera/anonymisera den här utan att röra samtycket.
insert into public.customers (id, business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel) values
  ('aaaaaaaa-3000-0000-0000-000000000098', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900009800', 'Cliente Web', now(), 'v1', 'web');

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. ownerA ser A:s kunder, noll av B:s.
select is((select count(*) from public.customers where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 2, 'ownerA ser A:s kunder');
select is((select count(*) from public.customers where business_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int, 0, 'ownerA ser noll av B:s kunder');

-- 2. ownerA kan inte skapa en kund i B.
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Intruso') $$,
  '42501'
);

-- 3. ownerA:s update/delete på B:s rad påverkar 0 rader, B oförändrat.
with updated as (
  update public.customers set name = 'Hackeado' where id = 'bbbbbbbb-3000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'ownerA kan inte uppdatera B:s kund (0 rader)');
with deleted as (
  delete from public.customers where id = 'bbbbbbbb-3000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'ownerA kan inte radera B:s kund (0 rader)');

reset role;
select is((select name from public.customers where id = 'bbbbbbbb-3000-0000-0000-000000000001'), 'Cliente B', 'B:s kund är oförändrad');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- 4. ownerA kan inte flytta A:s kund till B.
select throws_ok(
  $$ update public.customers set business_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-3000-0000-0000-000000000001' $$,
  '42501'
);

-- 5. anon: allt ger permission denied.
set local role anon;
select throws_ok($$ select count(*) from public.customers $$, '42501');
select throws_ok($$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900003333', 'Anon') $$, '42501');
select throws_ok($$ update public.customers set name = 'x' where id = 'aaaaaaaa-3000-0000-0000-000000000001' $$, '42501');
select throws_ok($$ delete from public.customers where id = 'aaaaaaaa-3000-0000-0000-000000000001' $$, '42501');

-- 6. staffA/vendorA ser noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.customers)::int, 0, 'staffA ser noll kunder');
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900007777', 'Otro') $$,
  '42501'
);
with updated as (
  update public.customers set name = 'Hackeado' where id = 'aaaaaaaa-3000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'staffA kan inte uppdatera en kund (0 rader)');
with deleted as (
  delete from public.customers where id = 'aaaaaaaa-3000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'staffA kan inte radera en kund (0 rader)');

select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*) from public.customers)::int, 0, 'vendorA ser noll kunder');
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900007778', 'Otro') $$,
  '42501'
);

-- 7. Utan medlemskap: noll rader.
select set_config('request.jwt.claims', json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
select is((select count(*) from public.customers)::int, 0, 'nomember ser noll kunder');

-- Säkerhet S5: en ägare kan bara sätta consent_channel = 'manual' (hon la in
-- kunden manuellt). 'web'/'whatsapp' betyder att KUNDEN själv samtyckte via
-- de flödena, och sätts bara av servern.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900006666', 'X', now(), 'v1', 'web') $$,
  '42501'
);
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900006667', 'X', now(), 'v1', 'whatsapp') $$,
  '42501'
);
select lives_ok(
  $$ insert into public.customers (business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900006668', 'X', now(), 'v1', 'manual') $$,
  'ownerA kan sätta consent_channel = manual'
);

-- Granskningsfynd (blockerande): ägaren måste kunna redigera en kund med
-- web/whatsapp-samtycke UTAN att röra samtycket. Cliente Web
-- (…3000-…-000098) har consent_channel = 'web' från fixturen ovan.
select lives_ok(
  $$ update public.customers set notes = 'Prefiere corte clásico' where id = 'aaaaaaaa-3000-0000-0000-000000000098' $$,
  'ownerA kan ändra notes på en web-kund utan att röra samtycket'
);
select is(
  (select consent_channel from public.customers where id = 'aaaaaaaa-3000-0000-0000-000000000098')::text,
  'web',
  'consent_channel på web-kunden är fortfarande web efter notes-ändringen'
);

-- ownerA anonymiserar web-kunden (WP-26-liknande flöde): namn/telefon null,
-- anonymized_at satt, samtycket nollat i samma update.
select lives_ok(
  $$ update public.customers
     set name = null, phone_e164 = null, anonymized_at = now(),
         consent_terms_at = null, consent_marketing_at = null, consent_version = null, consent_channel = null
     where id = 'aaaaaaaa-3000-0000-0000-000000000098' $$,
  'ownerA kan anonymisera en web-kund (samtycket nollas samtidigt)'
);

-- ownerA kan inte sätta consent_channel = 'web' via en update. Egen kund utan
-- samtycke sedan tidigare (rör inte Cliente A, som ett senare test i filen
-- förutsätter är helt orörd).
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000096', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900009600', 'Cliente Sin Consentimiento');
select throws_ok(
  $$ update public.customers set consent_channel = 'web' where id = 'aaaaaaaa-3000-0000-0000-000000000096' $$,
  '42501'
);

-- ownerA kan inte ändra ett samtyckesfält på en web-rad utan att sätta
-- 'manual' (ny web-kund, som postgres — authenticated får inte skapa den).
reset role;
insert into public.customers (id, business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel) values
  ('aaaaaaaa-3000-0000-0000-000000000097', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900009700', 'Cliente Web 2', now(), 'v1', 'web');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select throws_ok(
  $$ update public.customers set consent_marketing_at = now() where id = 'aaaaaaaa-3000-0000-0000-000000000097' $$,
  '42501'
);

-- ownerA sätter 'manual' med ett nytt samtycke (tillåtet). Samma kund som
-- nyss fick sitt web-försök nekat.
select lives_ok(
  $$ update public.customers set consent_channel = 'manual', consent_terms_at = now(), consent_version = 'v1' where id = 'aaaaaaaa-3000-0000-0000-000000000096' $$,
  'ownerA kan sätta consent_channel = manual med ett nytt samtycke via update'
);

reset role;

-- Tabellspecifikt: telefonformat, dubblett per företag, samtycken, anonymisering.
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '56912345678', 'X') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56 9 1234 5678', 'X') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '+0123456789', 'X') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Duplicado') $$,
  '23505'
);
select lives_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('bbbbbbbb-0000-0000-0000-000000000002', '+56900009999', 'Cliente C') $$,
  'samma telefon i olika företag är okej (redan bevisat via B ovan, testar en till för säkerhets skull)'
);

-- Samtycken är null efter en insert utan samtyckesfält (aldrig förkryssat).
select is(
  (select consent_terms_at from public.customers where id = 'aaaaaaaa-3000-0000-0000-000000000001'),
  null,
  'consent_terms_at är null utan att ha satts explicit'
);
select is(
  (select consent_marketing_at from public.customers where id = 'aaaaaaaa-3000-0000-0000-000000000001'),
  null,
  'consent_marketing_at är null utan att ha satts explicit'
);

select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name, consent_terms_at) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900004444', 'X', now()) $$,
  '23514'
);
select lives_ok(
  $$ insert into public.customers (business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel) values ('aaaaaaaa-0000-0000-0000-000000000001', '+56900005555', 'X', now(), 'v1', 'web') $$,
  'consent_terms_at med version och kanal är okej'
);
select throws_ok(
  $$ insert into public.customers (business_id, phone_e164, name) values ('aaaaaaaa-0000-0000-0000-000000000001', null, 'X') $$,
  '23514'
);
select lives_ok(
  $$ insert into public.customers (business_id, phone_e164, name, anonymized_at) values ('aaaaaaaa-0000-0000-0000-000000000001', null, null, now()) $$,
  'phone_e164 = null är okej när anonymized_at är satt'
);

select finish();
rollback;
