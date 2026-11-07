-- WP-82 (D-067): publika rutter /embed/... och /widget/... — ett företags slug
-- får inte kunna bli 'embed', 'widget' eller 'widgets'.
-- Samma lista som senaste definitionen (20261014010200_marketplace_hardening.sql)
-- plus de tre nya (samma ändring som BookingBuddy WP-87/D-071). Finns ett företag
-- med någon av dessa slugs misslyckas valideringen av befintliga rader och
-- migrationen avbryts hellre än att tyst lämna en kollision.
-- Funktionerna som fångar check_violation vid slugtilldelning (platform_admin,
-- business_billing_mode) kopierar inte listan; de behöver ingen ändring.
alter table public.businesses drop constraint businesses_slug_not_reserved;
alter table public.businesses add constraint businesses_slug_not_reserved check (
  slug <> all (array[
    'app', 'api', 'r', 'admin', 'vendedor', 'login', 'design-lab', '_next', 'www',
    'auth', 'static', 'assets', 'support', 'help', 'docs', 'blog', 'legal',
    'terminos', 'privacidad',
    'upptack', 'erbjudande', 'descubre', 'oferta', 'cuenta', 'konto',
    'embed', 'widget', 'widgets'
  ])
);
