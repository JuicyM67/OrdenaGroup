-- WP-54 · Medlemmar (db-engineer) · `businesses.member_discount_pct` / `member_benefit_text`
-- F#: F9/F6 (ägarens plan, 2026-09-30). Plan: docs/tasks/plans/WP-54-medlemmar.md.
-- INV: INV-3, INV-4 (oförändrade).
--
-- Ajustes → Bokningsregler/Medlemmar: av/på + förmån. "Av" uttrycks av att
-- `member_discount_pct` är null (ingen egen boolean-kolumn krävs: 0 % är
-- inte ett giltigt rabattvärde ändå, så null = "ingen medlemsrabatt" räcker
-- och matchar `min_notice_minutes`-familjens mönster på den här tabellen).
alter table public.businesses
  add column member_discount_pct smallint null,
  add column member_benefit_text text null,
  add constraint businesses_member_discount_pct_check check (
    member_discount_pct is null or member_discount_pct between 1 and 100
  ),
  add constraint businesses_member_benefit_text_length_check check (
    member_benefit_text is null or char_length(member_benefit_text) <= 140
  );

-- Kolumngrant (B2/qa4-mönstret, samma som `about`/`cover_url`/`instagram` i
-- 20260929140000 och `auto_confirm_bookings` i 20260930140100): additiv
-- `grant update (...)`, RLS-policyn "owners update" (20260930170000) styr
-- redan VILKEN medlem som får uppdatera raden (ägare eller
-- `can_edit_settings`, via `private.has_perm`) — den här granten bara
-- öppnar de två nya kolumnerna för `authenticated` överhuvudtaget.
grant update (member_discount_pct, member_benefit_text) on public.businesses to authenticated;
