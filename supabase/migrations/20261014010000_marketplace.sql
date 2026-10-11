-- WP-68 · Marknadsplats — upptäck (D-055). Geodata på `businesses`, tabellen
-- `offers` (erbjudanden = förbetalda värdebevis för EN tjänst; köpet byggs i
-- WP-69) och `private.distance_km` (haversine, ingen PostGIS i v1).
--
-- INV-3: RLS på `offers`, inga anon-policies/grants. De publika sidorna
-- (`/upptack`, `/erbjudande/[slug]`) läser via servern som service_role med
-- explicita filter (`src/server/marketplace/public.ts`), aldrig via anon.
-- INV-4 (D-014): `offers.business_id` + sammansatt FK mot `services`.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Geodata på företaget (D-055). Koordinaterna sätts bara av servern
-- (geokodningssvepet, service_role) — `authenticated` får inga skrivgrants på
-- dem. Ändrad adress ⇒ `pending` (svepet geokodar om).
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column lat numeric(8, 5),
  add column lng numeric(8, 5),
  add column area_slug text,
  add column area_name text,
  add column geocode_status text not null default 'pending',
  add column geocoded_at timestamptz,
  add column geocode_address_hash text,
  -- Ägarens beslut 2026-10-10: blixttider visas i Upptäck som standard,
  -- företaget kan stänga av.
  add column marketplace_flash_visible boolean not null default true;

alter table public.businesses
  add constraint businesses_geo_pair check ((lat is null) = (lng is null)),
  add constraint businesses_geo_lat check (lat is null or lat between -90 and 90),
  add constraint businesses_geo_lng check (lng is null or lng between -180 and 180),
  add constraint businesses_area_slug_format
    check (area_slug is null or area_slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'),
  add constraint businesses_area_name_length
    check (area_name is null or char_length(area_name) <= 80),
  add constraint businesses_geocode_status_check
    check (geocode_status in ('pending', 'ok', 'not_found', 'manual'));

create index businesses_area_slug_idx on public.businesses (area_slug);
create index businesses_lat_lng_idx on public.businesses (lat, lng);

grant update (marketplace_flash_visible) on public.businesses to authenticated;

create function private.businesses_geo_on_address_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Samma sats som sätter nya koordinater (servern) ska inte nollställas.
  if (new.address is distinct from old.address or new.comuna is distinct from old.comuna)
     and new.lat is not distinct from old.lat
     and new.lng is not distinct from old.lng then
    new.geocode_status := 'pending';
    new.geocode_address_hash := null;
  end if;
  return new;
end;
$$;

create trigger businesses_geo_on_address_change
  before update of address, comuna on public.businesses
  for each row execute function private.businesses_geo_on_address_change();

-- Avstånd i km (haversine, jordradie 6371 km). Immutable så att den kan
-- användas i sortering; null in ⇒ null ut.
create function private.distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 2 * 6371 * asin(sqrt(
      power(sin(radians((lat2 - lat1)::float8) / 2), 2)
      + cos(radians(lat1::float8)) * cos(radians(lat2::float8))
        * power(sin(radians((lng2 - lng1)::float8) / 2), 2)
    ))
  end
$$;

revoke all on function private.distance_km(numeric, numeric, numeric, numeric) from public;
grant execute on function private.distance_km(numeric, numeric, numeric, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
create function private.offer_includes_ok(items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(items), 0) <= 6
     and not exists (
       select 1 from unnest(coalesce(items, array[]::text[])) x
        where x is null or char_length(x) not between 1 and 80
     )
$$;

revoke all on function private.offer_includes_ok(text[]) from public;
grant execute on function private.offer_includes_ok(text[]) to authenticated, service_role;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]([a-z0-9-]{0,88}[a-z0-9])?$'),
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 1000),
  includes text[] not null default array[]::text[]
    check (private.offer_includes_ok(includes)),
  terms text check (terms is null or char_length(terms) <= 1000),
  -- Bara egna/kända bilder: statiska filer i public/ (demo, kategori) eller
  -- https (Storage-bucketen `offer-images`, uppladdning byggs med redigeraren).
  image_url text check (
    image_url is null
    or image_url ~ '^/(marketing|demo/(cl|se))/[a-z0-9-]+\.(webp|jpg|png)$'
    or image_url ~ '^https://'
  ),
  -- Ordinarie pris sätts av triggern = tjänstens pris (får inte anges fritt).
  regular_price_minor integer not null check (regular_price_minor > 0),
  offer_price_minor integer not null check (offer_price_minor > 0),
  currency text not null check (currency in ('CLP', 'SEK')),
  category text not null
    check (category in ('har', 'naglar', 'massage', 'hudvard', 'fransar', 'ovrigt')),
  valid_months smallint not null default 12 check (valid_months between 12 and 36),
  quantity_total integer check (quantity_total is null or quantity_total > 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'ended')),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, service_id)
    references public.services (business_id, id) on delete cascade,
  constraint offers_price_below_regular check (offer_price_minor < regular_price_minor),
  constraint offers_quantity_within_total
    check (quantity_total is null or quantity_sold <= quantity_total),
  constraint offers_sale_window
    check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at)
);

create index offers_business_id_status_idx on public.offers (business_id, status);
create index offers_status_category_idx on public.offers (status, category);

alter table public.offers enable row level security;

create policy "read offers" on public.offers
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "insert offers" on public.offers
  for insert
  to authenticated
  with check (private.has_perm(business_id, 'can_edit_catalog'));

create policy "update offers" on public.offers
  for update
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'))
  with check (private.has_perm(business_id, 'can_edit_catalog'));

-- Inga delete-grants (ett erbjudande avslutas med status `ended`), aldrig
-- `quantity_sold`/`regular_price_minor`/`currency` från klienten.
grant select on public.offers to authenticated;
grant insert (business_id, service_id, slug, title, description, includes, terms,
              image_url, offer_price_minor, category, valid_months, quantity_total,
              sale_starts_at, sale_ends_at)
  on public.offers to authenticated;
grant update (service_id, title, description, includes, terms, image_url,
              offer_price_minor, category, valid_months, quantity_total, status,
              sale_starts_at, sale_ends_at)
  on public.offers to authenticated;
grant select, insert, update, delete on public.offers to service_role;

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function private.set_updated_at();

-- Ordinarie pris = tjänstens pris, valuta = företagets marknad; publicering
-- bara av ägaren (D-034: `can_edit_catalog` får skapa/ändra, inte publicera).
create function private.offers_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price integer;
  v_tz text;
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

  if tg_op = 'INSERT' then
    -- Klienten (authenticated) skapar alltid ett utkast med 0 sålda.
    if (select auth.role()) = 'authenticated' then
      new.status := 'draft';
      new.quantity_sold := 0;
      new.published_at := null;
    end if;
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if (select auth.role()) = 'authenticated'
       and not private.is_member(new.business_id, array['owner']::public.member_role[]) then
      raise exception 'offers: bara ägaren publicerar' using errcode = '42501';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

revoke all on function private.offers_guard() from public;

create trigger offers_guard
  before insert or update on public.offers
  for each row execute function private.offers_guard();

comment on table public.offers is
  'WP-68 (D-055): erbjudanden i marknadsplatsen. Publik läsning bara via servern (service_role).';
