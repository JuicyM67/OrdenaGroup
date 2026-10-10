-- WP-01 · Kärnschema · Seed: "Barbería Norte" (Providencia)
-- Körs bara av `supabase db reset` lokalt (db.seed i config.toml), aldrig i
-- produktion. Bara fiktiva personuppgifter: telefoner i formatet
-- +5690000xxxx, e-post bara @example.com (FRÅGA 7: relativa datum, se nedan).
--
-- Datum: relativa. Bokningarna läggs på den aktuella veckan (mån–lör) i
-- America/Santiago, med samma veckodagar, starttider, längder, kunder,
-- tjänster och profesionales som docs/design/reference/Agenda.dc.html.
-- Bokningar vars starttid redan har passerat får status 'completed', övriga
-- 'confirmed' (beräknas mot `now()` när `db reset` körs).

-- Företaget ------------------------------------------------------------
-- WP-41 steg 1: `about` är en kort presentationstext för profilsidan.
insert into public.businesses (id, slug, name, comuna, category, phone, address, accent_color, about)
values (
  'b0000000-0000-0000-0000-000000000001',
  'barberia-norte',
  'Barbería Norte',
  'Providencia',
  'barberia',
  '+56900000000',
  'Av. Ficticia 1234, Providencia',
  '#E3F36B',
  'Barbería de barrio en Providencia. Cortes clásicos, arreglo de barba y atención sin apuro, de lunes a sábado.'
);

-- Personal: Diego, Matías, Tomás (Reserva: alla gör alla tjänster) --------
insert into public.staff (id, business_id, name, color, sort) values
  ('b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000001', 'Diego', 'staff-1', 1),
  ('b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000001', 'Matías', 'staff-2', 2),
  ('b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000001', 'Tomás', 'staff-3', 3);

-- Tjänstekategorier (WP-40 steg 1, D-031) --------------------------------
-- Barbería Norte är en herrfrisyr, så alla tre tjänsterna hamnar i "Herr".
-- "Dam" och "Övrigt" skapas ändå (naturligt för en salong som kan tänkas
-- växa), tomma till att börja med — det visar också att bokningssidans
-- kategoriflikar döljs när färre än två kategorier har aktiva tjänster.
insert into public.service_categories (id, business_id, name, sort) values
  ('b0000000-0000-0000-0000-000000000901', 'b0000000-0000-0000-0000-000000000001', 'Dam', 1),
  ('b0000000-0000-0000-0000-000000000902', 'b0000000-0000-0000-0000-000000000001', 'Herr', 2),
  ('b0000000-0000-0000-0000-000000000903', 'b0000000-0000-0000-0000-000000000001', 'Övrigt', 3);

-- Tjänster ---------------------------------------------------------------
-- WP-41 steg 1: `description` syns på profilsidan under varje tjänst.
insert into public.services (id, business_id, name, duration_min, price_clp, buffer_after_min, sort, category_id, description) values
  ('b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'Corte clásico', 35, 12000, 0, 1, 'b0000000-0000-0000-0000-000000000902', 'Corte a tijera y máquina, incluye lavado y peinado final.'),
  ('b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000000001', 'Corte + barba', 50, 18000, 0, 2, 'b0000000-0000-0000-0000-000000000902', 'Corte clásico más arreglo de barba con toalla caliente y navaja.'),
  ('b0000000-0000-0000-0000-000000000203', 'b0000000-0000-0000-0000-000000000001', 'Perfilado de barba', 20, 8000, 0, 3, 'b0000000-0000-0000-0000-000000000902', 'Delineado y prolijo de barba, sin corte de pelo.');

-- Alla profesionales gör alla tjänster.
insert into public.staff_services (business_id, staff_id, service_id)
select 'b0000000-0000-0000-0000-000000000001', s.id, sv.id
from public.staff s
cross join public.services sv
where s.business_id = 'b0000000-0000-0000-0000-000000000001'
  and sv.business_id = 'b0000000-0000-0000-0000-000000000001';

-- Öppettider: lun–sáb 10:00–19:00, söndag stängt (ingen rad) --------------
insert into public.business_hours (business_id, weekday, start_time, end_time)
select 'b0000000-0000-0000-0000-000000000001', wd, '10:00'::time, '19:00'::time
from generate_series(1, 6) as wd;

-- Almuerzo 13:30–14:30 mån–lör, hela företaget (staff_id null) -----------
insert into public.time_off (business_id, staff_id, period, kind, note)
select
  'b0000000-0000-0000-0000-000000000001',
  null,
  tstzrange(
    ((date_trunc('week', (now() at time zone 'America/Santiago')))::date + wd + time '13:30') at time zone 'America/Santiago',
    ((date_trunc('week', (now() at time zone 'America/Santiago')))::date + wd + time '14:30') at time zone 'America/Santiago',
    '[)'
  ),
  'lunch',
  'Almuerzo'
from generate_series(0, 5) as wd;

-- Kunder (fiktiva) ---------------------------------------------------------
insert into public.customers (id, business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel, visits_count) values
  ('b0000000-0000-0000-0000-000000300001', 'b0000000-0000-0000-0000-000000000001', '+56900000001', 'Pablo Muñoz', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300002', 'b0000000-0000-0000-0000-000000000001', '+56900000002', 'Andrés Vega', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300003', 'b0000000-0000-0000-0000-000000000001', '+56900000003', 'Felipe Rojas', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300004', 'b0000000-0000-0000-0000-000000000001', '+56900000004', 'Cristóbal Díaz', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300005', 'b0000000-0000-0000-0000-000000000001', '+56900000005', 'Benjamín Silva', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300006', 'b0000000-0000-0000-0000-000000000001', '+56900000006', 'Tomás Fuentes', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300007', 'b0000000-0000-0000-0000-000000000001', '+56900000007', 'Lucas Herrera', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300008', 'b0000000-0000-0000-0000-000000000001', '+56900000008', 'Martín Soto', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300009', 'b0000000-0000-0000-0000-000000000001', '+56900000009', 'Vicente Araya', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300010', 'b0000000-0000-0000-0000-000000000001', '+56900000010', 'Diego Castro', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300011', 'b0000000-0000-0000-0000-000000000001', '+56900000011', 'Sebastián Mora', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300012', 'b0000000-0000-0000-0000-000000000001', '+56900000012', 'Nicolás Pino', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300013', 'b0000000-0000-0000-0000-000000000001', '+56900000013', 'Gabriel León', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300014', 'b0000000-0000-0000-0000-000000000001', '+56900000014', 'Agustín Vera', now() - interval '60 days', 'v1', 'web', 0),
  -- Martina Lagos: "6.ª visita" i designen, alltså 5 tidigare besök.
  ('b0000000-0000-0000-0000-000000300099', 'b0000000-0000-0000-0000-000000000001', '+56900004821', 'Martina Lagos', now() - interval '200 days', 'v1', 'whatsapp', 5),
  ('b0000000-0000-0000-0000-000000300015', 'b0000000-0000-0000-0000-000000000001', '+56900000015', 'Emilio Tapia', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300016', 'b0000000-0000-0000-0000-000000000001', '+56900000016', 'Joaquín Rivas', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300017', 'b0000000-0000-0000-0000-000000000001', '+56900000017', 'Maximiliano Ruiz', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300018', 'b0000000-0000-0000-0000-000000000001', '+56900000018', 'Renato Gil', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300019', 'b0000000-0000-0000-0000-000000000001', '+56900000019', 'Ian Soto', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300020', 'b0000000-0000-0000-0000-000000000001', '+56900000020', 'Bruno Paz', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300021', 'b0000000-0000-0000-0000-000000000001', '+56900000021', 'Alonso Rey', now() - interval '60 days', 'v1', 'web', 0),
  ('b0000000-0000-0000-0000-000000300022', 'b0000000-0000-0000-0000-000000000001', '+56900000022', 'Samuel Ortiz', now() - interval '60 days', 'v1', 'web', 0);

-- Bokningar: en vecka som följer Agenda.dc.html exakt (veckodag, starttid,
-- längd, kund, tjänst, profesional). Status beräknas mot `now()`.
--
-- Lunes (dag 0) ------------------------------------------------------------
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300001',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 0 + time '10:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 0 + time '10:00') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300002',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 0 + time '11:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 0 + time '11:00') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300003',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 0 + time '14:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 0 + time '14:30') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

-- Martes (dag 1) -------------------------------------------------------
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300004',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 1 + time '10:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 1 + time '10:30') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300005',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 1 + time '12:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 1 + time '12:00') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300006',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 1 + time '15:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 1 + time '15:00') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

-- Miércoles (dag 2) ----------------------------------------------------
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000203', 'b0000000-0000-0000-0000-000000300007',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 8000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '10:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '10:00') at time zone 'America/Santiago') + interval '20 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300008',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '11:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '11:00') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300009',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '12:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '12:00') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300010',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '14:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 2 + time '14:30') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

-- Jueves (dag 3) ---------------------------------------------------------
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300011',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 3 + time '10:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 3 + time '10:30') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300012',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 3 + time '11:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 3 + time '11:30') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300013',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 3 + time '14:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 3 + time '14:30') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

-- Viernes (dag 4) --------------------------------------------------------
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300014',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '10:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '10:00') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

-- Martina Lagos: abono $3.000 pagado, "Confirmó por WhatsApp" i designen.
insert into public.bookings (id, business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, deposit_clp, confirmed_by_customer_at)
select 'b0000000-0000-0000-0000-000000400099', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300099',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000, 3000, now() - interval '1 day'
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '11:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '11:30') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.payments (business_id, booking_id, kind, method, amount_clp, status, provider_ref, paid_at)
values (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000400099',
  'deposit',
  'mercadopago',
  3000,
  'approved',
  'mp-seed-martina-001',
  now() - interval '1 day'
);

-- Emilio Tapia: hora flash, -20% de descuento.
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp, discount_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300015',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'flash', 18000, 3600
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '12:15') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '12:15') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300016',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '15:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 4 + time '15:00') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

-- Sábado (dag 5) -----------------------------------------------------------
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300017',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '10:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '10:00') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300018',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '11:00') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '11:00') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

-- Ian Soto: kom från väntelistan.
insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300019',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'waitlist', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '11:45') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '11:45') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000300020',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 18000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '12:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '12:30') at time zone 'America/Santiago') + interval '50 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300021',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '14:30') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '14:30') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

insert into public.bookings (business_id, staff_id, service_id, customer_id, period, blocked, status, source, price_clp)
select 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000300022',
       tstzrange(lower, upper, '[)'), tstzrange(lower, upper, '[)'),
       case when lower < now() then 'completed'::booking_status else 'confirmed'::booking_status end, 'web', 12000
from (select (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '15:15') at time zone 'America/Santiago') as lower,
             (((date_trunc('week', (now() at time zone 'America/Santiago')))::date + 5 + time '15:15') at time zone 'America/Santiago') + interval '35 minutes' as upper) t;

-- Ägaren (R5: bräcklig direktinsert i auth.users; om det inte fungerar
-- skapar WP-15 användaren via Auth-API i stället). Ingen lösenord: inloggning
-- sker via magisk länk (lokal mail).
-- qa5/K7: token-kolumnerna sätts till '' i stället för NULL. GoTrue (Auth-
-- API:et) läser dessa som icke-nullbara strängar internt och kraschar annars
-- vid inloggning ("sql: Scan error ... converting NULL to string is
-- unsupported"), ett känt problem med direktinsert i auth.users.
insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b0000000-0000-0000-0000-000000900001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dueno@example.com',
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

-- En auth.identities-rad krävs för att GoTrue ska räkna kontot som ett
-- riktigt email-konto (t.ex. för att kunna slå upp det vid inloggning).
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, created_at, updated_at
) values (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000900001',
  'b0000000-0000-0000-0000-000000900001',
  'email',
  '{"sub":"b0000000-0000-0000-0000-000000900001","email":"dueno@example.com","email_verified":true}',
  now(),
  now()
);

insert into public.memberships (business_id, user_id, role)
values ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000900001', 'owner');

-- WP-63 (D-043): demoföretagen som marknadssidan länkar till (brand.demoSlug).
-- Lokalt delar CL och SE samma databas, så båda skapas här. I staging/prod
-- skapas bara den egna marknadens demo (deploy-staging.yml, /api/cron/retention).
select private.seed_demo('CL');
select private.seed_demo('SE');

-- WP-68 (D-056): påhittade SE-salonger runt Södermalm/Vasastan för marknadsplatsen
-- (upptäck, karta, blixttider, verifierade recensioner) lokalt och i e2e. BARA
-- lokalt: seed.sql körs aldrig i staging/prod. Fasta id:n `ad00000N-…`.
do $$
declare
  r record;
  v_staff uuid;
  v_svc uuid;
  v_cust uuid;
  v_book uuid;
  v_start timestamptz;
  i int;
  v_names text[] := array['Sara Lind', 'Johan Berg', 'Amina Ali', 'Erik Holm', 'Lina Ek'];
  v_comments text[] := array[
    'Supertrevligt bemötande och precis det jag ville ha. Kommer tillbaka!',
    'Lugnt, proffsigt och i tid.',
    null,
    'Bästa behandlingen jag fått på länge.',
    'Enkelt att boka och jättebra resultat.'
  ];
begin
  for r in
    select * from (values
      (1, 'hudrummet', 'Hudrummet', 'estetica', 'Götgatan 41, 118 26 Stockholm', 59.31440, 18.07250, 'sodermalm', 'Södermalm',
       'Ansiktsbehandling 60 min', 99500, 59700, 'hudvard', '/marketing/hudvard.webp', false, 'ansiktsbehandling-60-min-a1'),
      (2, 'nagelstudion-soder', 'Nagelstudion', 'unas', 'Hornsgatan 58, 118 21 Stockholm', 59.31790, 18.06190, 'sodermalm', 'Södermalm',
       'Gellack + manikyr', 69500, 49500, 'naglar', '/marketing/naglar.webp', true, 'gellack-och-manikyr-a2'),
      (3, 'studio-mosebacke', 'Studio Mosebacke', 'peluqueria', 'Mosebacke torg 3, 116 46 Stockholm', 59.31830, 18.07560, 'sodermalm', 'Södermalm',
       'Färgning + klippning', 185000, 139000, 'har', '/marketing/makeup.webp', false, 'fargning-och-klippning-a3'),
      (4, 'kroppsrum', 'Kroppsrum', 'masajes', 'Upplandsgatan 12, 113 60 Stockholm', 59.34230, 18.04650, 'vasastan', 'Vasastan',
       'Klassisk massage 50 min', 79500, 63600, 'massage', '/marketing/massage.webp', true, 'klassisk-massage-50-min-a4'),
      (5, 'barberaren-soder', 'Barberaren Söder', 'barberia', 'Skånegatan 70, 116 37 Stockholm', 59.31310, 18.07890, 'sodermalm', 'Södermalm',
       'Herrklippning + skägg', 56000, 42000, 'har', '/marketing/barberare.webp', true, 'herrklippning-och-skagg-a5')
    ) as t(n, slug, name, category, address, lat, lng, area_slug, area_name, offer, regular, price, ocat, img, flash, oslug)
  loop
    insert into public.businesses (
      id, slug, name, comuna, category, timezone, address, plan, status,
      lat, lng, area_slug, area_name, geocode_status, geocoded_at, about
    ) values (
      ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, r.slug, r.name, r.area_name,
      r.category, 'Europe/Stockholm', r.address, 'equipo', 'active',
      r.lat, r.lng, r.area_slug, r.area_name, 'manual', now(),
      'Påhittad salong för lokal utveckling av marknadsplatsen.'
    );
    v_staff := ('ad00000' || r.n || '-0000-0000-0001-000000000001')::uuid;
    insert into public.staff (id, business_id, name, color, active)
    values (v_staff, ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, 'Alex', 'staff-1', true);
    v_svc := ('ad00000' || r.n || '-0000-0000-0003-000000000001')::uuid;
    insert into public.services (id, business_id, name, duration_min, price_clp, active)
    values (v_svc, ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, r.offer, 60, r.regular, true);
    insert into public.staff_services (business_id, staff_id, service_id)
    values (('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, v_staff, v_svc);

    insert into public.offers (
      id, business_id, service_id, slug, title, description, includes, terms,
      image_url, regular_price_minor, offer_price_minor, currency, category, status, published_at
    ) values (
      ('ad00000' || r.n || '-0000-0000-0009-000000000001')::uuid,
      ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, v_svc,
      r.oslug, r.offer,
      'Ett erbjudande från ' || r.name || ' på ' || r.area_name || '.',
      array['Konsultation', r.offer, 'Ca 60 min'],
      'Gäller nya och befintliga kunder. Fri avbokning upp till 24 h före.',
      r.img, r.regular, r.price, 'SEK', r.ocat, 'published', now() - make_interval(days => r.n)
    );

    -- Fem genomförda bokningar med verifierade recensioner (D-045).
    for i in 1..5 loop
      v_cust := ('ad00000' || r.n || '-0000-0000-0004-00000000000' || i)::uuid;
      insert into public.customers (id, business_id, name, phone_e164)
      values (v_cust, ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, v_names[i],
              '+4670' || lpad((r.n * 100000 + i)::text, 7, '0'));
      v_book := ('ad00000' || r.n || '-0000-0000-0005-00000000000' || i)::uuid;
      v_start := date_trunc('hour', now()) - make_interval(days => 3 + i * 4);
      insert into public.bookings (
        id, business_id, staff_id, service_id, customer_id, period, blocked,
        status, source, price_clp
      ) values (
        v_book, ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, v_staff, v_svc, v_cust,
        tstzrange(v_start, v_start + interval '60 minutes', '[)'),
        tstzrange(v_start, v_start + interval '60 minutes', '[)'),
        'completed', 'web', r.regular
      );
      insert into public.reviews (
        business_id, booking_id, customer_id, rating, comment, display_name, reply, replied_at, created_at
      ) values (
        ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, v_book, v_cust,
        case when i = 3 then 4 else 5 end, v_comments[i],
        split_part(v_names[i], ' ', 1) || ' ' || left(split_part(v_names[i], ' ', 2), 1) || '.',
        case when i = 1 then 'Tack ' || split_part(v_names[i], ' ', 1) || ', välkommen åter!' end,
        case when i = 1 then v_start + interval '2 days' end,
        v_start + interval '1 day'
      );
    end loop;

    if r.flash then
      insert into public.flash_slots (business_id, staff_id, service_ids, starts_at, ends_at, discount_pct, status, created_by)
      values (
        ('ad00000' || r.n || '-0000-0000-0000-000000000001')::uuid, v_staff, array[v_svc],
        date_trunc('hour', now()) + make_interval(hours => 1 + r.n),
        date_trunc('hour', now()) + make_interval(hours => 2 + r.n),
        20 + r.n * 2, 'active', 'b0000000-0000-0000-0000-000000900001'
      );
    end if;
  end loop;
end;
$$;
