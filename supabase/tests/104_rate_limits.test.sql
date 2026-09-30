-- WP-27 · Pilotblockerare (säkerhetskontroll) · private.hit_rate_limit()
-- INV-3-andan: bara service_role får köra funktionen, ingen tabellåtkomst
-- för någon roll. Global funktion (ingen business_id/tenant-koppling), så
-- inget _helpers.psql-fixturbehov.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- 1-2. authenticated/anon kan aldrig köra funktionen.
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  $$ select private.hit_rate_limit('t:auth', interval '10 minutes', 5) $$,
  '42501'
);
reset role;

set local role anon;
select throws_ok(
  $$ select private.hit_rate_limit('t:anon', interval '10 minutes', 5) $$,
  '42501'
);
reset role;

-- 3. service_role: gränsen slår till efter p_max (3 tillåtna, den fjärde
-- blockerad, samma nyckel och fönster).
set local role service_role;
select is(private.hit_rate_limit('t:limit', interval '10 minutes', 3), true, 'försök 1/3 tillåts');
select is(private.hit_rate_limit('t:limit', interval '10 minutes', 3), true, 'försök 2/3 tillåts');
select is(private.hit_rate_limit('t:limit', interval '10 minutes', 3), true, 'försök 3/3 tillåts');
select is(private.hit_rate_limit('t:limit', interval '10 minutes', 3), false, 'försök 4 blockeras');

-- 4. En annan nyckel har sin egen räknare (ingen delning mellan nycklar).
select is(private.hit_rate_limit('t:annan-nyckel', interval '10 minutes', 1), true, 'en annan nyckel börjar om från noll');
reset role;

select finish();
rollback;
