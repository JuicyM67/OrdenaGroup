-- WP-41 · Steg 1 (fortsättning) · Kolumngrant för profiltexter + lokal Storage-URL
-- F#: F1/F5 (bokningssidan/profilen). INV: INV-3 (RLS/kolumngrant, inga anon-policies).
-- Plan: docs/tasks/plans/WP-41-profil.md, steg 1.
--
-- Två fynd från serversteget (src/server/owner/profile.ts):
--
-- 1. B2/qa4-mönstret (se 20260927100100_businesses_memberships.sql) glömde
--    de tre nya profilkolumnerna från 20260929130000: `about`, `cover_url`
--    och `instagram` fanns inte än när kolumngrant-listan skrevs.
--    `updateBusinessProfile()`/`confirmImageUpload()` (ägare/admin, RLS via
--    `owners update`-policyn) fick "permission denied for column" trots att
--    RLS-policyn tillät raden — kolumngranten är en egen, snävare spärr
--    ovanpå RLS (samma resonemang som B2: plan/status/trial_ends_at/id/
--    timezone ska ANDÅ inte gå att ändra här).
--
-- 2. `businesses_cover_url_format`/`businesses_logo_url_format` (K5) tillät
--    bara `https://`. Lokal Supabase Storage svarar på
--    `http://127.0.0.1:54321/...` (ingen TLS-terminering lokalt), så dev och
--    e2e kunde aldrig spara ett omslag/logga som faktiskt pekar på den
--    lokala bucketen. Minsta säkra ändring: tillåt ÄVEN
--    `http://127.0.0.1(:port)/...` och `http://localhost(:port)/...`,
--    utöver `https://`. Produktion/molnet serverar alltid `https://` (Vercel
--    + Supabase), så det här öppnar ingenting där — bara för de två
--    loopback-värdnamnen, aldrig ett godtyckligt `http://`-ursprung.

-- 1. Kolumngrant: about, cover_url, instagram --------------------------------
grant update (about, cover_url, instagram) on public.businesses to authenticated;

-- 2. Relaxera https-checken för lokal Storage --------------------------------
alter table public.businesses
  drop constraint businesses_cover_url_format,
  add constraint businesses_cover_url_format check (
    cover_url is null
    or cover_url ~ '^https://'
    or cover_url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/'
  );

alter table public.businesses
  drop constraint businesses_logo_url_format,
  add constraint businesses_logo_url_format check (
    logo_url is null
    or logo_url ~ '^https://'
    or logo_url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/'
  );
