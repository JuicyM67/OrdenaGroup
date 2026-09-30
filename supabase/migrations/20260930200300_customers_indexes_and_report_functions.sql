-- WP-24 · Clientes + Caja (db-engineer) · Index + rapportfunktioner
-- F#: F6/F9/F10. Plan: docs/tasks/plans/WP-24-clientes-caja.md.
--
-- 1. Index för kundlistans sök/sort: lower(name) (sök/sortera på namn),
--    phone (redan täckt av `unique (business_id, phone_e164)` sedan
--    20260927100300), "senaste besök" via bookings (visits_count/
--    last_visit_at på customers är INTE underhållna av någon trigger ännu,
--    se DATA_MODEL.md:s kommentar vid customers — WP-21:s jobb — så
--    kundlistan måste räkna senaste besök/antal besök live från `bookings`,
--    inte från de denormaliserade kolumnerna).
create index customers_business_id_lower_name_idx
  on public.customers (business_id, lower(name));

-- Partiellt index: bara 'completed' räknas som ett besök (Clientes-planen:
-- "stamkunder ≥ 3 besök", "senaste besök", skiljer sig från 'no_show').
-- Täcker både "senaste besök" (ORDER BY lower(period) DESC LIMIT 1 per
-- kund) och "antal besök" (COUNT(*) group by customer_id).
create index bookings_business_customer_completed_period_idx
  on public.bookings (business_id, customer_id, (lower(period)) desc)
  where status = 'completed';

-- Eget index för "med uteblivna"-filtret (samma resonemang, annan status).
create index bookings_business_customer_no_show_idx
  on public.bookings (business_id, customer_id)
  where status = 'no_show';

-- 2. Rapportfunktioner -------------------------------------------------------
-- Gemensamt mönster: `security invoker` (INTE `security definer` — de ska
-- köra med anroparens egna rättigheter, så att den vanliga RLS:en på
-- `bookings`/`payments`/`customers` fortfarande gäller om något nytt läggs
-- till där senare; "försvar på djupet", inte den enda spärren). `stable`
-- (bara läsning, ingen tidsberoende cachning över en sats). `search_path =
-- ''` (samma regel som alla funktioner i den här kodbasen, oavsett
-- definer/invoker). Ett explicit `private.has_perm(b, 'can_view_reports')`-
-- test FÖRST i varje funktion, INNAN någon rad läses: `bookings` är läsbart
-- för HELA kalendern (owner+staff, oavsett flaggor, se 20260930150100) — om
-- funktionerna bara litade på RLS skulle en profesional utan
-- `can_view_reports` ändå kunna läsa ut omsättningssiffror via RPC-anropet,
-- trots att Caja e informes-SIDAN kräver flaggan. Explicit `business_id`-
-- filter (`b`) i varje fråga, aldrig hela tabellen.
--
-- `"from"`/`"to"` är citerade (reserverade SQL-nyckelord, kan inte vara
-- unquoted parameternamn) men matchar annars uppdragets signaturer exakt;
-- PostgREST citerar identifierare automatiskt vid RPC-anrop, så
-- `supabase.rpc('report_summary', { b, from, to })` fungerar oförändrat.

-- public.report_summary -----------------------------------------------------
-- Omsättning betald (summan av 'approved'-betalningar, paid_at i
-- intervallet), förväntat obetalt (pris minus rabatt för avslutade/
-- bekräftade bokningar i intervallet UTAN en 'approved'/'full'-betalning),
-- antal bokningar (allt utom cancelled, med bokningsstart i intervallet),
-- uteblivna (status = 'no_show'), snittpris (snitt av pris minus rabatt för
-- bekräftade/avslutade bokningar i intervallet).
create function public.report_summary(b uuid, "from" timestamptz, "to" timestamptz)
returns table (
  revenue_clp bigint,
  expected_clp bigint,
  bookings_count bigint,
  no_show_count bigint,
  average_price_clp numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not private.has_perm(b, 'can_view_reports') then
    raise exception 'No tienes permiso para ver los informes' using errcode = '42501';
  end if;

  return query
  select
    coalesce((
      select sum(p.amount_clp) from public.payments p
       where p.business_id = b and p.status = 'approved'
         and p.paid_at >= "from" and p.paid_at < "to"
    ), 0)::bigint as revenue_clp,
    coalesce((
      select sum(bk.price_clp - bk.discount_clp) from public.bookings bk
       where bk.business_id = b
         and bk.status in ('confirmed', 'completed')
         and lower(bk.period) >= "from" and lower(bk.period) < "to"
         and not exists (
           select 1 from public.payments p2
            where p2.business_id = bk.business_id
              and p2.booking_id = bk.id
              and p2.status = 'approved'
              and p2.kind = 'full'
         )
    ), 0)::bigint as expected_clp,
    (
      select count(*) from public.bookings bk
       where bk.business_id = b
         and bk.status <> 'cancelled'
         and lower(bk.period) >= "from" and lower(bk.period) < "to"
    )::bigint as bookings_count,
    (
      select count(*) from public.bookings bk
       where bk.business_id = b
         and bk.status = 'no_show'
         and lower(bk.period) >= "from" and lower(bk.period) < "to"
    )::bigint as no_show_count,
    (
      select round(avg(bk.price_clp - bk.discount_clp), 0) from public.bookings bk
       where bk.business_id = b
         and bk.status in ('confirmed', 'completed')
         and lower(bk.period) >= "from" and lower(bk.period) < "to"
    ) as average_price_clp;
end;
$$;

revoke all on function public.report_summary(uuid, timestamptz, timestamptz) from public;
grant execute on function public.report_summary(uuid, timestamptz, timestamptz) to authenticated;

-- public.report_breakdown ----------------------------------------------------
-- Fördelning per betalmetod ('approved'-betalningar, paid_at i intervallet),
-- per medarbetare eller per tjänst (bokningar med bokningsstart i
-- intervallet, exklusive cancelled — omsättningen är bara de 'approved'-
-- betalningar som hör till bokningen, INTE förväntat obetalt, till skillnad
-- från report_summary).
create function public.report_breakdown(b uuid, "from" timestamptz, "to" timestamptz, dim text)
returns table (
  key text,
  label text,
  amount_clp bigint,
  bookings_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if dim not in ('method', 'staff', 'service') then
    raise exception 'public.report_breakdown: dim desconocido %', dim using errcode = '22023';
  end if;

  if not private.has_perm(b, 'can_view_reports') then
    raise exception 'No tienes permiso para ver los informes' using errcode = '42501';
  end if;

  if dim = 'method' then
    return query
    select p.method::text as key, p.method::text as label,
           coalesce(sum(p.amount_clp), 0)::bigint as amount_clp,
           count(*)::bigint as bookings_count
      from public.payments p
     where p.business_id = b and p.status = 'approved'
       and p.paid_at >= "from" and p.paid_at < "to"
     group by p.method
     order by amount_clp desc;
  elsif dim = 'staff' then
    return query
    select s.id::text as key, s.name as label,
           coalesce(sum(p.amount_clp), 0)::bigint as amount_clp,
           count(distinct bk.id)::bigint as bookings_count
      from public.bookings bk
      join public.staff s on s.business_id = bk.business_id and s.id = bk.staff_id
      left join public.payments p
        on p.business_id = bk.business_id and p.booking_id = bk.id
       and p.status = 'approved' and p.paid_at >= "from" and p.paid_at < "to"
     where bk.business_id = b
       and bk.status <> 'cancelled'
       and lower(bk.period) >= "from" and lower(bk.period) < "to"
     group by s.id, s.name
     order by amount_clp desc;
  else
    return query
    select sv.id::text as key, sv.name as label,
           coalesce(sum(p.amount_clp), 0)::bigint as amount_clp,
           count(distinct bk.id)::bigint as bookings_count
      from public.bookings bk
      join public.services sv on sv.business_id = bk.business_id and sv.id = bk.service_id
      left join public.payments p
        on p.business_id = bk.business_id and p.booking_id = bk.id
       and p.status = 'approved' and p.paid_at >= "from" and p.paid_at < "to"
     where bk.business_id = b
       and bk.status <> 'cancelled'
       and lower(bk.period) >= "from" and lower(bk.period) < "to"
     group by sv.id, sv.name
     order by amount_clp desc;
  end if;
end;
$$;

revoke all on function public.report_breakdown(uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.report_breakdown(uuid, timestamptz, timestamptz, text) to authenticated;

-- public.report_weekly --------------------------------------------------
-- Omsättning per vecka (senaste `weeks` veckor, inklusive innevarande),
-- räknat i FÖRETAGETS tidszon (businesses.timezone, D-025/D-026 — Chile
-- eller Sverige), inte UTC eller sessionens tidszon. En rad per vecka, även
-- veckor utan betalningar (0), sorterat äldst → nyast.
create function public.report_weekly(b uuid, weeks integer)
returns table (
  week_start date,
  revenue_clp bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  tz text;
begin
  if not private.has_perm(b, 'can_view_reports') then
    raise exception 'No tienes permiso para ver los informes' using errcode = '42501';
  end if;

  if weeks is null or weeks <= 0 or weeks > 104 then
    raise exception 'public.report_weekly: weeks fuera de rango %', weeks using errcode = '22023';
  end if;

  select bz.timezone into tz from public.businesses bz where bz.id = b;
  if tz is null then
    raise exception 'public.report_weekly: negocio % no encontrado', b using errcode = '22023';
  end if;

  return query
  with weeks_series as (
    select generate_series(
      date_trunc('week', (now() at time zone tz))::date - ((weeks - 1) * 7),
      date_trunc('week', (now() at time zone tz))::date,
      interval '7 day'
    )::date as week_start
  ),
  paid as (
    select date_trunc('week', (p.paid_at at time zone tz))::date as week_start,
           p.amount_clp
      from public.payments p
     where p.business_id = b and p.status = 'approved'
  )
  select ws.week_start, coalesce(sum(paid.amount_clp), 0)::bigint as revenue_clp
    from weeks_series ws
    left join paid on paid.week_start = ws.week_start
   group by ws.week_start
   order by ws.week_start;
end;
$$;

revoke all on function public.report_weekly(uuid, integer) from public;
grant execute on function public.report_weekly(uuid, integer) to authenticated;

-- public.customer_stats -------------------------------------------------
-- Kundkortets statistikruta (besök, uteblivna, total omsättning,
-- snittkostnad). Räknar besök/uteblivna live från `bookings` (samma skäl
-- som indexen ovan: de denormaliserade räknarna på `customers` underhålls
-- inte än), omsättning/snitt från 'approved'-betalningar på kundens
-- bokningar. Samma `can_view_reports`-spärr som resten av filen (uppdraget
-- grupperar uttryckligen customer_stats med de andra rapportfunktionerna) —
-- själva kundkortets kontakt/historik-delar (utan pengar) läses direkt från
-- `customers`/`bookings` med deras egna, bredare RLS-policyer, inte via den
-- här funktionen.
create function public.customer_stats(b uuid, customer uuid)
returns table (
  visits_count bigint,
  no_show_count bigint,
  total_revenue_clp bigint,
  average_price_clp numeric,
  last_visit_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not private.has_perm(b, 'can_view_reports') then
    raise exception 'No tienes permiso para ver los informes' using errcode = '42501';
  end if;

  return query
  select
    (
      select count(*) from public.bookings bk
       where bk.business_id = b and bk.customer_id = customer and bk.status = 'completed'
    )::bigint as visits_count,
    (
      select count(*) from public.bookings bk
       where bk.business_id = b and bk.customer_id = customer and bk.status = 'no_show'
    )::bigint as no_show_count,
    coalesce((
      select sum(p.amount_clp) from public.payments p
       join public.bookings bk on bk.business_id = p.business_id and bk.id = p.booking_id
       where p.business_id = b and bk.customer_id = customer and p.status = 'approved'
    ), 0)::bigint as total_revenue_clp,
    (
      select round(avg(p.amount_clp), 0) from public.payments p
       join public.bookings bk on bk.business_id = p.business_id and bk.id = p.booking_id
       where p.business_id = b and bk.customer_id = customer and p.status = 'approved'
    ) as average_price_clp,
    (
      select max(lower(bk.period)) from public.bookings bk
       where bk.business_id = b and bk.customer_id = customer and bk.status = 'completed'
    ) as last_visit_at;
end;
$$;

revoke all on function public.customer_stats(uuid, uuid) from public;
grant execute on function public.customer_stats(uuid, uuid) to authenticated;
