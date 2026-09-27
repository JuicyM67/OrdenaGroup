-- WP-10 steg 8 · Spegling av sommartidsfixturen i Postgres tzdata.
-- F#: F4 ("sommartidsbyten testade"). R11 i WP-10, R1 i WP-04.
--
-- Raderna nedan är exakt src/lib/format/__fixtures__/santiago-dst.ts
-- (2020–2030, 22 övergångar). src/server/scheduling/dst-mirror.test.ts
-- kontrollerar att de två inte glider isär. Motorn räknar lokal tid i Node
-- (dates.ts) och databasen lagrar bara UTC, så en skillnad påverkar inte
-- tiderna direkt — men testet larmar om Postgres tzdata (Supabase-imagen)
-- och Node skiljer sig, se SCHEDULING.md "Rutin när Chile ändrar sommartiden".
--
-- Per övergång: offset en sekund före, offset vid övergången, och den
-- lokala dagens längd (23/25 h) via `timestamp at time zone`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(66);

create temporary table santiago_dst (
  kind text not null,
  utc timestamptz not null,
  local_date date not null,
  offset_before_minutes integer not null,
  offset_after_minutes integer not null,
  day_length_hours integer not null
) on commit drop;

insert into santiago_dst
  (kind, utc, local_date, offset_before_minutes, offset_after_minutes, day_length_hours)
values
  ('end', '2020-04-05T03:00:00Z', '2020-04-04', -180, -240, 25),
  ('start', '2020-09-06T04:00:00Z', '2020-09-06', -240, -180, 23),
  ('end', '2021-04-04T03:00:00Z', '2021-04-03', -180, -240, 25),
  ('start', '2021-09-05T04:00:00Z', '2021-09-05', -240, -180, 23),
  ('end', '2022-04-03T03:00:00Z', '2022-04-02', -180, -240, 25),
  ('start', '2022-09-11T04:00:00Z', '2022-09-11', -240, -180, 23),
  ('end', '2023-04-02T03:00:00Z', '2023-04-01', -180, -240, 25),
  ('start', '2023-09-03T04:00:00Z', '2023-09-03', -240, -180, 23),
  ('end', '2024-04-07T03:00:00Z', '2024-04-06', -180, -240, 25),
  ('start', '2024-09-08T04:00:00Z', '2024-09-08', -240, -180, 23),
  ('end', '2025-04-06T03:00:00Z', '2025-04-05', -180, -240, 25),
  ('start', '2025-09-07T04:00:00Z', '2025-09-07', -240, -180, 23),
  ('end', '2026-04-05T03:00:00Z', '2026-04-04', -180, -240, 25),
  ('start', '2026-09-06T04:00:00Z', '2026-09-06', -240, -180, 23),
  ('end', '2027-04-04T03:00:00Z', '2027-04-03', -180, -240, 25),
  ('start', '2027-09-05T04:00:00Z', '2027-09-05', -240, -180, 23),
  ('end', '2028-04-02T03:00:00Z', '2028-04-01', -180, -240, 25),
  ('start', '2028-09-03T04:00:00Z', '2028-09-03', -240, -180, 23),
  ('end', '2029-04-08T03:00:00Z', '2029-04-07', -180, -240, 25),
  ('start', '2029-09-02T04:00:00Z', '2029-09-02', -240, -180, 23),
  ('end', '2030-04-07T03:00:00Z', '2030-04-06', -180, -240, 25),
  ('start', '2030-09-08T04:00:00Z', '2030-09-08', -240, -180, 23);

-- Offset i minuter för en instant: väggtid i Santiago minus väggtid i UTC.
select is(
  (extract(epoch from
     ((d.utc - interval '1 second') at time zone 'America/Santiago')
     - ((d.utc - interval '1 second') at time zone 'UTC')) / 60)::integer,
  d.offset_before_minutes,
  format('%s %s: offset en sekund före bytet', d.kind, d.utc)
)
from santiago_dst d
order by d.utc;

select is(
  (extract(epoch from
     (d.utc at time zone 'America/Santiago') - (d.utc at time zone 'UTC')) / 60)::integer,
  d.offset_after_minutes,
  format('%s %s: offset vid bytet', d.kind, d.utc)
)
from santiago_dst d
order by d.utc;

-- Dagens längd: [lokal 00:00, nästa dags lokala 00:00). En 00:00 som inte
-- finns (september) tolkas med offset före bytet, dvs. 01:00 -03 (samma som
-- "compatible" i dates.ts).
select is(
  (extract(epoch from
     ((d.local_date + 1)::timestamp at time zone 'America/Santiago')
     - (d.local_date::timestamp at time zone 'America/Santiago')) / 3600)::integer,
  d.day_length_hours,
  format('%s %s: dagen %s har %s timmar', d.kind, d.utc, d.local_date, d.day_length_hours)
)
from santiago_dst d
order by d.utc;

select finish();
rollback;
