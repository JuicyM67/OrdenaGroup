-- WP-16 (WhatsApp) · D-063: 20261021010000_whatsapp_enum_values.sql +
-- 20261021010100_whatsapp_channel.sql.
-- Kanalen 'whatsapp' i utkorgen, wa_message_id unikt, waitlist_entry_id kan
-- inte peka på ett annat företags post (D-014), consent_events tar
-- kind = 'whatsapp' bara för kunder, och inbound_events (webhookens
-- idempotens) är oläsbar för authenticated/anon (INV-3).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
\ir _helpers.psql

insert into public.staff (id, business_id, name, color) values
  ('aaaaaaaa-1450-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Staff A', 'staff-1');
insert into public.services (id, business_id, name, duration_min, price_clp) values
  ('aaaaaaaa-1451-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte', 35, 12000),
  ('bbbbbbbb-1451-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Corte', 35, 12000);
insert into public.customers (id, business_id, phone_e164, name) values
  ('aaaaaaaa-1452-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '+56911112222', 'Cliente A'),
  ('bbbbbbbb-1452-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '+56933334444', 'Cliente B');
insert into public.waitlist_entries (id, business_id, customer_id, service_id, day) values
  ('aaaaaaaa-1453-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1452-0000-0000-000000000001', 'aaaaaaaa-1451-0000-0000-000000000001', '2026-11-02'),
  ('bbbbbbbb-1453-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1452-0000-0000-000000000001', 'bbbbbbbb-1451-0000-0000-000000000001', '2026-11-02');

set local role service_role;

-- 1. En WhatsApp-rad kan köas (enum-värdet finns) med en egen väntelistepost.
select lives_ok(
  $$ insert into public.message_outbox
       (id, business_id, channel, recipient_kind, template, category, dedupe_key, waitlist_entry_id, wa_message_id, status, sent_at)
     values ('aaaaaaaa-1454-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'whatsapp', 'customer',
             'listaEsperaCupo', 'utility', 'listaEsperaCupo:whatsapp:customer:a:1',
             'aaaaaaaa-1453-0000-0000-000000000001', 'wamid.A1', 'sent', now()) $$,
  'service_role köar en whatsapp-rad med egen väntelistepost'
);

-- 2. D-014: kan inte peka på B:s post från A:s rad.
select throws_ok(
  $$ insert into public.message_outbox
       (business_id, channel, recipient_kind, template, category, dedupe_key, waitlist_entry_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'whatsapp', 'customer',
             'listaEsperaCupo', 'utility', 'listaEsperaCupo:whatsapp:customer:x:2',
             'bbbbbbbb-1453-0000-0000-000000000001') $$,
  '23503',
  null,
  'waitlist_entry_id kan inte peka på ett annat företags post'
);

-- 3. wa_message_id är unikt.
select throws_ok(
  $$ insert into public.message_outbox
       (business_id, channel, recipient_kind, template, category, dedupe_key, wa_message_id, status, sent_at)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'whatsapp', 'customer',
             'recordatorio', 'utility', 'recordatorio:whatsapp:customer:x:3', 'wamid.A1', 'sent', now()) $$,
  '23505',
  null,
  'wa_message_id är unikt'
);

-- 4. wa_message_id på en e-postrad bara efter en reserv (fallback_reason satt).
select throws_ok(
  $$ insert into public.message_outbox
       (business_id, channel, recipient_kind, template, category, dedupe_key, wa_message_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'email', 'customer',
             'recordatorio', 'utility', 'recordatorio:email:customer:x:4', 'wamid.A2') $$,
  '23514',
  null,
  'wa_message_id på en e-postrad kräver fallback_reason'
);
select lives_ok(
  $$ insert into public.message_outbox
       (business_id, channel, recipient_kind, template, category, dedupe_key, wa_message_id, fallback_reason)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'email', 'customer',
             'recordatorio', 'utility', 'recordatorio:email:customer:x:5', 'wamid.A3', 'wa_131026') $$,
  'en reservrad (e-post) behåller sitt wamid'
);

-- 5. fallback_reason är en kort kod.
select throws_ok(
  $$ insert into public.message_outbox
       (business_id, channel, recipient_kind, template, category, dedupe_key, fallback_reason)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'email', 'customer',
             'recordatorio', 'utility', 'recordatorio:email:customer:x:6', '') $$,
  '23514',
  null,
  'fallback_reason får inte vara tom'
);

-- 6. Raderas posten nollas bara waitlist_entry_id (business_id kvar).
delete from public.waitlist_entries where id = 'aaaaaaaa-1453-0000-0000-000000000001';
select is(
  (select business_id::text || '|' || coalesce(waitlist_entry_id::text, 'null')
     from public.message_outbox where id = 'aaaaaaaa-1454-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000001|null',
  'on delete set null (waitlist_entry_id) behåller business_id'
);

-- 7. consent_events: whatsapp för kund (granted och återkallat), inte för ägare.
select lives_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1452-0000-0000-000000000001', 'customer', 'whatsapp', '2026-10', 'web', true),
            ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1452-0000-0000-000000000001', 'customer', 'whatsapp', '2026-10', 'web', false) $$,
  'kundens whatsapp-samtycke och återkallelse loggas'
);
select throws_ok(
  $$ insert into public.consent_events (business_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'owner', 'whatsapp', '2026-10', 'web', true) $$,
  '23514',
  null,
  'whatsapp är inte ett ägarsamtycke'
);
-- De befintliga typerna fungerar fortfarande.
select lives_ok(
  $$ insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1452-0000-0000-000000000001', 'customer', 'terms', '2026-10', 'web', true) $$,
  'terms loggas som förut'
);

-- 8. inbound_events: service_role skriver, idempotent på (provider, event_id).
insert into public.inbound_events (provider, event_id, payload)
  values ('whatsapp', 'msg:wamid.IN1', '{"kind":"message","type":"text"}');
select throws_ok(
  $$ insert into public.inbound_events (provider, event_id) values ('whatsapp', 'msg:wamid.IN1') $$,
  '23505',
  null,
  'samma WhatsApp-händelse kan inte sparas två gånger'
);
reset role;

-- 9. authenticated (ägare A) ser A:s utkorgsrad men aldrig inbound_events.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.message_outbox where id = 'aaaaaaaa-1454-0000-0000-000000000001')::int,
  1,
  'ägaren ser sin egen WhatsApp-rad'
);
select throws_ok(
  $$ select count(*) from public.inbound_events $$,
  '42501',
  null,
  'authenticated kan inte läsa inbound_events'
);
select throws_ok(
  $$ update public.message_outbox set delivered_at = now() where id = 'aaaaaaaa-1454-0000-0000-000000000001' $$,
  '42501',
  null,
  'authenticated kan inte uppdatera leveransstatus'
);
reset role;

-- 10. B:s ägare ser inte A:s rad; anon ser inget.
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.message_outbox where business_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  0,
  'ägare B ser inga av A:s rader'
);
reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.inbound_events $$,
  '42501',
  null,
  'anon kan inte läsa inbound_events'
);
reset role;

select finish();
rollback;
