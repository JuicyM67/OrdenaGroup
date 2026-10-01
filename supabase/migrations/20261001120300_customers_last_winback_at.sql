-- WP-31 · "Te echamos de menos" (db-engineer) · `customers.last_winback_at`
-- F#: F14. Plan: docs/tasks/plans/WP-31-utskick.md, "Te echamos de menos
-- (automatiskt)".
--
-- Stämpel satt av det dagliga winback-jobbet (service_role) när en kund tas
-- med i en automatisk winback-kampanj, så att samma kund inte får en ny
-- winback-kampanj de följande 90 dagarna (planens krav, ordagrant). Rent
-- bokföringsfält i samma anda som `bookings.reminded_at` — ingen egen
-- skrivspärr/trigger läggs till (till skillnad från `notes`/`is_member`):
-- uppdraget kräver inte att den begränsas till en viss behörighetsflagga,
-- och `customers` har redan en obegränsad
-- `grant select, insert, update, delete on public.customers to authenticated`
-- (20260927100300), inte kolumnbegränsad.
alter table public.customers
  add column last_winback_at timestamptz;
