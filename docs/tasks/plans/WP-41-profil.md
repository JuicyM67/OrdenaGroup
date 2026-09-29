# WP-41 · Bokningssidan som företagsprofil

Godkänd design (ägaren 2026-09-29): `.visual-diff/ref/ProfilDesktop.dc.html` och `ProfilMobil.dc.html`
(källa: artifact "Navigering och företagsprofil"). Gäller `/[slug]` i båda marknader.

## Innehåll
- Omslagsbild, logga (bild eller initialer), namn, bransch, adress.
- Chips: "Öppet nu · till HH:MM" / "Stängt" och "Nästa lediga tid".
- Tjänster i kategoriflikar (WP-40), varje tjänst med **beskrivning**, tid, pris och "Boka".
- Personal (namn, roll), "Om oss"-text, galleri (max 12 bilder).
- Sidopanel (dator) / flik Info (mobil): snabbaste lediga tider, öppettider, karta-länk (ingen inbäddad karta i v1: länk till Google/Apple Maps), kontakt (telefon, Instagram).
- Mobil: flikar Tjänster/Personal/Om oss/Info + fast "Boka nu"-bar.
- Befintliga bokningsflödet (tid → uppgifter → bekräftelse) behålls; "Boka" på en tjänst startar det med tjänsten vald.
- Inga omdömen (finns inte ännu – inga påhittade betyg).

## Steg
1. **db-engineer**: `services.description text null` (≤ 500), `businesses.about text null` (≤ 1500), `businesses.cover_url`, `businesses.instagram text null`, `staff.title text null` (roll) om den saknas, tabell `business_images (id, business_id, path, sort, created_at)` med RLS + pgTAP; Supabase Storage-bucket `business-media` (publik läsning, skrivning bara ägare/admin i egen mapp `<business_id>/…`, storlek ≤ 2 MB, bara bildtyper) + policy-tester. `db:types`.
2. **scheduling-engineer / server**: utöka `page-data.ts` med beskrivning, about, cover, galleri, instagram, staff-roll, öppet-nu och nästa lediga tid (återanvänd tillgänglighetsmotorn, APP_TZ); ägarens actions för texter och bilduppladdning (signerad uppladdnings-URL eller server action med validering av typ/storlek), sortera/ta bort bilder.
3. **copywriter**: texter i es-CL + sv-SE (profilsektioner, chips, flikar, inställningar för profilen, tomlägen).
4. **ui-engineer**: ny `/[slug]`-layout enligt designen; Inställningar → "Profil" (omslag, logga, om oss, instagram, galleri) och beskrivningsfält i tjänsteredigeringen (även i onboardingens tjänstesteg, valfritt).

## Klart när
- En tjänst kan ha beskrivning som syns på profilen.
- Ägaren kan ladda upp omslag, logga och galleri; andra företag kan inte skriva i hens mapp (policytest).
- `/[slug]` ser ut som designen på dator och mobil, båda marknader; JS-budget (D-032, 180 kB) och tidsbudget håller.
- Bara nödvändiga tester (ägarens önskemål): RLS/policy, uppladdningsvalidering, page-data.

## Skjuts upp
Omdömen, inbäddad karta, flera språk per företag, videos.
