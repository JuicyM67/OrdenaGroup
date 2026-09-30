-- WP-46 · Uppföljning 2 (db-engineer), ägarens nya önskemål:
--   4. businesses.tiktok/facebook (samma handtags-regel som instagram).
--   5. En staff-medlem kan uppdatera photo_url/title på SIN EGEN
--      personalrad utan can_manage_team (kolumnbegränsat), och kan ladda
--      upp sitt eget foto till business-media.

-- 4. businesses.tiktok / businesses.facebook ---------------------------
-- Samma regel som instagram (20260929130000_business_profile_media.sql,
-- "handtag utan @, 1–30 tecken a-z/0-9/./_") — ägaren valde uttryckligen
-- SAMMA regel som instagram i stället för att stödja fulla profil-URL:er:
-- enklare att validera och rendera (samma "@handtag"-mönster i UI:t,
-- ProfilDesktop.dc.html), och konsekvent med den redan byggda instagram-
-- kolumnen.
alter table public.businesses
  add column tiktok text,
  add column facebook text,
  add constraint businesses_tiktok_format check (tiktok is null or tiktok ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint businesses_facebook_format check (facebook is null or facebook ~ '^[A-Za-z0-9._]{1,30}$');

-- Kolumngrant: samma regel som instagram (owner eller can_edit_settings,
-- via "owners update"-RLS-policyn från 20260930170000 — grantet här är
-- bara den kolumnbegränsade delen, B2-mönstret).
grant update (tiktok, facebook) on public.businesses to authenticated;

-- 5a. staff: en medlem kan uppdatera photo_url/title på sin EGEN rad -------
-- Ny, separat policy (OR:as ihop med den befintliga "write staff", som
-- kräver can_manage_team och inte bryr sig om vems rad det är). Den här
-- täcker bara UPDATE (inte insert/delete) och bara den egna raden
-- (`id = private.member_staff_id(business_id)`, samma mönster som
-- bookings' can_manage_own_bookings-jämförelse). VILKA KOLUMNER som får
-- ändras via den här vägen (bara photo_url/title, inte name/color/active/
-- sort) kan RLS inte uttrycka (en `with check` ser bara NYA raden, inte
-- vilka fält som ändrats jämfört med den gamla) — det styrs av triggern
-- nedan, samma mönster som `private.customers_guard_consent`.
create policy "update own staff profile" on public.staff
  for update
  to authenticated
  using (id = private.member_staff_id(business_id))
  with check (id = private.member_staff_id(business_id));

create function private.staff_guard_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- can_manage_team (eller owner, via has_perm-kortslutningen): full
  -- åtkomst som idag, ingen kolumnspärr.
  if private.has_perm(new.business_id, 'can_manage_team') then
    return new;
  end if;

  -- Ingen can_manage_team: raden kan bara vara den egna (RLS `using`/`with
  -- check` ovan garanterar redan det för en `authenticated`-träff), och
  -- bara photo_url/title får ändras.
  if new.business_id is distinct from old.business_id
     or new.name is distinct from old.name
     or new.color is distinct from old.color
     or new.active is distinct from old.active
     or new.sort is distinct from old.sort
  then
    raise exception 'Solo puedes cambiar tu foto y tu cargo' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger staff_guard_self_update
  before update on public.staff
  for each row execute function private.staff_guard_self_update();

-- 5b. Storage business-media: INSERT (uppladdning) för alla medlemmar -----
-- Bredare än SELECT/UPDATE/DELETE (20260930170000, can_edit_settings):
-- VARJE medlem (owner ELLER staff, `is_member`) ska kunna ladda upp en
-- fil i sitt EGET företags prefix — annars kan en profesional utan
-- can_edit_settings inte ladda upp sitt eget foto (staff.photo_url pekar
-- på ett objekt här, se 20260930070000_staff_photo_url.sql). Servern
-- validerar fortfarande sökväg/filtyp/storlek innan uppladdning (bucket-
-- gränserna, 20260929130000, gäller oavsett).
drop policy "business-media owners insert" on storage.objects;
create policy "business-media insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner', 'staff']::public.member_role[])
  );
