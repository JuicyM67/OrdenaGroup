-- Tvärgående vakt: fångar framtida tabeller/funktioner som avviker från
-- INV-3 (RLS, inga anon-policies) och D-014 (business_id + index, sammansatta FK).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- 1. Varje tabell i public har row level security påslaget.
select ok(
  not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = false
  ),
  'alla tabeller i public har relrowsecurity = true'
);

-- 2. Ingen policy har rollen anon eller public.
select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and (roles @> array['anon']::name[] or roles @> array['public']::name[])
  ),
  'ingen policy i pg_policies har rollen anon eller public'
);

-- 3. anon har inga tabell-, sekvens- eller funktionsprivilegier i public.
select ok(
  not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'S')
      and (
        has_table_privilege('anon', c.oid, 'select')
        or has_table_privilege('anon', c.oid, 'insert')
        or has_table_privilege('anon', c.oid, 'update')
        or has_table_privilege('anon', c.oid, 'delete')
      )
  ),
  'anon har inga tabell- eller sekvensprivilegier i public'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'execute')
  ),
  'anon har inga funktionsprivilegier i public'
);

-- 4. Varje security definer-funktion i public/private har search_path satt.
select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef = true
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  ),
  'varje security definer-funktion i public/private har search_path satt'
);

-- 5. Varje tabell med kolumnen business_id har ett index som börjar på business_id.
select ok(
  not exists (
    select 1
    from information_schema.columns col
    where col.table_schema = 'public'
      and col.column_name = 'business_id'
      and not exists (
        select 1
        from pg_catalog.pg_index i
        join pg_catalog.pg_class t on t.oid = i.indrelid
        join pg_catalog.pg_namespace tn on tn.oid = t.relnamespace
        where tn.nspname = 'public'
          and t.relname = col.table_name
          and i.indkey[0] = (
            select a.attnum
            from pg_catalog.pg_attribute a
            where a.attrelid = t.oid and a.attname = 'business_id'
          )
      )
  ),
  'varje tabell med business_id har ett index som börjar på business_id'
);

-- 6. btree_gist är installerat, och no_overlap på bookings är en exclusion constraint.
select ok(
  exists (select 1 from pg_extension where extname = 'btree_gist'),
  'btree_gist är installerat'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'no_overlap'
      and conrelid = 'public.bookings'::regclass
      and contype = 'x'
  ),
  'no_overlap finns på bookings och är en exclusion constraint'
);

-- Säkerhet S1: allowlist över funktioner i `public` som `authenticated` får
-- köra. Fångar av misstag för brett `grant execute` på en ny funktion.
-- Uppdatera listan medvetet när en ny public-funktion ska vara anropbar.
select is(
  (
    select coalesce(array_agg(p.proname::text order by p.proname::text), array[]::text[])
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('authenticated', p.oid, 'execute')
  ),
  array['accept_invitation', 'create_business'],
  'authenticated får bara köra accept_invitation()/create_business() bland public-funktioner'
);

select finish();
rollback;
