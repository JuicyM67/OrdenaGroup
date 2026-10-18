-- WP-68 · Fler påhittade demosalonger i CL:s marknadsplats (Descubre, D-055).
--
-- Inför säljdemon av marknadsplatsen i Chile behöver /descubre se levande ut:
-- utöver Estudio Brisa (D-043) läggs fem PÅHITTADE salonger i Santiago
-- (Providencia, Ñuñoa, Las Condes, Santiago Centro) med personal, tjänster,
-- öppettider, publicerade erbjudanden, fem genomförda bokningar med
-- verifierade recensioner (D-045) och — för tre av dem — en hora flash i dag.
-- Samma mönster som de lokala SE-salongerna i supabase/seed.sql (`ad00000N`),
-- men som migration så att de finns i staging/prod och rullas dagligen.
--
-- `private.seed_demo` blir (som tidigare, se 20261014010200 K7) ett omslag:
-- bas, recensioner, marknadsplatsens demodata och nu även
-- `private.seed_marketplace_demo_cl_extra()` när market = 'CL'. Felen i
-- marknadsplatsdelen fångas och rullar aldrig tillbaka Brisas kalender.
--
-- Fasta id:n (alla börjar med `de00000`, så `src/server/marketplace/public.ts`
-- döljer dem i produktion om inte MARKETPLACE_INCLUDE_DEMO=1):
--   salong K (1–5)   de000001-0001-000K-0000-000000000001
--   personal         de000001-0001-000K-0001-00000000000x
--   kategori         de000001-0001-000K-0002-000000000001
--   tjänst           de000001-0001-000K-0003-00000000000x
--   kund             de000001-0001-000K-0004-00000000000x
--   bokning          de000001-0001-000K-0005-00000000000x
--   erbjudande       de000001-0001-000K-0009-00000000000x
-- Brisa använder `de000001-0000-0000-…`; basens raderingar är bundna till
-- Brisas business_id (och kundprefixet `de000001-0000-0000-0004-`), så de rör
-- aldrig raderna här, och den här funktionen rör aldrig Brisas.
--
-- Idempotent: upsert på fasta id:n; bokningarna (och därmed recensionerna, via
-- on delete cascade) raderas på sina fasta id:n och läggs om relativt now();
-- aktiva flash-tider för salongerna raderas och läggs om. En salong vars slug
-- redan används av ett annat företag hoppas över (som D-043).
-- Telefonnummer: fiktiva +5690000301x0 / +5690000311x (samma serie som Brisa).
-- Recensionsförfrågningar är avstängda (bokningarna är ≥ 6 dagar gamla och har
-- redan en recension; inga meddelanden till de fiktiva numren).
set search_path = public, extensions;

create function private.seed_marketplace_demo_cl_extra()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'America/Santiago';
  -- Ägaren från seed_demo_base (CL) — krävs av flash_slots.created_by.
  v_owner constant uuid := 'de000001-0000-0000-0009-000000000001';
  r record;
  v_biz uuid;
  v_pre text;
  v_today date;
  v_now_local timestamp;
  v_start timestamptz;
  v_close time;
  i int;
begin
  -- Samma ägarrad som basen skapar (idempotent; finns redan om Brisa seedats).
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'demo-cl@example.com', now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  )
  on conflict (id) do nothing;

  v_now_local := now() at time zone v_tz;
  v_today := v_now_local::date;

  for r in
    select * from (values
      (1, 'lunula-nail-studio', 'Lúnula Nail Studio', 'Ñuñoa', 'unas',
       'Los Jardines 3120, local 4, Ñuñoa', -33.45590, -70.59830, 'nunoa', 'Ñuñoa',
       'Estudio de uñas a pasos de Plaza Ñuñoa. Manicure y pedicure con esmaltado permanente, herramientas esterilizadas y colores de temporada. Reserva en un minuto y te recordamos tu hora por WhatsApp.',
       true, 0, 25),
      (2, 'raiz-masajes', 'Raíz Masajes', 'Providencia', 'masajes',
       'Pasaje Los Castaños 1845, Providencia', -33.42900, -70.61950, 'providencia', 'Providencia',
       'Masajes terapéuticos y de relajación cerca del metro Manuel Montt. Salas tranquilas, aceites naturales y masoterapeutas con experiencia. Elige tu hora y llega a desconectarte.',
       true, 30, 20),
      (3, 'piel-clara-estetica', 'Piel Clara Estética', 'Las Condes', 'estetica',
       'Las Magnolias 3560, oficina 402, Las Condes', -33.41480, -70.59850, 'las-condes', 'Las Condes',
       'Centro de estética facial en El Golf. Limpiezas profundas e hidrataciones con diagnóstico de piel incluido, para que sepas qué necesita tu piel y cómo cuidarla en casa.',
       false, 0, 0),
      (4, 'mirada-lash-brow', 'Mirada Lash & Brow', 'Ñuñoa', 'cejas_pestanas',
       'Los Tilos 2275, Ñuñoa', -33.45350, -70.60700, 'nunoa', 'Ñuñoa',
       'Pestañas y cejas en Ñuñoa: lifting, tinte y diseño con henna. Trabajamos con productos hipoalergénicos y te asesoramos para un resultado natural que vaya con tu cara.',
       false, 0, 0),
      (5, 'navaja-barberia', 'Navaja Barbería', 'Santiago', 'barberia',
       'Pasaje Las Rosas 312, Barrio Lastarria, Santiago', -33.43750, -70.64050, 'santiago-centro', 'Santiago Centro',
       'Barbería clásica en el Barrio Lastarria. Cortes degradados, barba con toalla caliente y navaja, y buena conversa. Reserva tu hora y no hagas fila.',
       true, 60, 30)
    ) as t(k, slug, name, comuna, category, address, lat, lng, area_slug, area_name,
           about, flash, flash_offset_min, flash_pct)
  loop
    v_pre := 'de000001-0001-000' || r.k || '-';
    v_biz := (v_pre || '0000-000000000001')::uuid;

    -- Ett riktigt företag har redan tagit sluggen: rör ingenting (D-043).
    if exists (select 1 from public.businesses where slug = r.slug and id <> v_biz) then
      raise notice 'seed_marketplace_demo_cl_extra: sluggen % används redan, hoppar över', r.slug;
      continue;
    end if;

    -- Ett fel i en salong (t.ex. en upptagen erbjudandeslug) stoppar inte de andra.
    begin
      -- Företaget ------------------------------------------------------------
      insert into public.businesses (
        id, slug, name, comuna, category, timezone, phone, address, about,
        plan, status, auto_confirm_bookings, review_requests_enabled,
        lat, lng, area_slug, area_name, geocode_status, geocoded_at,
        marketplace_flash_visible
      ) values (
        v_biz, r.slug, r.name, r.comuna, r.category, v_tz,
        '+569000030' || r.k || '0', r.address, r.about,
        'equipo', 'active', true, false,
        r.lat, r.lng, r.area_slug, r.area_name, 'manual', now(), true
      )
      on conflict (id) do update set
        slug = excluded.slug, name = excluded.name, comuna = excluded.comuna,
        category = excluded.category, timezone = excluded.timezone,
        phone = excluded.phone, address = excluded.address, about = excluded.about,
        plan = excluded.plan, status = excluded.status,
        deletion_requested_at = null,
        auto_confirm_bookings = excluded.auto_confirm_bookings,
        review_requests_enabled = excluded.review_requests_enabled,
        lat = excluded.lat, lng = excluded.lng,
        area_slug = excluded.area_slug, area_name = excluded.area_name,
        geocode_status = excluded.geocode_status,
        marketplace_flash_visible = excluded.marketplace_flash_visible;

      -- Personal --------------------------------------------------------------
      insert into public.staff (id, business_id, name, title, color, sort, active)
      select (v_pre || '0001-00000000000' || x.n)::uuid, v_biz, x.name, x.title,
             'staff-' || x.n, x.n, true
        from (values
          (1, 1, 'Fernanda', 'Manicurista'),
          (1, 2, 'Daniela', 'Nail artist'),
          (2, 1, 'Rodrigo', 'Masoterapeuta'),
          (2, 2, 'Paula', 'Masoterapeuta'),
          (3, 1, 'Antonia', 'Cosmetóloga'),
          (4, 1, 'Javiera', 'Lash artist'),
          (4, 2, 'Constanza', 'Diseñadora de cejas'),
          (5, 1, 'Matías', 'Barbero'),
          (5, 2, 'Felipe', 'Barbero')
        ) as x(k, n, name, title)
       where x.k = r.k
      on conflict (id) do update set
        name = excluded.name, title = excluded.title, color = excluded.color,
        sort = excluded.sort, active = true;

      -- Kategori ----------------------------------------------------------------
      insert into public.service_categories (id, business_id, name, sort)
      select (v_pre || '0002-000000000001')::uuid, v_biz, x.name, 1
        from (values
          (1, 'Uñas'), (2, 'Masajes'), (3, 'Faciales'),
          (4, 'Pestañas y cejas'), (5, 'Barbería')
        ) as x(k, name)
       where x.k = r.k
      on conflict (id) do update set name = excluded.name, sort = excluded.sort;

      -- Tjänster (heltal CLP). Priserna höjs aldrig här: prisspärren
      -- (service_price_offer_lock) skulle stoppa en höjning under ett erbjudande.
      insert into public.services (
        id, business_id, name, duration_min, price_clp, sort, category_id, description, active
      )
      select (v_pre || '0003-00000000000' || x.n)::uuid, v_biz, x.name, x.dur, x.price, x.n,
             (v_pre || '0002-000000000001')::uuid, x.descr, true
        from (values
          (1, 1, 'Manicure permanente', 45, 18000,
           'Limado, cutículas y esmaltado permanente en el color que elijas.'),
          (1, 2, 'Pedicure spa', 60, 22000,
           'Baño de pies, exfoliación, cutículas, masaje e hidratación con esmaltado.'),
          (2, 1, 'Masaje descontracturante', 60, 32000,
           'Masaje profundo de espalda, cuello y hombros para soltar tensiones.'),
          (2, 2, 'Masaje con piedras calientes', 75, 38000,
           'Masaje relajante de cuerpo completo con piedras volcánicas tibias.'),
          (3, 1, 'Limpieza facial profunda', 60, 35000,
           'Diagnóstico de piel, limpieza, extracción, mascarilla y protector solar.'),
          (3, 2, 'Hidratación facial intensiva', 50, 42000,
           'Ácido hialurónico y masaje facial para una piel suave y luminosa.'),
          (4, 1, 'Lifting de pestañas con tinte', 60, 25000,
           'Curvatura natural y tinte que duran entre 6 y 8 semanas.'),
          (4, 2, 'Diseño de cejas con henna', 45, 18000,
           'Visagismo, perfilado y henna para rellenar y definir tus cejas.'),
          (5, 1, 'Corte + barba', 50, 16000,
           'Corte a máquina y tijera más perfilado de barba con toalla caliente.'),
          (5, 2, 'Corte degradado', 40, 12000,
           'Degradado a tu medida, lavado y peinado final.')
        ) as x(k, n, name, dur, price, descr)
       where x.k = r.k
      on conflict (id) do update set
        name = excluded.name, duration_min = excluded.duration_min,
        price_clp = excluded.price_clp, sort = excluded.sort,
        category_id = excluded.category_id, description = excluded.description,
        active = true;

      -- Alla i salongen gör salongens tjänster -------------------------------
      delete from public.staff_services where business_id = v_biz;
      insert into public.staff_services (business_id, staff_id, service_id)
      select v_biz, st.id, sv.id
        from public.staff st
        join public.services sv on sv.business_id = st.business_id
       where st.business_id = v_biz;

      -- Öppettider: mån–lör 10–20, sön 11–18 (1 = måndag) ---------------------
      delete from public.business_hours where business_id = v_biz;
      insert into public.business_hours (business_id, weekday, start_time, end_time)
      select v_biz, wd,
             case when wd = 7 then time '11:00' else time '10:00' end,
             case when wd = 7 then time '18:00' else time '20:00' end
        from generate_series(1, 7) as wd;

      -- Erbjudanden (ordinarie pris = tjänstens pris, sätts av offers_guard) --
      insert into public.offers (
        id, business_id, service_id, slug, title, description, includes, terms,
        image_url, regular_price_minor, offer_price_minor, currency, category,
        valid_months, status, published_at
      )
      select (v_pre || '0009-00000000000' || x.n)::uuid, v_biz,
             (v_pre || '0003-00000000000' || x.n)::uuid, x.slug, x.title, x.descr,
             x.incl, x.terms, x.img,
             (select s.price_clp from public.services s
               where s.id = (v_pre || '0003-00000000000' || x.n)::uuid),
             x.price, 'CLP', x.cat, 12, 'published',
             now() - make_interval(days => r.k, hours => x.n * 3)
        from (values
          (1, 1, 'manicure-permanente-c11', 'Manicure permanente',
           'Manos impecables por semanas: limado, cutículas y esmaltado permanente en el tono que elijas.',
           array['Limado y forma', 'Cutículas', 'Esmaltado permanente', 'Aprox. 45 min'],
           'Válido para clientas nuevas y frecuentes. Cancela gratis hasta 24 h antes.',
           '/marketing/naglar.webp', 13900, 'naglar'),
          (1, 2, 'pedicure-spa-c12', 'Pedicure spa con exfoliación',
           'Un rato para ti: baño de pies tibio, exfoliación, masaje e hidratación, y terminamos con el esmaltado.',
           array['Baño de pies', 'Exfoliación e hidratación', 'Masaje de pies', 'Esmaltado · aprox. 60 min'],
           'Válido para clientas nuevas y frecuentes. Cancela gratis hasta 24 h antes.',
           '/marketing/naglar.webp', 16900, 'naglar'),
          (2, 1, 'masaje-descontracturante-c21', 'Masaje descontracturante 60 min',
           'Trabajamos espalda, cuello y hombros con presión firme para soltar las tensiones de la semana.',
           array['Conversación previa', 'Masaje de espalda, cuello y hombros', 'Aceites naturales', 'Aprox. 60 min'],
           'Cancela gratis hasta 24 h antes. Avísanos si tienes alguna lesión o estás embarazada.',
           '/marketing/massage.webp', 23900, 'massage'),
          (2, 2, 'masaje-piedras-calientes-c22', 'Masaje con piedras calientes',
           'Masaje de cuerpo completo con piedras volcánicas tibias que relajan los músculos en profundidad.',
           array['Masaje de cuerpo completo', 'Piedras volcánicas tibias', 'Té de cortesía', 'Aprox. 75 min'],
           'Cancela gratis hasta 24 h antes. Avísanos si tienes alguna lesión o estás embarazada.',
           '/marketing/massage.webp', 28900, 'massage'),
          (3, 1, 'limpieza-facial-profunda-c31', 'Limpieza facial profunda',
           'Partimos con un diagnóstico de tu piel y seguimos con limpieza, extracción y mascarilla según lo que necesite.',
           array['Diagnóstico de piel', 'Limpieza y extracción', 'Mascarilla', 'Protector solar · aprox. 60 min'],
           'Válido para clientes nuevos y frecuentes. Cancela gratis hasta 24 h antes.',
           '/marketing/hudvard.webp', 24900, 'hudvard'),
          (3, 2, 'hidratacion-facial-c32', 'Hidratación facial con ácido hialurónico',
           'Hidratación intensiva con ácido hialurónico y masaje facial. Ideal después del verano o antes de un evento.',
           array['Limpieza suave', 'Ácido hialurónico', 'Masaje facial', 'Aprox. 50 min'],
           'Válido para clientes nuevos y frecuentes. Cancela gratis hasta 24 h antes.',
           '/marketing/makeup.webp', 31900, 'hudvard'),
          (4, 1, 'lifting-pestanas-c41', 'Lifting de pestañas con tinte',
           'Pestañas curvas y oscuras sin rímel durante semanas, con un resultado natural.',
           array['Lifting', 'Tinte', 'Nutrición de pestañas', 'Aprox. 60 min'],
           'Requiere test de alergia 48 h antes de la primera aplicación. Cancela gratis hasta 24 h antes.',
           '/marketing/fransar.webp', 18900, 'fransar'),
          (4, 2, 'diseno-cejas-henna-c42', 'Diseño de cejas con henna',
           'Diseñamos tus cejas según la forma de tu cara y las rellenamos con henna para que se vean definidas.',
           array['Visagismo', 'Perfilado', 'Henna', 'Aprox. 45 min'],
           'Requiere test de alergia 48 h antes de la primera aplicación. Cancela gratis hasta 24 h antes.',
           '/marketing/fransar.webp', 13500, 'fransar'),
          (5, 1, 'corte-y-barba-toalla-caliente-c51', 'Corte + barba con toalla caliente',
           'Corte a tu gusto y barba perfilada a navaja con toalla caliente.',
           array['Corte a máquina y tijera', 'Perfilado de barba a navaja', 'Toalla caliente', 'Aprox. 50 min'],
           'Válido para clientes nuevos y frecuentes. Cancela gratis hasta 24 h antes.',
           '/marketing/barberare.webp', 11900, 'har'),
          (5, 2, 'corte-degradado-c52', 'Corte degradado',
           'Degradado a tu medida con terminación prolija, lavado y peinado.',
           array['Asesoría de corte', 'Degradado', 'Lavado y peinado', 'Aprox. 40 min'],
           'Válido para clientes nuevos y frecuentes. Cancela gratis hasta 24 h antes.',
           '/marketing/barberare.webp', 8900, 'har')
        ) as x(k, n, slug, title, descr, incl, terms, img, price, cat)
       where x.k = r.k
      on conflict (id) do update set
        slug = excluded.slug, title = excluded.title, description = excluded.description,
        includes = excluded.includes, terms = excluded.terms,
        image_url = excluded.image_url, offer_price_minor = excluded.offer_price_minor,
        category = excluded.category, status = 'published',
        sale_starts_at = null, sale_ends_at = null;

      -- Kunder (fiktiva +5690000311x … +5690000315x) -------------------------
      insert into public.customers (
        id, business_id, phone_e164, name, consent_terms_at, consent_version, consent_channel
      )
      select (v_pre || '0004-00000000000' || x.n)::uuid, v_biz,
             '+569000031' || r.k || x.n, x.name, now() - interval '90 days', 'v1', 'web'
        from (values
          (1, 1, 'Sofía Riquelme'), (1, 2, 'Emilia Navarro'), (1, 3, 'Trinidad Araya'),
          (1, 4, 'Valentina Guzmán'), (1, 5, 'Renata Espinoza'),
          (2, 1, 'Cristóbal Reyes'), (2, 2, 'Francisca Tapia'), (2, 3, 'Andrés Sepúlveda'),
          (2, 4, 'Macarena Lagos'), (2, 5, 'Diego Cárdenas'),
          (3, 1, 'Ignacia Bustos'), (3, 2, 'Carolina Vidal'), (3, 3, 'Fernanda Pizarro'),
          (3, 4, 'Paz Saavedra'), (3, 5, 'Rocío Medina'),
          (4, 1, 'Amanda Correa'), (4, 2, 'Javiera Molina'), (4, 3, 'Laura Figueroa'),
          (4, 4, 'Montserrat Ortiz'), (4, 5, 'Bárbara Jara'),
          (5, 1, 'Sebastián Alarcón'), (5, 2, 'Nicolás Valenzuela'), (5, 3, 'Gonzalo Fuentealba'),
          (5, 4, 'Joaquín Paredes'), (5, 5, 'Martín Leiva')
        ) as x(k, n, name)
       where x.k = r.k
      on conflict (id) do update set name = excluded.name, phone_e164 = excluded.phone_e164;

      -- Fem genomförda bokningar 6–18 dagar bakåt (läggs om varje körning) ----
      -- Radering på de fasta id:na tar recensionerna med sig (on delete cascade).
      delete from public.bookings
       where business_id = v_biz
         and id in (select (v_pre || '0005-00000000000' || n)::uuid from generate_series(1, 5) n);

      for i in 1..5 loop
        v_start := ((v_today - (3 + i * 3)) + time '11:00' + make_interval(hours => i - 1)) at time zone v_tz;
        insert into public.bookings (
          id, business_id, staff_id, service_id, customer_id, period, blocked,
          status, source, price_clp, reminded_at
        )
        select (v_pre || '0005-00000000000' || i)::uuid, v_biz,
               (v_pre || '0001-00000000000' || st.n)::uuid, sv.id,
               (v_pre || '0004-00000000000' || i)::uuid,
               tstzrange(v_start, v_start + make_interval(mins => sv.duration_min), '[)'),
               tstzrange(v_start, v_start + make_interval(mins => sv.duration_min), '[)'),
               'completed', 'web', sv.price_clp, v_start - interval '1 day'
          from public.services sv
          -- Personal 1/2 växelvis där det finns två, annars personal 1.
          cross join lateral (
            select case when exists (
                     select 1 from public.staff s2
                      where s2.id = (v_pre || '0001-000000000002')::uuid)
                   then 1 + (i + 1) % 2 else 1 end as n
          ) st
         where sv.id = (v_pre || '0003-00000000000' || (1 + (i + 1) % 2))::uuid
        on conflict do nothing;
      end loop;

      -- Verifierade recensioner (D-045) på de genomförda bokningarna ----------
      insert into public.reviews (
        business_id, booking_id, customer_id, rating, comment, display_name,
        reply, replied_at, created_at
      )
      select v_biz, bk.id, bk.customer_id, x.rating, x.comment,
             split_part(c.name, ' ', 1) || ' ' || left(split_part(c.name, ' ', 2), 1) || '.',
             case when x.n = 1 then replace(x.reply, '{n}', split_part(c.name, ' ', 1)) end,
             case when x.n = 1 then least(upper(bk.period) + interval '2 days', now()) end,
             least(upper(bk.period) + interval '1 day', now())
        from (values
          (1, 1, 5, 'Me encantó cómo quedaron, Fernanda es súper detallista. ¡Vuelvo seguro!',
           '¡Gracias, {n}! Te esperamos para tu próxima mani.'),
          (1, 2, 5, 'Llevo tres semanas con el esmaltado permanente y está impecable.', null),
          (1, 3, 4, null, null),
          (1, 4, 5, 'Puntuales y todo muy limpio. El pedicure spa es un regalo.', null),
          (1, 5, 5, 'Reservé el mismo día y me atendieron al tiro. Recomendadísimo.', null),
          (2, 1, 5, 'Salí nuevo. Rodrigo encontró cada nudo de la espalda.',
           'Gracias, {n}. ¡Nos vemos en la próxima sesión!'),
          (2, 2, 5, 'Ambiente tranquilo, buena música y la presión justa.', null),
          (2, 3, 5, 'El masaje con piedras calientes es otro nivel.', null),
          (2, 4, 4, null, null),
          (2, 5, 5, 'Fácil reservar y me llegó el recordatorio por WhatsApp. Vuelvo pronto.', null),
          (3, 1, 5, 'Antonia te explica todo lo que hace. Mi piel quedó luminosa.',
           'Gracias por tu confianza, {n}. ¡Te esperamos!'),
          (3, 2, 5, null, null),
          (3, 3, 4, 'Muy buena limpieza facial, sin dolor y con mucha paciencia.', null),
          (3, 4, 5, 'La hidratación me dejó la cara suave por días. Súper recomendable.', null),
          (3, 5, 5, 'Lugar precioso y muy profesional.', null),
          (4, 1, 5, 'El lifting quedó natural, justo lo que quería.',
           '¡Gracias, {n}! Nos vemos en el retoque.'),
          (4, 2, 5, 'Javiera es una seca para las pestañas. Cien por ciento recomendada.', null),
          (4, 3, 5, null, null),
          (4, 4, 4, 'Por fin unas cejas que me quedan bien. La henna duró harto.', null),
          (4, 5, 5, 'Atención cálida y puntual. Ya agendé mi próxima hora.', null),
          (5, 1, 5, 'Buen corte, buena conversa y la toalla caliente es un siete.',
           'Gracias, {n}. ¡Te esperamos en tres semanas!'),
          (5, 2, 5, 'El degradado quedó perfecto. Ya tengo barbería.', null),
          (5, 3, 4, 'Rápido y prolijo, a pasos del metro.', null),
          (5, 4, 5, null, null),
          (5, 5, 5, 'Me atendieron a la hora exacta. Así da gusto.', null)
        ) as x(k, n, rating, comment, reply)
        join public.bookings bk
          on bk.business_id = v_biz and bk.id = (v_pre || '0005-00000000000' || x.n)::uuid
        join public.customers c
          on c.business_id = bk.business_id and c.id = bk.customer_id
       where x.k = r.k
      on conflict do nothing;

      -- Hora flash i dag (Santiagotid), inom öppettiderna -------------------
      -- Tidigast 16:00 och minst ~1 h fram; ryms den inte före stängning blir
      -- det ingen i dag (marknadsplatsen visar bara dagens kommande tider).
      delete from public.flash_slots where business_id = v_biz and status = 'active';
      if r.flash then
        v_close := case when extract(isodow from v_today) = 7 then time '18:00' else time '20:00' end;
        v_start := (greatest(v_today + time '16:00',
                             date_trunc('hour', v_now_local + interval '90 minutes'))
                    + make_interval(mins => r.flash_offset_min)) at time zone v_tz;
        if (v_start + interval '60 minutes') at time zone v_tz <= v_today + v_close then
          insert into public.flash_slots (
            business_id, staff_id, service_ids, starts_at, ends_at, discount_pct, status, created_by
          ) values (
            v_biz, (v_pre || '0001-000000000001')::uuid,
            array[(v_pre || '0003-000000000001')::uuid],
            v_start, v_start + interval '60 minutes', r.flash_pct, 'active', v_owner
          )
          on conflict do nothing;
        end if;
      end if;
    exception when others then
      raise warning 'seed_marketplace_demo_cl_extra: salong % misslyckades: %', r.slug, sqlstate;
    end;
  end loop;
end;
$$;

revoke all on function private.seed_marketplace_demo_cl_extra() from public;
grant execute on function private.seed_marketplace_demo_cl_extra() to service_role;

-- Omslaget: samma steg som 20261014010200 (K7) plus de extra CL-salongerna.
create or replace function private.seed_demo(market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_demo_base(market);
  perform private.seed_demo_reviews(market);
  -- Marknadsplatsens demodata är en bonus: ett fel här (t.ex. en ändrad
  -- tjänst) får aldrig rulla tillbaka demoföretagets kalender.
  begin
    perform private.seed_marketplace_demo(market);
  exception when others then
    raise warning 'seed_marketplace_demo misslyckades: %', sqlstate;
  end;
  if market = 'CL' then
    begin
      perform private.seed_marketplace_demo_cl_extra();
    exception when others then
      raise warning 'seed_marketplace_demo_cl_extra misslyckades: %', sqlstate;
    end;
  end if;
end;
$$;

revoke all on function private.seed_demo(text) from public;
grant execute on function private.seed_demo(text) to service_role;
