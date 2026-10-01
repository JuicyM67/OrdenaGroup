-- WP-23 · Väntelista (F8) (db-engineer) · `businesses.waitlist_hold_minutes`
-- Plan: docs/tasks/plans/WP-23-30.md, "Väntelista" (Inställningar →
-- Bokningsregler: läge + hålltid). `waitlist_mode` finns redan sedan WP-01
-- (20260927100100_businesses_memberships.sql) — bara hålltiden saknas.
--
-- Kolumngrant (B2/qa4-mönstret, samma som winback_*/cancel_approval/
-- member_discount_pct): additiv `grant update`, RLS-policyn "owners update"
-- (20260930170000) styr redan VEM som får uppdatera raden (owner eller
-- can_edit_settings via private.has_perm) — den här granten öppnar bara den
-- nya kolumnen för authenticated överhuvudtaget.
alter table public.businesses
  add column waitlist_hold_minutes smallint not null default 30,
  add constraint businesses_waitlist_hold_minutes_check check (waitlist_hold_minutes between 5 and 240);

grant update (waitlist_hold_minutes) on public.businesses to authenticated;
