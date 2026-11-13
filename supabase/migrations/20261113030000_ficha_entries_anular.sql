-- WP-91 (D-077): en anteckning i fichan annulleras i stället för att tas bort.
--
-- En ficha clínica ska vara fullständig och oföränderlig: ett fel rättas med
-- ett tillägg, inte genom att texten försvinner (Ley 20.584 och dess
-- reglemente). Ansvaret är företagets (Términos, "Fichas y datos de salud"),
-- men verktyget ska inte göra det lätt att göra fel.
--
-- Den här migrationen är steg 1 (körs före koden):
--   * tre nya kolumner: voided_at, voided_by, void_reason;
--   * författaren eller ägaren får sätta dem en gång (policy + kolumngrant);
--   * en annullerad anteckning kan inte "av-annulleras".
-- Steg 2 (20261113040000, i kod-PR:en) tar bort möjligheten att radera.
-- Texten (`body`) går aldrig att ändra: ingen update-grant på den kolumnen.

alter table public.customer_record_entries
  add column voided_at timestamptz,
  add column voided_by uuid references auth.users (id) on delete set null,
  add column void_reason text;

alter table public.customer_record_entries
  add constraint customer_record_entries_void_reason_len
    check (void_reason is null or char_length(void_reason) between 1 and 500),
  add constraint customer_record_entries_void_complete
    check ((voided_at is null) = (void_reason is null));

comment on column public.customer_record_entries.voided_at is
  'WP-91 (D-077): satt = anteckningen är annullerad (texten finns kvar). '
  'Sätts en gång av författaren eller ägaren; kan inte ångras.';

create policy "void customer_record_entries" on public.customer_record_entries
  for update to authenticated
  using (
    voided_at is null
    and private.has_perm(business_id, 'can_view_records')
    and (
      author_user_id = (select auth.uid())
      or private.is_member(business_id, array['owner']::public.member_role[])
    )
  )
  with check (
    voided_at is not null
    and voided_by = (select auth.uid())
    and private.has_perm(business_id, 'can_view_records')
  );

grant update (voided_at, voided_by, void_reason)
  on public.customer_record_entries to authenticated;
