-- WP-68 · Säkerhetsgranskning av PR #110 (D-055).
--  B1: `offers.image_url` bara lokala filer eller projektets Supabase Storage
--      (bucket `offer-images`) — ingen godtycklig https-värd.
--  S2: ett publicerat erbjudande kan inte skrivas om av andra än ägaren.
--  K2: marknadsplatsens och kontots toppsegment reserveras i databasen.
--  K7: ett fel i marknadsplatsens demodata rullar inte tillbaka hela `seed_demo`.
set search_path = public, extensions;

-- B1 ------------------------------------------------------------------------
alter table public.offers drop constraint offers_image_url_check;
alter table public.offers add constraint offers_image_url_check check (
  image_url is null
  or image_url ~ '^/(marketing|demo/(cl|se))/[a-z0-9-]+\.(webp|jpg|png)$'
  or image_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/offer-images/[A-Za-z0-9/_.-]+$'
);

-- S2 ------------------------------------------------------------------------
create or replace function private.offers_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price integer;
  v_tz text;
  v_is_owner boolean;
begin
  select s.price_clp into v_price
    from public.services s
   where s.business_id = new.business_id and s.id = new.service_id;
  if v_price is null then
    raise exception 'offers: tjänsten finns inte' using errcode = '23503';
  end if;
  new.regular_price_minor := v_price;

  select b.timezone into v_tz from public.businesses b where b.id = new.business_id;
  new.currency := case v_tz when 'Europe/Stockholm' then 'SEK' else 'CLP' end;

  v_is_owner := (select auth.role()) is distinct from 'authenticated'
    or private.is_member(new.business_id, array['owner']::public.member_role[]);

  if tg_op = 'INSERT' then
    -- Klienten (authenticated) skapar alltid ett utkast med 0 sålda.
    if (select auth.role()) = 'authenticated' then
      new.status := 'draft';
      new.quantity_sold := 0;
      new.published_at := null;
    end if;
  elsif old.status = 'published' and not v_is_owner
        and (new.title, new.description, new.includes, new.terms, new.image_url,
             new.offer_price_minor, new.service_id, new.category, new.valid_months,
             new.quantity_total, new.sale_starts_at, new.sale_ends_at)
            is distinct from
            (old.title, old.description, old.includes, old.terms, old.image_url,
             old.offer_price_minor, old.service_id, old.category, old.valid_months,
             old.quantity_total, old.sale_starts_at, old.sale_ends_at) then
    -- Det ägaren publicerat får bara ägaren ändra (D-034: katalogbehörighet
    -- räcker för utkast, inte för det som visas publikt).
    raise exception 'offers: bara ägaren ändrar ett publicerat erbjudande'
      using errcode = '42501';
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not v_is_owner then
      raise exception 'offers: bara ägaren publicerar' using errcode = '42501';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

revoke all on function private.offers_guard() from public;

-- K2 ------------------------------------------------------------------------
alter table public.businesses drop constraint businesses_slug_not_reserved;
alter table public.businesses add constraint businesses_slug_not_reserved check (
  slug <> all (array[
    'app', 'api', 'r', 'admin', 'vendedor', 'login', 'design-lab', '_next', 'www',
    'auth', 'static', 'assets', 'support', 'help', 'docs', 'blog', 'legal',
    'terminos', 'privacidad',
    -- WP-68/WP-67: marknadsplatsen och kundkontot (båda språken).
    'upptack', 'erbjudande', 'descubre', 'oferta', 'cuenta', 'konto'
  ])
);

-- K7 ------------------------------------------------------------------------
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
end;
$$;

revoke all on function private.seed_demo(text) from public;
grant execute on function private.seed_demo(text) to service_role;
