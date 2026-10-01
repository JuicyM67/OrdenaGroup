-- WP-31 · "Te echamos de menos" (db-engineer) · Inställningar på businesses
-- F#: F14. Plan: docs/tasks/plans/WP-31-utskick.md, "Te echamos de menos
-- (automatiskt)". INV: INV-3 (RLS/kolumngrant, inga anon-policies).
--
-- `winback_days` null = av (samma "null = ingen spärr/funktion"-mönster som
-- `member_discount_pct` i 20260930210200 och `min_notice_minutes`-familjen):
-- ingen egen boolean-kolumn behövs. Ett dagligt jobb (utanför den här
-- migrationen, integrations-engineer) skapar en kampanj per företag med
-- `winback_days` satt, för kunder vars senaste besök passerat gränsen och
-- som inte fått winback de senaste 90 dagarna (`customers.last_winback_at`,
-- se 20261001120300).
alter table public.businesses
  add column winback_days smallint,
  add column winback_message text,
  add column winback_offer_pct smallint,
  add column winback_offer_days smallint,
  add constraint businesses_winback_days_check check (winback_days is null or winback_days between 1 and 730),
  add constraint businesses_winback_message_length_check check (winback_message is null or char_length(winback_message) <= 320),
  add constraint businesses_winback_offer_pct_check check (winback_offer_pct is null or winback_offer_pct between 1 and 100),
  add constraint businesses_winback_offer_days_check check (winback_offer_days is null or winback_offer_days between 1 and 90);

-- Kolumngrant (B2/qa4-mönstret, samma som `cancel_approval` i 20261001090100
-- och `member_discount_pct`/`member_benefit_text` i 20260930210200):
-- additiv `grant update (...)`, RLS-policyn "owners update"
-- (20260930170000) styr redan VILKEN medlem som får uppdatera raden (ägare
-- eller `can_edit_settings`, via `private.has_perm`) — den här granten bara
-- öppnar de fyra nya kolumnerna för `authenticated` överhuvudtaget.
grant update (winback_days, winback_message, winback_offer_pct, winback_offer_days) on public.businesses to authenticated;
