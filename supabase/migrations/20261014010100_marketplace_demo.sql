-- WP-68 · Demoföretagen (D-043) får koordinater och erbjudanden i marknadsplatsen.
--
-- Samma omslagsmönster som 20261011060000_demo_reviews.sql: `private.seed_demo`
-- blir ett omslag som kör basen, recensionerna och därefter
-- `private.seed_marketplace_demo`. Idempotent (upsert på fasta id:n). Rör bara
-- demoföretaget (`de00000N-…`) och hoppar över om det inte finns.
-- Koordinaterna sätts manuellt (`geocode_status = 'manual'`): demoadresserna
-- är påhittade och ska aldrig skickas till geokodaren.
set search_path = public, extensions;

create function private.seed_marketplace_demo(market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n text;
  v_biz uuid;
begin
  if market = 'CL' then
    v_n := '1';
  elsif market = 'SE' then
    v_n := '2';
  else
    raise exception 'seed_marketplace_demo: okänd marknad %', market using errcode = '22023';
  end if;

  v_biz := ('de00000' || v_n || '-0000-0000-0000-000000000001')::uuid;
  if not exists (select 1 from public.businesses where id = v_biz) then
    return;
  end if;

  if market = 'SE' then
    update public.businesses
       set lat = 59.31780, lng = 18.07390, area_slug = 'sodermalm',
           area_name = 'Södermalm', geocode_status = 'manual', geocoded_at = now()
     where id = v_biz;

    insert into public.offers (
      id, business_id, service_id, slug, title, description, includes, terms,
      image_url, regular_price_minor, offer_price_minor, currency, category,
      valid_months, status, published_at
    ) values
      ('de000002-0000-0000-0009-000000000001', v_biz,
       'de000002-0000-0000-0003-000000000001', 'damklippning-med-inpackning-n1',
       'Damklippning med inpackning och styling',
       'En lugn timme i stolen: vi pratar igenom vad du vill ha, klipper och avslutar med en återfuktande inpackning och styling.',
       array['Konsultation och tvätt', 'Klippning valfri längd', 'Återfuktande inpackning', 'Föning och styling · ca 60 min'],
       'Gäller nya och befintliga kunder. Fri avbokning upp till 24 h före.',
       '/marketing/frisor.webp', 69500, 48900, 'SEK', 'har', 12, 'published', now()),
      ('de000002-0000-0000-0009-000000000002', v_biz,
       'de000002-0000-0000-0003-000000000005', 'slingor-i-folie-med-toning-n2',
       'Slingor i folie med toning',
       'Ljusa, naturliga slingor i folie med toning som ger glans. Vi går igenom färgen tillsammans innan vi börjar.',
       array['Färgkonsultation', 'Slingor i folie', 'Toning och glans', 'Föning · ca 2 h'],
       'Gäller nya och befintliga kunder. Fri avbokning upp till 24 h före.',
       '/demo/se/gallery-1.webp', 149500, 109000, 'SEK', 'har', 12, 'published', now()),
      ('de000002-0000-0000-0009-000000000003', v_biz,
       'de000002-0000-0000-0003-000000000008', 'fransfargning-n3',
       'Fransfärgning',
       'Mörkare fransar utan mascara i flera veckor.',
       array['Färgning av fransar', 'Ca 20 min'],
       'Allergitest krävs 48 h före första färgningen.',
       '/marketing/fransar.webp', 25000, 19500, 'SEK', 'fransar', 12, 'published', now())
    on conflict (id) do update
      set title = excluded.title, description = excluded.description,
          includes = excluded.includes, terms = excluded.terms,
          image_url = excluded.image_url, offer_price_minor = excluded.offer_price_minor,
          category = excluded.category, status = 'published',
          sale_starts_at = null, sale_ends_at = null;
  else
    update public.businesses
       set lat = -33.42580, lng = -70.61090, area_slug = 'providencia',
           area_name = 'Providencia', geocode_status = 'manual', geocoded_at = now()
     where id = v_biz;

    insert into public.offers (
      id, business_id, service_id, slug, title, description, includes, terms,
      image_url, regular_price_minor, offer_price_minor, currency, category,
      valid_months, status, published_at
    ) values
      ('de000001-0000-0000-0009-000000000001', v_biz,
       'de000001-0000-0000-0003-000000000002', 'corte-y-barba-b1',
       'Corte + barba',
       'Corte a tu gusto y perfilado de barba con toalla caliente.',
       array['Lavado', 'Corte a tijera o máquina', 'Perfilado de barba', 'Aprox. 50 min'],
       'Válido para clientes nuevos y frecuentes. Cancela gratis hasta 24 h antes.',
       '/marketing/barberare.webp', 18000, 13900, 'CLP', 'har', 12, 'published', now()),
      ('de000001-0000-0000-0009-000000000002', v_biz,
       'de000001-0000-0000-0003-000000000007', 'balayage-b2',
       'Balayage',
       'Balayage a mano alzada con matiz y brushing.',
       array['Diagnóstico de color', 'Balayage', 'Matiz', 'Brushing · aprox. 2 h 30 min'],
       'Válido para clientes nuevos y frecuentes. Cancela gratis hasta 24 h antes.',
       '/marketing/frisor.webp', 85000, 64900, 'CLP', 'har', 12, 'published', now())
    on conflict (id) do update
      set title = excluded.title, description = excluded.description,
          includes = excluded.includes, terms = excluded.terms,
          image_url = excluded.image_url, offer_price_minor = excluded.offer_price_minor,
          category = excluded.category, status = 'published',
          sale_starts_at = null, sale_ends_at = null;
  end if;
end;
$$;

revoke all on function private.seed_marketplace_demo(text) from public;
grant execute on function private.seed_marketplace_demo(text) to service_role;

create or replace function private.seed_demo(market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_demo_base(market);
  perform private.seed_demo_reviews(market);
  perform private.seed_marketplace_demo(market);
end;
$$;

revoke all on function private.seed_demo(text) from public;
grant execute on function private.seed_demo(text) to service_role;
