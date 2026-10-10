-- WP-73 · Planspärrar (D-048): plan `custom` med avtalad personalgräns i
-- `businesses.custom_limits` (20261011040100_plan_custom_limits.sql).
-- `private.business_staff_limit` + `member_invitations_guard_limit` per företag,
-- och att `authenticated` inte kan skriva `custom_limits` själv.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.businesses (id, slug, name, comuna, category, plan, custom_limits) values
  ('cccccccc-1160-0000-0000-000000000001', 'test-custom-2', 'Custom Biz', 'Providencia', 'barberia', 'custom', '{"staff": 2, "sms": 1000}'),
  ('cccccccc-1160-0000-0000-000000000002', 'test-custom-std', 'Custom Std', 'Providencia', 'barberia', 'custom', '{}'),
  ('cccccccc-1160-0000-0000-000000000003', 'test-local-ign', 'Local Biz', 'Providencia', 'barberia', 'local', '{"staff": 50}');

insert into auth.users (id, email, role, aud) values
  ('cccccccc-2160-0000-0000-000000000001', 'owner-custom@example.com', 'authenticated', 'authenticated');

insert into public.memberships (business_id, user_id, role) values
  ('cccccccc-1160-0000-0000-000000000001', 'cccccccc-2160-0000-0000-000000000001', 'owner');

insert into public.staff (id, business_id, name, color) values
  ('cccccccc-3160-0000-0000-000000000001', 'cccccccc-1160-0000-0000-000000000001', 'C-Staff 1', 'staff-1'),
  ('cccccccc-3160-0000-0000-000000000002', 'cccccccc-1160-0000-0000-000000000001', 'C-Staff 2', 'staff-2');

-- 1-3. Gränsen per företag: avtalad, standard 10 för custom, och andra
-- planer ignorerar custom_limits.
select is(private.business_staff_limit('cccccccc-1160-0000-0000-000000000001'), 2, 'custom: avtalad gräns');
select is(private.business_staff_limit('cccccccc-1160-0000-0000-000000000002'), 10, 'custom utan avtal: 10');
select is(private.business_staff_limit('cccccccc-1160-0000-0000-000000000003'), 10, 'local ignorerar custom_limits');

-- 4. Ogiltig form nekas av check-constrainten.
select throws_ok(
  $$ update public.businesses set custom_limits = '{"staff": -1}' where id = 'cccccccc-1160-0000-0000-000000000002' $$,
  '23514'
);

-- 5-6. custom med gräns 2: ägaren + en inbjudan går, nästa nekas.
select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-2160-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('cccccccc-1160-0000-0000-000000000001', 'uno@example.com', 'cccccccc-3160-0000-0000-000000000001',
             'cccccccc-2160-0000-0000-000000000001', extensions.digest('token-custom-1', 'sha256')) $$,
  'custom: första inbjudan (2 platser) är okej'
);
select throws_ok(
  $$ insert into public.member_invitations (business_id, email, staff_id, invited_by, token_hash)
     values ('cccccccc-1160-0000-0000-000000000001', 'dos@example.com', 'cccccccc-3160-0000-0000-000000000002',
             'cccccccc-2160-0000-0000-000000000001', extensions.digest('token-custom-2', 'sha256')) $$,
  '42501'
);

-- 7. Ägaren kan inte sätta sina egna gränser (ingen update-grant på kolumnen).
select throws_ok(
  $$ update public.businesses set custom_limits = '{"staff": 999}' where id = 'cccccccc-1160-0000-0000-000000000001' $$,
  '42501'
);
reset role;

select * from finish();
rollback;
