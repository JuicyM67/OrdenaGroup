-- WP-63 · Demoföretag per marknad (D-043)
-- Marknadssidans "Se en exempelkalender" länkar till `brand.demoSlug`
-- (src/config/brand.ts). Varje marknad har sin egen databas (D-025), så
-- demoföretaget måste finnas i varje databas — lokalt, i staging och i
-- produktion — och se levande ut varje dag.
--
-- Innehåll:
--   1. Bild-URL:er får även peka på våra egna statiska demobilder
--      (`/demo/<cl|se>/<namn>.<ext>`, filerna ligger i `public/demo/`).
--   2. `private.seed_demo(market)`: idempotent upsert av demoföretaget
--      (profil, personal, kategorier, tjänster, öppettider, galleri, kunder)
--      och rullande bokningar + horas flash relativt `now()`.
--
-- Anropas av: supabase/seed.sql (lokalt), deploy-staging.yml (efter db push)
-- och dagligen av /api/cron/retention (rullar datumen). Rör BARA de två fasta
-- demo-id:na nedan, aldrig riktiga företag.

-- 1. Statiska demobilder ------------------------------------------------------
-- Samma regel som tidigare (https:// eller loopback) plus en snäv vitlista för
-- en relativ sökväg till VÅRA egna statiska filer. Ingen extern domän, inget
-- data:-URI, ingen `..` (teckenklassen tillåter inte `/` eller `.` i namnet).
alter table public.businesses
  drop constraint businesses_cover_url_format,
  add constraint businesses_cover_url_format check (
    cover_url is null
    or cover_url ~ '^https://'
    or cover_url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/'
    or cover_url ~ '^/demo/(cl|se)/[a-z0-9-]+\.(webp|jpg|png|svg)$'
  ),
  drop constraint businesses_logo_url_format,
  add constraint businesses_logo_url_format check (
    logo_url is null
    or logo_url ~ '^https://'
    or logo_url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/'
    or logo_url ~ '^/demo/(cl|se)/[a-z0-9-]+\.(webp|jpg|png|svg)$'
  );

alter table public.staff
  drop constraint staff_photo_url_format,
  add constraint staff_photo_url_format check (
    photo_url is null
    or photo_url ~ '^https://'
    or photo_url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/'
    or photo_url ~ '^/demo/(cl|se)/[a-z0-9-]+\.(webp|jpg|png|svg)$'
  );

-- 2. private.seed_demo --------------------------------------------------------
-- Fasta id:n (prefix de00000N, N = 1 för CL, 2 för SE):
--   företag  de00000N-0000-0000-0000-000000000001
--   ägare    de00000N-0000-0000-0009-000000000001 (auth.users, krävs av
--            flash_slots.created_by; ingen inloggning, ingen membership)
--   personal de00000N-0000-0000-0001-00000000000k
--   kategori de00000N-0000-0000-0002-00000000000k
--   tjänst   de00000N-0000-0000-0003-00000000000k
--   kund     de00000N-0000-0000-0004-0000000000kk
-- Bokningar rullas om varje körning: demokundernas bokningar raderas och
-- läggs om i fönstret [-7, +13] dagar. Bokningar som besökare gjort själva
-- (andra kunder) rörs inte; krockar med dem hoppas över (on conflict do
-- nothing mot no_overlap). Aktiva flash-tider läggs om på samma sätt.
create function private.seed_demo(market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n text;
  v_biz uuid;
  v_owner uuid;
  v_tz text;
  v_slug text;
  v_dir text;
  v_customers uuid[];
  v_today date;
  v_day date;
  v_wd int;
  v_start timestamptz;
  v_end timestamptz;
  v_service record;
  v_count int;
  v_flash int := 0;
  d int;
  s int;
  k int;
begin
  if market = 'CL' then
    v_n := '1'; v_tz := 'America/Santiago'; v_slug := 'estudio-brisa'; v_dir := '/demo/cl/';
  elsif market = 'SE' then
    v_n := '2'; v_tz := 'Europe/Stockholm'; v_slug := 'salong-norrsken'; v_dir := '/demo/se/';
  else
    raise exception 'seed_demo: okänd marknad %', market using errcode = '22023';
  end if;

  v_biz := ('de00000' || v_n || '-0000-0000-0000-000000000001')::uuid;
  v_owner := ('de00000' || v_n || '-0000-0000-0009-000000000001')::uuid;

  -- Ett riktigt företag har redan tagit sluggen: rör ingenting.
  if exists (select 1 from public.businesses where slug = v_slug and id <> v_biz) then
    raise notice 'seed_demo: sluggen % används av ett annat företag, hoppar över', v_slug;
    return;
  end if;

  -- Ägaren (bara för flash_slots.created_by). Samma kolumner som seed.sql.
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'demo-' || lower(market) || '@example.com', now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  )
  on conflict (id) do nothing;

  -- Företaget ---------------------------------------------------------------
  if market = 'CL' then
    insert into public.businesses (
      id, slug, name, comuna, category, timezone, phone, address, accent_color,
      about, cover_url, logo_url, instagram, tiktok, facebook, plan, status,
      auto_confirm_bookings
    ) values (
      v_biz, v_slug, 'Estudio Brisa', 'Providencia', 'peluqueria', v_tz,
      '+56900000100', 'Av. Los Brisales 2450, local 3, Providencia', '#E3F36B',
      'Peluquería y barbería en Providencia, a pasos del metro. Cortes, color y barba sin apuro, con café de grano y buena conversación. Reserva en un minuto y te llega el recordatorio por WhatsApp.',
      v_dir || 'cover.webp', v_dir || 'logo.svg',
      'estudiobrisa.demo', 'estudiobrisa.demo', 'estudiobrisa.demo', 'local', 'active', true
    )
    on conflict (id) do update set
      slug = excluded.slug, name = excluded.name, comuna = excluded.comuna,
      category = excluded.category, timezone = excluded.timezone, phone = excluded.phone,
      address = excluded.address, accent_color = excluded.accent_color, about = excluded.about,
      cover_url = excluded.cover_url, logo_url = excluded.logo_url,
      instagram = excluded.instagram, tiktok = excluded.tiktok, facebook = excluded.facebook,
      plan = excluded.plan, status = excluded.status,
      auto_confirm_bookings = excluded.auto_confirm_bookings;
  else
    insert into public.businesses (
      id, slug, name, comuna, category, timezone, phone, address, accent_color,
      about, cover_url, logo_url, instagram, tiktok, facebook, plan, status,
      auto_confirm_bookings
    ) values (
      v_biz, v_slug, 'Salong Norrsken', 'Södermalm', 'peluqueria', v_tz,
      '+46701740605', 'Norrskensgränd 4, 118 20 Stockholm', '#E3F36B',
      'Frisörsalong på Södermalm för klippning, färg, bryn och fransar. Vi tar oss tid för konsultationen och jobbar med skonsamma produkter. Boka online dygnet runt – du får en påminnelse innan ditt besök.',
      v_dir || 'cover.webp', v_dir || 'logo.svg',
      'salongnorrsken.demo', 'salongnorrsken.demo', 'salongnorrsken.demo', 'local', 'active', true
    )
    on conflict (id) do update set
      slug = excluded.slug, name = excluded.name, comuna = excluded.comuna,
      category = excluded.category, timezone = excluded.timezone, phone = excluded.phone,
      address = excluded.address, accent_color = excluded.accent_color, about = excluded.about,
      cover_url = excluded.cover_url, logo_url = excluded.logo_url,
      instagram = excluded.instagram, tiktok = excluded.tiktok, facebook = excluded.facebook,
      plan = excluded.plan, status = excluded.status,
      auto_confirm_bookings = excluded.auto_confirm_bookings;
  end if;

  -- Personal ----------------------------------------------------------------
  insert into public.staff (id, business_id, name, title, color, sort, active, photo_url)
  select ('de00000' || v_n || '-0000-0000-0001-00000000000' || x.k)::uuid, v_biz,
         x.name, x.title, 'staff-' || x.k, x.k, true, v_dir || 'staff-' || x.k || '.webp'
  from (
    select * from (values
      ('CL', 1, 'Joaquín', 'Barbero senior'),
      ('CL', 2, 'Camila', 'Estilista y colorista'),
      ('CL', 3, 'Ignacio', 'Barbero'),
      ('CL', 4, 'Valentina', 'Estilista'),
      ('SE', 1, 'Elin', 'Frisör och färgspecialist'),
      ('SE', 2, 'Oscar', 'Barberare'),
      ('SE', 3, 'Sara', 'Frisör'),
      ('SE', 4, 'Maja', 'Bryn- och fransstylist')
    ) as t(m, k, name, title)
    where t.m = market
  ) x
  on conflict (id) do update set
    name = excluded.name, title = excluded.title, color = excluded.color,
    sort = excluded.sort, active = true, photo_url = excluded.photo_url;

  -- Kategorier --------------------------------------------------------------
  insert into public.service_categories (id, business_id, name, sort)
  select ('de00000' || v_n || '-0000-0000-0002-00000000000' || x.k)::uuid, v_biz, x.name, x.k
  from (
    select * from (values
      ('CL', 1, 'Barbería'),
      ('CL', 2, 'Peluquería'),
      ('CL', 3, 'Color y tratamientos'),
      ('SE', 1, 'Klippning'),
      ('SE', 2, 'Färg'),
      ('SE', 3, 'Bryn och fransar')
    ) as t(m, k, name)
    where t.m = market
  ) x
  on conflict (id) do update set name = excluded.name, sort = excluded.sort;

  -- Tjänster (CL i pesos, SE i öre) -----------------------------------------
  insert into public.services (
    id, business_id, name, duration_min, price_clp, sort, category_id, description, active
  )
  select ('de00000' || v_n || '-0000-0000-0003-00000000000' || x.k)::uuid, v_biz,
         x.name, x.dur, x.price, x.k,
         ('de00000' || v_n || '-0000-0000-0002-00000000000' || x.cat)::uuid, x.descr, true
  from (
    select * from (values
      ('CL', 1, 1, 'Corte clásico', 35, 12000, 'Corte a tijera y máquina, con lavado y peinado final.'),
      ('CL', 2, 1, 'Corte + barba', 50, 18000, 'Corte clásico más arreglo de barba con toalla caliente y navaja.'),
      ('CL', 3, 1, 'Perfilado de barba', 20, 8000, 'Delineado y prolijo de barba, sin corte de pelo.'),
      ('CL', 4, 2, 'Corte de pelo largo', 45, 22000, 'Corte con asesoría de estilo, lavado y secado.'),
      ('CL', 5, 2, 'Brushing', 40, 15000, 'Secado con cepillo para un liso o con ondas que dure.'),
      ('CL', 6, 3, 'Color de raíz', 90, 38000, 'Retoque de raíz con tinte sin amoníaco. Incluye lavado.'),
      ('CL', 7, 3, 'Balayage', 150, 85000, 'Iluminación a mano alzada, matiz y brushing. Te recomendamos venir con el pelo seco.'),
      ('CL', 8, 3, 'Tratamiento hidratante', 30, 14000, 'Mascarilla de hidratación profunda con masaje capilar.'),
      ('SE', 1, 1, 'Damklippning', 60, 69500, 'Konsultation, tvätt, klippning och styling.'),
      ('SE', 2, 1, 'Herrklippning', 45, 49500, 'Sax och maskin, tvätt och styling ingår.'),
      ('SE', 3, 1, 'Skäggtrimning', 30, 29500, 'Formning och trimning av skägg med varm handduk.'),
      ('SE', 4, 2, 'Färgning utväxt', 90, 109500, 'Färg på utväxten, tvätt och föning.'),
      ('SE', 5, 2, 'Slingor i folie', 120, 149500, 'Slingor i hela håret, toning och föning.'),
      ('SE', 6, 2, 'Balayage', 180, 219500, 'Frihandsljusning för ett naturligt resultat, inklusive toning.'),
      ('SE', 7, 3, 'Brynformning och färg', 30, 39500, 'Formning med pincett och vax, färgning av bryn.'),
      ('SE', 8, 3, 'Fransfärgning', 20, 25000, 'Färgning av fransar, skonsam färg.')
    ) as t(m, k, cat, name, dur, price, descr)
    where t.m = market
  ) x
  on conflict (id) do update set
    name = excluded.name, duration_min = excluded.duration_min, price_clp = excluded.price_clp,
    sort = excluded.sort, category_id = excluded.category_id,
    description = excluded.description, active = true;

  -- Vem gör vad (personal k, tjänst k) --------------------------------------
  delete from public.staff_services where business_id = v_biz;
  insert into public.staff_services (business_id, staff_id, service_id)
  select v_biz,
         ('de00000' || v_n || '-0000-0000-0001-00000000000' || x.st)::uuid,
         ('de00000' || v_n || '-0000-0000-0003-00000000000' || x.sv)::uuid
  from (
    select * from (values
      ('CL', 1, 1), ('CL', 1, 2), ('CL', 1, 3),
      ('CL', 2, 4), ('CL', 2, 5), ('CL', 2, 6), ('CL', 2, 7), ('CL', 2, 8),
      ('CL', 3, 1), ('CL', 3, 2), ('CL', 3, 3), ('CL', 3, 8),
      ('CL', 4, 1), ('CL', 4, 4), ('CL', 4, 5), ('CL', 4, 6), ('CL', 4, 8),
      ('SE', 1, 1), ('SE', 1, 4), ('SE', 1, 5), ('SE', 1, 6),
      ('SE', 2, 2), ('SE', 2, 3),
      ('SE', 3, 1), ('SE', 3, 2), ('SE', 3, 4), ('SE', 3, 5),
      ('SE', 4, 7), ('SE', 4, 8)
    ) as t(m, st, sv)
    where t.m = market
  ) x;

  -- Öppettider (1 = måndag) -------------------------------------------------
  delete from public.business_hours where business_id = v_biz;
  insert into public.business_hours (business_id, weekday, start_time, end_time)
  select v_biz, wd,
         case when market = 'SE' and wd < 6 then time '09:00' else time '10:00' end,
         case
           when wd = 6 and market = 'SE' then time '16:00'
           when wd = 6 then time '18:00'
           when market = 'SE' then time '19:00'
           else time '20:00'
         end
  from generate_series(1, 6) as wd;

  -- Galleri (sökvägen måste ligga under företagets prefix, se
  -- business_images_path_prefix; page-data.ts mappar `<id>/demo/...` till
  -- den statiska filen) ------------------------------------------------------
  delete from public.business_images where business_id = v_biz;
  insert into public.business_images (business_id, path, sort)
  select v_biz, v_biz::text || v_dir || 'gallery-' || i || '.webp', i
  from generate_series(1, 3) as i;

  -- Kunder (fiktiva: CL +5690000xxxx, SE PTS fiktionsserie 070-17406xx) ------
  insert into public.customers (
    id, business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel
  )
  select ('de00000' || v_n || '-0000-0000-0004-0000000000' || lpad(x.k::text, 2, '0'))::uuid,
         v_biz,
         case when market = 'CL' then '+569000002' || lpad(x.k::text, 2, '0')
              else '+467017406' || lpad((x.k + 10)::text, 2, '0') end,
         x.name, now() - interval '90 days', 'v1', 'web'
  from (
    select * from (values
      ('CL', 1, 'Martina Soto'), ('CL', 2, 'Benjamín Rojas'), ('CL', 3, 'Florencia Díaz'),
      ('CL', 4, 'Vicente Muñoz'), ('CL', 5, 'Catalina Pérez'), ('CL', 6, 'Agustín Silva'),
      ('CL', 7, 'Josefa Contreras'), ('CL', 8, 'Tomás Herrera'), ('CL', 9, 'Antonia Vargas'),
      ('CL', 10, 'Maximiliano Castro'), ('CL', 11, 'Isidora Fuentes'), ('CL', 12, 'Lucas Morales'),
      ('SE', 1, 'Emma Johansson'), ('SE', 2, 'Lucas Andersson'), ('SE', 3, 'Alice Karlsson'),
      ('SE', 4, 'William Nilsson'), ('SE', 5, 'Ella Eriksson'), ('SE', 6, 'Hugo Larsson'),
      ('SE', 7, 'Ebba Olsson'), ('SE', 8, 'Liam Persson'), ('SE', 9, 'Wilma Svensson'),
      ('SE', 10, 'Noah Gustafsson'), ('SE', 11, 'Saga Pettersson'), ('SE', 12, 'Elias Jonsson')
    ) as t(m, k, name)
    where t.m = market
  ) x
  on conflict (id) do update set name = excluded.name, phone_e164 = excluded.phone_e164;

  select array_agg(id order by id) into v_customers
  from public.customers
  where business_id = v_biz
    and id::text like 'de00000' || v_n || '-0000-0000-0004-%';

  -- Rullande bokningar ------------------------------------------------------
  -- Aktiva flash-tider först (flash_slots.booking_id pekar aldrig på de här).
  delete from public.flash_slots where business_id = v_biz and status = 'active';
  delete from public.bookings where business_id = v_biz and customer_id = any (v_customers);

  v_today := (now() at time zone v_tz)::date;
  for d in -7..13 loop
    v_day := v_today + d;
    v_wd := extract(isodow from v_day)::int;
    continue when not exists (
      select 1 from public.business_hours where business_id = v_biz and weekday = v_wd
    );
    for s in 1..4 loop
      for k in 0..2 loop
        -- Ungefär två av tre platser bokade: luckor kvar att boka i demon.
        continue when (d + 21 + s + k) % 3 = 0;
        -- Tjänster ≤ 110 min som personen gör, i ordning, deterministiskt val.
        select count(*) into v_count
        from public.staff_services ss
        join public.services sv on sv.id = ss.service_id
        where ss.business_id = v_biz
          and ss.staff_id = ('de00000' || v_n || '-0000-0000-0001-00000000000' || s)::uuid
          and sv.duration_min <= 110;
        continue when v_count = 0;
        select sv.id, sv.duration_min, sv.price_clp into v_service
        from public.staff_services ss
        join public.services sv on sv.id = ss.service_id
        where ss.business_id = v_biz
          and ss.staff_id = ('de00000' || v_n || '-0000-0000-0001-00000000000' || s)::uuid
          and sv.duration_min <= 110
        order by sv.sort
        offset ((d + 21) * 7 + s * 3 + k) % v_count
        limit 1;

        v_start := (v_day + time '10:00' + make_interval(hours => 2 * k)) at time zone v_tz;
        v_end := v_start + make_interval(mins => v_service.duration_min);

        insert into public.bookings (
          business_id, staff_id, service_id, customer_id, period, blocked,
          status, source, price_clp, reminded_at
        ) values (
          v_biz,
          ('de00000' || v_n || '-0000-0000-0001-00000000000' || s)::uuid,
          v_service.id,
          v_customers[1 + ((d + 21) * 5 + s * 3 + k) % array_length(v_customers, 1)],
          tstzrange(v_start, v_end, '[)'),
          tstzrange(v_start, v_end, '[)'),
          case when v_start < now() then 'completed'::public.booking_status
               else 'confirmed'::public.booking_status end,
          case when (d + s + k) % 2 = 0 then 'web'::public.booking_source
               else 'manual'::public.booking_source end,
          v_service.price_clp,
          -- Inga påminnelser till de fiktiva numren.
          now()
        )
        on conflict do nothing;
      end loop;
    end loop;
  end loop;

  -- Horas flash: 16:30–18:00 lokal tid de närmaste vardagarna (inga seedade
  -- bokningar efter ~16:00), en profesional per dag, 20–30 % rabatt ----------
  for d in 0..7 loop
    exit when v_flash >= 4;
    v_day := v_today + d;
    continue when extract(isodow from v_day) > 5;
    v_start := (v_day + time '16:30') at time zone v_tz;
    continue when v_start < now() + interval '1 hour';
    v_flash := v_flash + 1;
    insert into public.flash_slots (
      business_id, staff_id, starts_at, ends_at, discount_pct, created_by
    ) values (
      v_biz,
      ('de00000' || v_n || '-0000-0000-0001-00000000000' || (1 + (v_flash - 1) % 4))::uuid,
      v_start,
      v_start + interval '90 minutes',
      (array[20, 25, 30, 20])[v_flash],
      v_owner
    )
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function private.seed_demo(text) from public;
grant execute on function private.seed_demo(text) to service_role;
