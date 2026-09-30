# WP-54 · Medlemmar (ägaren 2026-09-30)

- Kundkortet: kryssruta "Medlem" (`customers.is_member boolean default false`, `member_since timestamptz`). Kräver can_manage_all_bookings eller ägare.
- Inställningar → Bokningsregler (eller egen sektion "Medlemmar"): av/på + förmån: rabatt i % (1–100) och valfri text ("10 % på alla behandlingar"). `businesses.member_discount_pct smallint null`, `member_benefit_text text null` (≤ 140).
- Bokning: servern känner igen medlem via telefon (E.164) + företag när kunden bokar på `/[slug]` och drar rabatten (`bookings.discount_clp` — befintlig kolumn) — aldrig klienten. Bekräftelseskärm och bekräftelsemejl/SMS visar "Medlemspris" och rabatten. Manuell bokning: samma regel.
- Kalender/Hoy/kundlista: etikett "Medlem"; filter "Medlemmar" i Clientes.
- Valfritt mejl till kunden när hen blir medlem (knapp "Meddela kunden", bara med e-post; marknadsföringssamtycke krävs inte — transaktionellt besked).
- Inga nya tester utöver pgTAP om ny policy; CI en gång; en säkerhetsgranskning.
