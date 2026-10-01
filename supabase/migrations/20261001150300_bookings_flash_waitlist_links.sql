-- WP-23/WP-30 (db-engineer) · `bookings.flash_slot_id` / `bookings.waitlist_entry_id`
-- Plan: docs/tasks/plans/WP-23-30.md. INV: INV-1 (no_overlap opåverkad,
-- ingen ny statuslogik), INV-3, INV-4 (sammansatta FK, D-014 — gäller båda
-- kolumnerna, inte bara `flash_slot_id` som planen nämner uttryckligen:
-- varje FK mot en annan tenant-tabell ska vara sammansatt, ingen avvikelse
-- utan ett nytt beslut).
--
-- Servern (scheduling-engineer) sätter kolumnen när en bokning skapas via
-- `/{slug}?flash=<id>` respektive `/v/[token]` (väntelistans erbjudandelänk),
-- och sätter samtidigt `flash_slots.status = 'booked'`/
-- `waitlist_entries.status = 'booked'` i samma transaktion.
--
-- Kräver flash_slots (20261001150100) och waitlist_entries (20261001150000).
alter table public.bookings
  add column flash_slot_id uuid,
  add column waitlist_entry_id uuid,
  add constraint bookings_flash_slot_id_fkey
    foreign key (business_id, flash_slot_id)
    references public.flash_slots (business_id, id)
    -- Kolumn-listform (inte ett bart `on delete set null`): annars nollas
    -- hela FK-kolumnuppsättningen, inklusive business_id (samma gotcha som
    -- services.category_id/booking_answers.question_id/campaign_recipient_id).
    on delete set null (flash_slot_id),
  add constraint bookings_waitlist_entry_id_fkey
    foreign key (business_id, waitlist_entry_id)
    references public.waitlist_entries (business_id, id)
    on delete set null (waitlist_entry_id);

create index bookings_flash_slot_id_idx on public.bookings (flash_slot_id) where flash_slot_id is not null;
create index bookings_waitlist_entry_id_idx on public.bookings (waitlist_entry_id) where waitlist_entry_id is not null;

-- Ingen ny kolumngrant krävs: `bookings` har redan en obegränsad
-- `grant select, insert, update, delete on public.bookings to authenticated`
-- (20260927100400), inte kolumnbegränsad som `businesses`/`customers` —
-- samma resonemang som `campaign_recipient_id` i 20261001120200.
