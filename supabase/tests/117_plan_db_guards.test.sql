-- WP-73 · Planspärrar (D-048) · databasens skydd mot direkt-PostgREST
-- (20261011070000_plan_db_guards.sql): aktiva tjänster på Gratis, blixttider
-- och medlemsrabatt kräver Team, ägaren kan inte lägga in medlemskap direkt,
-- och planmatrisen i SQL matchar `src/config/plans.ts`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into public.businesses (id, slug, name, comuna, category, plan) values
  ('cccccccc-1170-0000-0000-000000000001', 'test-guard-free', 'Free Biz', 'Providencia', 'barberia', 'free'),
  ('cccccccc-1170-0000-0000-000000000002', 'test-guard-equipo', 'Equipo Biz', 'Providencia', 'barberia', 'equipo');

insert into auth.users (id, email, role, aud) values
  ('cccccccc-2170-0000-0000-000000000001', 'owner-guard-free@example.com', 'authenticated', 'authenticated'),
  ('cccccccc-2170-0000-0000-000000000002', 'owner-guard-equipo@example.com', 'authenticated', 'authenticated'),
  ('cccccccc-2170-0000-0000-000000000009', 'outsider-guard@example.com', 'authenticated', 'authenticated');

insert into public.memberships (business_id, user_id, role) values
  ('cccccccc-1170-0000-0000-000000000001', 'cccccccc-2170-0000-0000-000000000001', 'owner'),
  ('cccccccc-1170-0000-0000-000000000002', 'cccccccc-2170-0000-0000-000000000002', 'owner');

insert into public.staff (id, business_id, name, color) values
  ('cccccccc-3170-0000-0000-000000000001', 'cccccccc-1170-0000-0000-000000000001', 'F-Staff', 'staff-1'),
  ('cccccccc-3170-0000-0000-000000000002', 'cccccccc-1170-0000-0000-000000000002', 'E-Staff', 'staff-1');

-- Gratis har redan 3 aktiva tjänster och en inaktiv (seedat som postgres).
insert into public.services (id, business_id, name, duration_min, price_clp, sort, active) values
  ('cccccccc-4170-0000-0000-000000000001', 'cccccccc-1170-0000-0000-000000000001', 'S1', 30, 1000, 1, true),
  ('cccccccc-4170-0000-0000-000000000002', 'cccccccc-1170-0000-0000-000000000001', 'S2', 30, 1000, 2, true),
  ('cccccccc-4170-0000-0000-000000000003', 'cccccccc-1170-0000-0000-000000000001', 'S3', 30, 1000, 3, true),
  ('cccccccc-4170-0000-0000-000000000004', 'cccccccc-1170-0000-0000-000000000001', 'S4', 30, 1000, 4, false),
  ('cccccccc-4170-0000-0000-000000000011', 'cccccccc-1170-0000-0000-000000000002', 'E1', 30, 1000, 1, true),
  ('cccccccc-4170-0000-0000-000000000012', 'cccccccc-1170-0000-0000-000000000002', 'E2', 30, 1000, 2, true),
  ('cccccccc-4170-0000-0000-000000000013', 'cccccccc-1170-0000-0000-000000000002', 'E3', 30, 1000, 3, true);

-- 1-4. Matrisen i SQL = src/config/plans.ts.
select is(private.plan_has_feature('free', 'waitlist'), false, 'free: ingen väntelista');
select is(private.plan_has_feature('emprende', 'waitlist'), true, 'emprende: väntelista');
select is(private.plan_has_feature('emprende', 'flash'), false, 'emprende: inga blixttider');
select is(private.plan_has_feature('custom', 'priority_support'), true, 'custom: allt');

-- Gratis-ägaren direkt mot tabellerna (som PostgREST).
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-2170-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 5-8. Tjänstegränsen.
select throws_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, sort)
     values ('cccccccc-1170-0000-0000-000000000001', 'S5', 30, 1000, 5) $$,
  '23514', 'El plan actual no permite más servicios activos', 'Gratis: fjärde aktiva tjänsten nekas'
);
select lives_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, sort, active)
     values ('cccccccc-1170-0000-0000-000000000001', 'S6', 30, 1000, 6, false) $$,
  'Gratis: inaktiv tjänst går att spara'
);
select throws_ok(
  $$ update public.services set active = true where id = 'cccccccc-4170-0000-0000-000000000004' $$,
  '23514', 'El plan actual no permite más servicios activos', 'Gratis: att aktivera en fjärde nekas'
);
select lives_ok(
  $$ update public.services set name = 'S1b' where id = 'cccccccc-4170-0000-0000-000000000001' $$,
  'Gratis: ändra en befintlig aktiv tjänst går bra'
);

-- 9. Blixttider.
select throws_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('cccccccc-1170-0000-0000-000000000001', 'cccccccc-3170-0000-0000-000000000001',
             now() + interval '1 day', now() + interval '1 day 1 hour', 20,
             'cccccccc-2170-0000-0000-000000000001') $$,
  '42501', 'El plan actual no incluye horas flash', 'Gratis: blixttid nekas'
);

-- 10-11. Medlemsrabatt: att slå på nekas, att stänga av går.
select throws_ok(
  $$ update public.businesses set member_discount_pct = 10 where id = 'cccccccc-1170-0000-0000-000000000001' $$,
  '42501', 'El plan actual no incluye beneficios para socios ni envíos', 'Gratis: medlemsrabatt nekas'
);
select lives_ok(
  $$ update public.businesses set member_discount_pct = null where id = 'cccccccc-1170-0000-0000-000000000001' $$,
  'Gratis: att stänga av rabatten går'
);

-- 12. Medlemskap kan inte läggas in direkt (bara via accept_invitation).
select throws_ok(
  $$ insert into public.memberships (business_id, user_id, role)
     values ('cccccccc-1170-0000-0000-000000000001', 'cccccccc-2170-0000-0000-000000000009', 'staff') $$,
  '42501'
);
reset role;

-- 13-15. Team-ägaren: samma saker går bra.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-2170-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.services (business_id, name, duration_min, price_clp, sort)
     values ('cccccccc-1170-0000-0000-000000000002', 'E4', 30, 1000, 4) $$,
  'Team: fjärde aktiva tjänsten går bra'
);
select lives_ok(
  $$ insert into public.flash_slots (business_id, staff_id, starts_at, ends_at, discount_pct, created_by)
     values ('cccccccc-1170-0000-0000-000000000002', 'cccccccc-3170-0000-0000-000000000002',
             now() + interval '1 day', now() + interval '1 day 1 hour', 20,
             'cccccccc-2170-0000-0000-000000000002') $$,
  'Team: blixttid går bra'
);
select lives_ok(
  $$ update public.businesses set member_discount_pct = 10 where id = 'cccccccc-1170-0000-0000-000000000002' $$,
  'Team: medlemsrabatt går bra'
);
reset role;

-- 16. Sms-kvotens reservationskolumn finns.
select has_column('public', 'message_outbox', 'quota_reserved_at', 'message_outbox.quota_reserved_at finns');

select * from finish();
rollback;
