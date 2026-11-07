-- WP-88 (D-074) · Ficha de atención + consentimiento informado:
-- 20261108030000_ficha_consentimiento.sql. INV-3/INV-4 (RLS, tenant-isolering)
-- för customer_records, customer_record_entries, consent_templates,
-- consent_template_versions, service_consent_templates och
-- consent_signing_links, behörigheten can_view_records (recepción utan
-- behörighet ser inget innehåll), planspärren och anonymiseringstriggern.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);
\ir _helpers.psql

update public.businesses set plan = 'emprende'
 where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A1', 'staff-1'),
  ('bbbbbbbb-1000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Staff B1', 'staff-1');

insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Limpieza facial', 60, 30000),
  ('bbbbbbbb-2000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Masaje', 60, 30000);

insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900001111', 'Cliente A1'),
  ('aaaaaaaa-3000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '+56900003333', 'Cliente A2'),
  ('bbbbbbbb-3000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56900002222', 'Cliente B');

insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
   tstzrange('2026-09-01 10:00+00', '2026-09-01 11:00+00', '[)'), tstzrange('2026-09-01 10:00+00', '2026-09-01 11:00+00', '[)'), 'completed', 'manual', 30000),
  ('aaaaaaaa-4000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000002',
   tstzrange('2026-09-02 10:00+00', '2026-09-02 11:00+00', '[)'), tstzrange('2026-09-02 10:00+00', '2026-09-02 11:00+00', '[)'), 'completed', 'manual', 30000);

-- 1-2. has_perm känner till den nya flaggan; personal har den inte som standard.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select is(private.has_perm('aaaaaaaa-0000-0000-0000-000000000001', 'can_view_records'), false,
  'personal saknar can_view_records som standard');
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select is(private.has_perm('aaaaaaaa-0000-0000-0000-000000000001', 'can_view_records'), true,
  'ägaren har alltid can_view_records');

-- Som ägare A.
set local role authenticated;

-- 3-4. Mall: versionen är sha256 av titel + text.
select lives_ok(
  $$ insert into public.consent_templates (id, business_id, title, body)
     values ('aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Tratamiento facial', 'Texto v1') $$,
  'ägaren skapar en mall');
select is(
  (select version from public.consent_templates where id = 'aaaaaaaa-5000-0000-0000-000000000001'),
  encode(extensions.digest('Tratamiento facial' || E'\n\n' || 'Texto v1', 'sha256'), 'hex'),
  'version = sha256(titel + text)');

-- 5-7. Ny text = ny version; versionen kan inte sättas av klienten.
select lives_ok(
  $$ update public.consent_templates set body = 'Texto v2' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  'ägaren ändrar texten');
select is(
  (select count(*)::int from public.consent_template_versions where template_id = 'aaaaaaaa-5000-0000-0000-000000000001'),
  2, 'båda versionerna finns kvar');
select throws_ok(
  $$ update public.consent_templates set version = 'x' where id = 'aaaaaaaa-5000-0000-0000-000000000001' $$,
  '42501', null, 'versionen kan inte skrivas av klienten');

-- 8-9. Koppling till tjänst; versionstabellen är skrivskyddad.
select lives_ok(
  $$ insert into public.service_consent_templates (business_id, service_id, template_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'aaaaaaaa-5000-0000-0000-000000000001') $$,
  'ägaren kopplar mallen till en tjänst');
select throws_ok(
  $$ insert into public.consent_template_versions (business_id, template_id, version, title, body)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-5000-0000-0000-000000000001', 'x', 'x', 'x') $$,
  '42501', null, 'authenticated kan inte skriva versioner');

-- 10-12. Fichan: fasta fält och anteckning kopplad till kundens bokning.
select lives_ok(
  $$ insert into public.customer_records (business_id, customer_id, allergies, updated_by)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'Látex', '11111111-1111-1111-1111-111111111111') $$,
  'ägaren sparar fasta fält');
select lives_ok(
  $$ insert into public.customer_record_entries (id, business_id, customer_id, booking_id, body, author_user_id)
     values ('aaaaaaaa-6000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             'aaaaaaaa-4000-0000-0000-000000000001', 'Piel sensible', '11111111-1111-1111-1111-111111111111') $$,
  'ägaren skriver en anteckning kopplad till bokningen');
select throws_ok(
  $$ insert into public.customer_record_entries (business_id, customer_id, booking_id, body, author_user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             'aaaaaaaa-4000-0000-0000-000000000002', 'Otra', '11111111-1111-1111-1111-111111111111') $$,
  '23514', null, 'bokningen måste gälla samma kund');

-- 13-14. record_fields: bara kända fält, inga dubbletter.
select lives_ok(
  $$ update public.businesses set record_fields = array['allergies', 'observations']
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'ägaren aktiverar fält');
select throws_ok(
  $$ update public.businesses set record_fields = array['allergies', 'allergies']
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'dubbletter nekas');

-- 15. Engångslänkarna är bara serverns.
select throws_ok(
  $$ select count(*) from public.consent_signing_links $$,
  '42501', null, 'authenticated kan inte läsa signeringslänkar');

reset role;

-- Loggade samtycken (servern skriver som service_role).
insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted, consent_template_id, booking_id, source)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'informed',
        (select version from public.consent_templates where id = 'aaaaaaaa-5000-0000-0000-000000000001'), 'web', true,
        'aaaaaaaa-5000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'booking');
insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'terms', '2026-10-v3', 'web', true);

-- 16-17. consentimiento informado kräver källa, och källa kräver informed.
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'informed', 'x', 'web', true) $$,
  '23514', null, 'informed utan källa nekas');
select throws_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted, source)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'customer', 'terms', 'x', 'web', true, 'booking') $$,
  '23514', null, 'källa på andra samtycken nekas');

-- Som personal A (recepción, utan can_view_records).
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 18-23.
select is((select count(*)::int from public.customer_records), 0, 'recepción ser inga fasta fält');
select is((select count(*)::int from public.customer_record_entries), 0, 'recepción ser inga anteckningar');
select is((select count(*)::int from public.consent_events), 0, 'recepción ser inga samtycken');
select throws_ok(
  $$ insert into public.customer_record_entries (business_id, customer_id, body, author_user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'x', '33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'recepción kan inte skriva i fichan');
select is((select count(*)::int from public.consent_templates), 1, 'personal läser mallarna (företagets texter)');
select throws_ok(
  $$ insert into public.consent_templates (business_id, title, body)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', 'Y') $$,
  '42501', null, 'personal utan can_edit_settings skapar inga mallar');

reset role;
update public.memberships set can_view_records = true
 where business_id = 'aaaaaaaa-0000-0000-0000-000000000001'
   and user_id = '33333333-3333-3333-3333-333333333333';

-- Som personal A med can_view_records.
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 24-29.
select is((select count(*)::int from public.customer_record_entries), 1, 'med behörighet syns anteckningen');
select is(
  (select count(*)::int from public.consent_events),
  1, 'med behörighet syns bara consentimiento informado, inte övriga samtycken');
select lives_ok(
  $$ insert into public.customer_record_entries (id, business_id, customer_id, body, author_user_id)
     values ('aaaaaaaa-6000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001',
             'Evolución', '33333333-3333-3333-3333-333333333333') $$,
  'personal med behörighet skriver en anteckning');
select throws_ok(
  $$ insert into public.customer_record_entries (business_id, customer_id, body, author_user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'x', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'man kan inte skriva i någon annans namn');
delete from public.customer_record_entries where id = 'aaaaaaaa-6000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.customer_record_entries where id = 'aaaaaaaa-6000-0000-0000-000000000001'),
  1, 'personal kan inte ta bort någon annans anteckning');
delete from public.customer_record_entries where id = 'aaaaaaaa-6000-0000-0000-000000000002';
select is(
  (select count(*)::int from public.customer_record_entries where id = 'aaaaaaaa-6000-0000-0000-000000000002'),
  0, 'personal tar bort sin egen anteckning');

-- Som ägare B (annat företag).
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);

-- 30-34. Tenant-isolering.
select is((select count(*)::int from public.customer_records), 0, 'B ser inte A:s fasta fält');
select is((select count(*)::int from public.customer_record_entries), 0, 'B ser inte A:s anteckningar');
select is((select count(*)::int from public.consent_templates), 0, 'B ser inte A:s mallar');
select is((select count(*)::int from public.consent_template_versions), 0, 'B ser inte A:s versioner');
select throws_ok(
  $$ insert into public.customer_record_entries (business_id, customer_id, body, author_user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'x', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'B kan inte skriva i A:s ficha');

-- 35. Vendor-rollen får aldrig behörigheten.
select set_config('request.jwt.claims', json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.customer_record_entries), 0, 'vendor ser inga anteckningar');

-- 36. anon har ingen åtkomst alls.
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.customer_record_entries $$, '42501', null, 'anon nekas');

-- 37-38. Planspärr: Gratis får läsa men inte skriva.
reset role;
update public.businesses set plan = 'free' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ insert into public.customer_record_entries (business_id, customer_id, body, author_user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'x', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'utan planfunktionen kan man inte skriva');
select is((select count(*)::int from public.customer_record_entries), 1, 'efter nedgradering finns datan kvar');

-- 39-40. Anonymisering raderar fichan.
reset role;
update public.customers set anonymized_at = now() where id = 'aaaaaaaa-3000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.customer_record_entries where customer_id = 'aaaaaaaa-3000-0000-0000-000000000001'),
  0, 'anonymisering raderar anteckningarna');
select is(
  (select count(*)::int from public.customer_records where customer_id = 'aaaaaaaa-3000-0000-0000-000000000001'),
  0, 'anonymisering raderar de fasta fälten');

select finish();
rollback;
