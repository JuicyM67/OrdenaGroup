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
insert into public.businesses (id, slug, name, comuna, category, phone, address, accent_color)
values (
  'b0000000-0000-0000-0000-000000000001',
  'barberia-norte',
  'Barbería Norte',
  'Providencia',
  'barberia',
  '+56221234567',
  'Av. Providencia 1234, Providencia',
  '#E3F36B'
);

-- Personal: Diego, Matías, Tomás (Reserva: alla gör alla tjänster) --------
insert into public.staff (id, business_id, name, color, sort) values
  ('b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000001', 'Diego', 'staff-1', 1),
  ('b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000001', 'Matías', 'staff-2', 2),
  ('b0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000001', 'Tomás', 'staff-3', 3);

-- Tjänster ---------------------------------------------------------------
insert into public.services (id, business_id, name, duration_min, price_clp, buffer_after_min, sort) values
  ('b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'Corte clásico', 35, 12000, 0, 1),
  ('b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000000001', 'Corte + barba', 50, 18000, 0, 2),
  ('b0000000-0000-0000-0000-000000000203', 'b0000000-0000-0000-0000-000000000001', 'Perfilado de barba', 20, 8000, 0, 3);

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
insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b0000000-0000-0000-0000-000000900001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dueno@example.com',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

insert into public.memberships (business_id, user_id, role)
values ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000900001', 'owner');
