-- WP-83 (D-068): registreringen för nya företag ligger på /comenzar — ett
-- företags slug får inte kunna bli 'comenzar'.
-- Samma lista som senaste definitionen (20261014010200_marketplace_hardening.sql)
-- plus den nya. Tidsstämpeln är densamma som BookingBuddys motsvarande
-- migration (WP-89, SE D-072); innehållet är Chiles eget.
-- Ett befintligt företag med sluggen 'comenzar' skulle få valideringen nedan
-- att misslyckas; kontrollera i drift innan push:
--   select id from public.businesses where slug = 'comenzar';
alter table public.businesses drop constraint businesses_slug_not_reserved;
alter table public.businesses add constraint businesses_slug_not_reserved check (
  slug <> all (array[
    'app', 'api', 'r', 'admin', 'vendedor', 'login', 'design-lab', '_next', 'www',
    'auth', 'static', 'assets', 'support', 'help', 'docs', 'blog', 'legal',
    'terminos', 'privacidad',
    'upptack', 'erbjudande', 'descubre', 'oferta', 'cuenta', 'konto',
    -- WP-83: registreringen.
    'comenzar'
  ])
);
