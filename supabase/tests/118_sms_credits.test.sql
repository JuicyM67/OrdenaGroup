-- WP-76 · SMS-krediter (D-053) · INV-3/INV-4: tenant-isolering för
-- `sms_credit_purchases`/`sms_credit_ledger` och kreditfunktionerna
-- (grant/consume/release/refund/balance + återlämning via trigger).
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);
\ir _helpers.psql

-- Köp: A1 (äldst utgång), A2, A3 (utgånget), B1.
insert into public.sms_credit_purchases
  (id, business_id, created_by, package_size, amount_net, amount_vat, amount_total, credits_total, stripe_checkout_session_id) values
  ('aaaaaaaa-7600-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 100, 10000, 2500, 12500, 100, 'cs_sms_a1'),
  ('aaaaaaaa-7600-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 250, 25000, 6250, 31250, 250, 'cs_sms_a2'),
  ('aaaaaaaa-7600-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 100, 10000, 2500, 12500, 100, 'cs_sms_a3'),
  ('bbbbbbbb-7600-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 100, 10000, 2500, 12500, 100, 'cs_sms_b1');

set local role service_role;
select ok(private.sms_credit_grant('aaaaaaaa-7600-0000-0000-000000000001', 'pi_a1', now() - interval '2 months'), 'grant krediterar ett väntande köp');
select ok(not private.sms_credit_grant('aaaaaaaa-7600-0000-0000-000000000001', 'pi_a1', now()), 'grant två gånger → false (idempotent)');
select ok(private.sms_credit_grant('aaaaaaaa-7600-0000-0000-000000000002', 'pi_a2', now() - interval '1 month'), 'grant A2');
select ok(private.sms_credit_grant('aaaaaaaa-7600-0000-0000-000000000003', 'pi_a3', now() - interval '13 months'), 'grant A3 (redan utgånget)');
select ok(private.sms_credit_grant('bbbbbbbb-7600-0000-0000-000000000001', 'pi_b1', now()), 'grant B1');
reset role;

select is((select count(*)::int from public.sms_credit_ledger where purchase_id = 'aaaaaaaa-7600-0000-0000-000000000001' and kind = 'grant'), 1, 'en grant-rad per köp');
select is((select credits_remaining from public.sms_credit_purchases where id = 'aaaaaaaa-7600-0000-0000-000000000001'), 100, 'credits_remaining = credits_total efter grant');

set local role service_role;
select is((select balance from private.sms_credit_balance('aaaaaaaa-0000-0000-0000-000000000001')), 350, 'saldot räknar inte utgångna köp');
select is((select next_expiry_credits from private.sms_credit_balance('aaaaaaaa-0000-0000-0000-000000000001')), 100, 'närmast utgår: A1:s 100');

-- FIFO: 98 tas från A1, sedan 5 över gränsen (2 från A1 + 3 från A2).
select is(private.sms_credit_consume('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000001', 98), 98, 'consume 98');
select is(private.sms_credit_consume('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000002', 5), 5, 'consume 5 över två köp');
reset role;
select is((select credits_remaining from public.sms_credit_purchases where id = 'aaaaaaaa-7600-0000-0000-000000000001'), 0, 'FIFO: äldsta köpet tömt först');
select is((select credits_remaining from public.sms_credit_purchases where id = 'aaaaaaaa-7600-0000-0000-000000000002'), 247, 'FIFO: resten från nästa köp');
select is((select credits_remaining from public.sms_credit_purchases where id = 'aaaaaaaa-7600-0000-0000-000000000003'), 100, 'utgånget köp används inte');

set local role service_role;
select is(private.sms_credit_consume('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000002', 5), 5, 'consume igen för samma rad → samma antal');
select is((select balance from private.sms_credit_balance('aaaaaaaa-0000-0000-0000-000000000001')), 247, 'retry tar ingen ny kredit');
select is(private.sms_credit_consume('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000003', 1000), 0, 'räcker inte saldot → 0, inget tas');
select is((select balance from private.sms_credit_balance('aaaaaaaa-0000-0000-0000-000000000001')), 247, 'saldot oförändrat efter nekad consume');

-- Release: tillbaka en gång.
select is(private.sms_credit_release('aaaaaaaa-7700-0000-0000-000000000002'), 5, 'release lämnar tillbaka 5');
select is(private.sms_credit_release('aaaaaaaa-7700-0000-0000-000000000002'), 0, 'release två gånger → 0');
select is((select balance from private.sms_credit_balance('aaaaaaaa-0000-0000-0000-000000000001')), 252, 'saldot efter release');

-- Refund (kumulativ) på A2: förbruka 30 (2 från A1 + 28 från A2) → A2 har 222 kvar.
select is(private.sms_credit_consume('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-7700-0000-0000-000000000004', 30), 30, 'consume 30 (FIFO över A1 och A2)');
select is(private.sms_credit_refund('aaaaaaaa-7600-0000-0000-000000000002', 50), 50, 'refund totalt 50 → 50 oförbrukade dras');
select is(private.sms_credit_refund('aaaaaaaa-7600-0000-0000-000000000002', 50), 0, 'samma refund igen → 0');
select is(private.sms_credit_refund('aaaaaaaa-7600-0000-0000-000000000002', 250), 172, 'full refund drar resten, aldrig under 0');
reset role;
select is((select status from public.sms_credit_purchases where id = 'aaaaaaaa-7600-0000-0000-000000000002'), 'refunded', 'status refunded efter full återbetalning');

-- Trigger: en sms-rad som blir cancelled lämnar tillbaka sina krediter (A2 är
-- återbetalt → 0 tillbaka, men ledger-raden skrivs).
insert into public.message_outbox (id, business_id, channel, recipient_kind, template, category, status, dedupe_key)
values ('aaaaaaaa-7700-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'sms', 'customer', 'mensajeLibre', 'service', 'sending', 'test:wp76:1');
update public.message_outbox set status = 'cancelled' where id = 'aaaaaaaa-7700-0000-0000-000000000004';
select is((select count(*)::int from public.sms_credit_ledger where outbox_id = 'aaaaaaaa-7700-0000-0000-000000000004' and kind = 'release'), 2, 'trigger: release-rader (per köp) när sms-raden avbryts');
select is((select credits_remaining from public.sms_credit_purchases where id = 'aaaaaaaa-7600-0000-0000-000000000001'), 2, 'trigger: giltigt köp får tillbaka sin del, återbetalt köp inte');

select ok(
  not exists (
    select 1 from public.sms_credit_purchases p
     where p.credits_remaining <> (select coalesce(sum(delta), 0) from public.sms_credit_ledger l where l.purchase_id = p.id)
  ),
  'invariant: credits_remaining = sum(delta) per köp'
);

-- Checks.
select throws_ok(
  $$ insert into public.sms_credit_purchases (business_id, package_size, amount_net, amount_vat, amount_total, credits_total)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 123, 100, 25, 125, 123) $$,
  '23514', null, 'ogiltigt paket nekas'
);
select throws_ok(
  $$ insert into public.sms_credit_purchases (business_id, package_size, amount_net, amount_vat, amount_total, credits_total)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 100, 10000, 2500, 99, 100) $$,
  '23514', null, 'amount_total <> net + vat nekas'
);

-- RLS: ägaren A ser bara A, kan inte skriva eller köra funktionerna.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.sms_credit_purchases), 3, 'ägare A ser bara sina tre köp');
select throws_ok(
  $$ update public.sms_credit_purchases set credits_remaining = 100 $$,
  '42501', null, 'ägaren kan inte ändra saldot'
);
select throws_ok(
  $$ select private.sms_credit_grant('aaaaaaaa-7600-0000-0000-000000000003', null, now()) $$,
  '42501', null, 'authenticated kan inte köra kreditfunktionerna'
);

select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.sms_credit_ledger), 0, 'personal ser inte kreditloggen');

set local role anon;
select throws_ok($$ select * from public.sms_credit_purchases $$, '42501', null, 'anon kan inte läsa sms_credit_purchases');

select finish();
rollback;
