-- WP-70 · Säkerhetsgranskning av PR #111 (D-056).
--  B1: tjänsten kan inte bytas på ett erbjudande som någon gång publicerats
--      (annars kringgås prisvakten: flytta ett publicerat erbjudande till en
--      tjänst vars pris nyss höjts). Spärren på tjänstens pris räknar även
--      erbjudanden med `published_at` men utan `last_unpublished_at` (t.ex.
--      skapade direkt som pausade/avslutade av servern).
--  S1: `offer-images` — ingen UPDATE (uppladdning utan upsert), DELETE bara
--      för ägaren. En bild kan bara användas av ett erbjudande (K4).
--  S2/S3: `offers.image_url` lagrar bara den RELATIVA sökvägen
--      `offer-images/<business_id>/<uuid>.<ext>` (eller en statisk fil i
--      `public/`). Appen bygger full URL från `NEXT_PUBLIC_SUPABASE_URL`, så
--      ingen värd lagras i databasen och det fungerar likadant lokalt och i molnet.
--  K1: uppladdning kräver planfunktionen `offers`.
set search_path = public, extensions;

-- S2/S3 ------------------------------------------------------------------------
-- Befintliga fulla URL:er (molnet) → relativ sökväg.
update public.offers
   set image_url = regexp_replace(
     image_url, '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/(offer-images/.+)$', '\1')
 where image_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/offer-images/';
-- Allt som inte passar den nya regeln (t.ex. en annan företagsmapp) tas bort.
update public.offers
   set image_url = null
 where image_url is not null
   and not (
     image_url ~ '^/(marketing|demo/(cl|se))/[a-z0-9-]+\.(webp|jpg|png)$'
     or (image_url ~ '^offer-images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
         and image_url like 'offer-images/' || business_id::text || '/%')
   );

alter table public.offers drop constraint offers_image_url_check;
alter table public.offers add constraint offers_image_url_check check (
  image_url is null
  or image_url ~ '^/(marketing|demo/(cl|se))/[a-z0-9-]+\.(webp|jpg|png)$'
  or (
    image_url ~ '^offer-images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    -- Bara företagets egen mapp.
    and image_url like 'offer-images/' || business_id::text || '/%'
  )
);

-- K4: en uppladdad bild hör till ett erbjudande (demobilderna i public/ får delas).
create unique index offers_image_url_unique
  on public.offers (image_url)
  where image_url like 'offer-images/%';

-- B1 --------------------------------------------------------------------------
create or replace function private.offers_guard_plan_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lowest integer;
begin
  if (select auth.role()) = 'authenticated'
     and (tg_op = 'INSERT' or (new.status = 'published' and old.status is distinct from 'published'))
     and not private.business_has_feature(new.business_id, 'offers') then
    raise exception 'offers: planen saknar erbjudanden' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE'
     and new.service_id is distinct from old.service_id
     and old.published_at is not null then
    raise exception 'offers: tjänsten kan inte bytas på ett publicerat erbjudande'
      using errcode = '23514', constraint = 'offer_service_locked';
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    v_lowest := private.service_lowest_price_30d(new.business_id, new.service_id);
    if v_lowest is not null and new.regular_price_minor > v_lowest then
      raise exception 'offers: tjänstens pris har höjts senaste 30 dagarna'
        using errcode = '23514', constraint = 'offer_regular_price_raised';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.offers_guard_plan_price() from public;

create or replace function private.services_price_offer_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price_clp > old.price_clp and exists (
    select 1 from public.offers o
     where o.business_id = new.business_id and o.service_id = new.id
       and (o.status = 'published'
            or o.last_unpublished_at > now() - interval '30 days'
            -- Publicerat men aldrig "avpublicerat" via en statusändring.
            or (o.published_at is not null and o.last_unpublished_at is null))
  ) then
    raise exception 'services: priset kan inte höjas under eller 30 dagar efter ett erbjudande'
      using errcode = '23514', constraint = 'service_price_offer_lock';
  end if;
  return new;
end;
$$;

revoke all on function private.services_price_offer_lock() from public;

-- S1 + K1: storage-policies ------------------------------------------------------
drop policy "offer-images update" on storage.objects;

drop policy "offer-images insert" on storage.objects;
create policy "offer-images insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_catalog')
    and private.business_has_feature(((storage.foldername(name))[1])::uuid, 'offers')
  );

drop policy "offer-images delete" on storage.objects;
create policy "offer-images delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner']::public.member_role[])
  );
