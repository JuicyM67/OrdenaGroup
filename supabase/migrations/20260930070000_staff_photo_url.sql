-- WP-44 · Personalens profilbild (gratis för alla planer)
-- F#: bygger ut F2 (personal), F5 (bokningssidan/profilen).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies).
-- Samma mönster som businesses.cover_url/logo_url (20260929130000/20260929140000):
-- kolumnen pekar på ett objekt i den befintliga Storage-bucketen
-- `business-media`, sökväg `<business_id>/<uuid>.(jpg|png|webp)`. Ingen ny
-- bucket eller nya storage.objects-policies behövs — bucketen, dess
-- mime/storlek-gräns och policyerna (owners select/insert/update/delete under
-- eget business_id-prefix) finns redan och gäller lika för foton som för
-- omslag/logga/galleri.

alter table public.staff
  add column photo_url text,
  -- Samma regel som businesses_cover_url_format/businesses_logo_url_format:
  -- https:// i produktion, plus loopback-värdnamnen för lokal Storage
  -- (ingen TLS-terminering lokalt).
  add constraint staff_photo_url_format check (
    photo_url is null
    or photo_url ~ '^https://'
    or photo_url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/'
  );

-- Ingen ny grant/RLS-policy krävs: `staff` har redan en enda "owners full
-- access"-policy (for all, private.is_member(business_id, owner/admin)) och
-- ett tabellnivå-grant (select, insert, update, delete till authenticated),
-- se 20260927100200_catalog_and_hours.sql. Ett tabellnivå-`update`-grant
-- täcker automatiskt nya kolumner (till skillnad från businesses, som har
-- kolumnbegränsade grants, B2) — photo_url kräver därför ingen egen
-- `grant update (photo_url) ...`-sats.
