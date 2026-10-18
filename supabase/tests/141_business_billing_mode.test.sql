-- WP-80 · "Facturación manual" (D-061): 20261020010100_business_billing_mode.sql.
-- businesses.billing_mode kan bara sättas av servern (service_role), aldrig
-- av ägaren; private.business_billing_notes nås inte av authenticated/anon
-- (inte ens företagets egen ägare); inbjudan för över billing_mode + anteckning.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email, role, aud) values
  ('e1410000-0000-4000-8000-000000000001', 'owner-141@example.com', 'authenticated', 'authenticated'),
  ('e1410000-0000-4000-8000-000000000002', 'invitee-141@example.com', 'authenticated', 'authenticated'),
  ('e1410000-0000-4000-8000-000000000003', 'admin-141@example.com', 'authenticated', 'authenticated');

insert into public.businesses (id, slug, name, comuna, category) values
  ('e1410000-1000-4000-8000-000000000001', 'test-billing-141', 'Billing 141', 'Providencia', 'barberia');
insert into public.memberships (business_id, user_id, role) values
  ('e1410000-1000-4000-8000-000000000001', 'e1410000-0000-4000-8000-000000000001', 'owner');
insert into private.business_billing_notes (business_id, note) values
  ('e1410000-1000-4000-8000-000000000001', 'Factura mensual por transferencia');

-- 1. Standard: 'app'.
select is(
  (select billing_mode from public.businesses where id = 'e1410000-1000-4000-8000-000000000001'),
  'app',
  'billing_mode är app som standard'
);

-- 2. Bara 'app'/'manual' tillåts.
select throws_ok(
  $$ update public.businesses set billing_mode = 'stripe' where id = 'e1410000-1000-4000-8000-000000000001' $$,
  '23514'
);

-- 3-6. Ägaren: kan läsa billing_mode (eget företag), men inte ändra den,
-- och kan inte läsa eller skriva anteckningen.
select set_config('request.jwt.claims', json_build_object('sub', 'e1410000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select billing_mode from public.businesses where id = 'e1410000-1000-4000-8000-000000000001'),
  'app',
  'ägaren läser sitt eget billing_mode'
);
select throws_ok(
  $$ update public.businesses set billing_mode = 'manual' where id = 'e1410000-1000-4000-8000-000000000001' $$,
  '42501'
);
select throws_ok(
  $$ select note from private.business_billing_notes $$,
  '42501'
);
select throws_ok(
  $$ insert into private.business_billing_notes (business_id, note)
     values ('e1410000-1000-4000-8000-000000000001', 'x') $$,
  '42501'
);
-- 7. Vanliga fält fungerar fortfarande för ägaren (kolumngrant oförändrade).
select lives_ok(
  $$ update public.businesses set name = 'Billing 141 b' where id = 'e1410000-1000-4000-8000-000000000001' $$,
  'ägaren kan fortfarande byta namn'
);
reset role;

-- 8. anon når inte anteckningarna.
set local role anon;
select throws_ok(
  $$ select note from private.business_billing_notes $$,
  '42501'
);
reset role;

-- 9-10. service_role (/admin) sätter läget och anteckningen.
set local role service_role;
select lives_ok(
  $$ update public.businesses set billing_mode = 'manual' where id = 'e1410000-1000-4000-8000-000000000001' $$,
  'service_role sätter billing_mode'
);
select lives_ok(
  $$ update private.business_billing_notes set note = 'Contrato anual' where business_id = 'e1410000-1000-4000-8000-000000000001' $$,
  'service_role ändrar anteckningen'
);
reset role;

-- 11. Anteckningen är högst 500 tecken.
select throws_ok(
  $$ update private.business_billing_notes set note = repeat('x', 501) where business_id = 'e1410000-1000-4000-8000-000000000001' $$,
  '23514'
);

-- 12. Inbjudan: billing_note högst 500 tecken.
select throws_ok(
  $$ insert into private.business_invitations (email, business_name, token_hash, created_by, billing_note)
     values ('x-141@example.com', 'X', extensions.digest('tok-141-x', 'sha256'),
             'e1410000-0000-4000-8000-000000000003', repeat('x', 501)) $$,
  '23514'
);

-- 13-15. accept_business_invitation för över billing_mode och anteckningen.
insert into private.business_invitations (email, business_name, plan, token_hash, created_by, billing_mode, billing_note)
values ('invitee-141@example.com', 'Peluquería Manual 141', 'equipo', extensions.digest('tok-141', 'sha256'),
        'e1410000-0000-4000-8000-000000000003', 'manual', 'Factura Ordena, 12 meses');

select set_config('request.jwt.claims', json_build_object('sub', 'e1410000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ select public.accept_business_invitation('tok-141') $$,
  'inbjudan accepteras'
);
reset role;

select is(
  (select b.billing_mode || ':' || b.plan::text
     from public.businesses b
     join private.business_invitations i on i.business_id = b.id
    where i.email = 'invitee-141@example.com'),
  'manual:equipo',
  'företaget skapas med inbjudans billing_mode och plan'
);
select is(
  (select n.note
     from private.business_billing_notes n
     join private.business_invitations i on i.business_id = n.business_id
    where i.email = 'invitee-141@example.com'),
  'Factura Ordena, 12 meses',
  'anteckningen följer med till företaget'
);

select * from finish();
rollback;
