# WP-73 · Planspärrar + Skräddarsytt (D-048)
1. Matris i `src/config/plans.ts` (`can`, `limit`, `minPlanFor`); serverhjälpare i `src/server/plans/entitlements.ts` (plan, sms-räkning per kalendermånad i `APP_TZ`, användning).
2. Migration `20261011040000/040100`: enum-värdet `custom`, `businesses.custom_limits jsonb` (bara service role skriver), `private.business_staff_limit(uuid)` i inbjudnings-/accept-spärren. pgTAP `116_plan_custom`.
3. Spärrar på servern: skapa/aktivera tjänst (max 3 aktiva på Gratis; import/onboarding sparar resten inaktiva), Stripe (läge + onboarding; checkout pausas), blixttider, utskick/blixtutskick (+ sms-kvot), winback-cron (pausas), medlemsrabatt, väntelista (anmälan + erbjudanden pausas), personalkonton, rapporter, sms i workern (`sms_quota` → raden avbryts, e-postraden går ändå).
4. Nedgradering raderar inget: befintliga tjänster/blixttider/inställningar ligger kvar, funktionen pausas.
5. UI: "Skapad med …" på `/[slug]` för Gratis, `UpgradeNotice` (glas) på låsta sidor, låsikon i Inställningar-flikar, ny flik Plan (användning + innehåll), admin kan välja `custom` + avtalade gränser.
6. Marknad: plankort/tabell (SE+CL) efter matrisen, band Skräddarsytt/A medida → kontaktsidan, sms-FAQ (SE), ärliga avgiftstexter i SE via `TARIFA.resumen`.
Klart när: typecheck + lint + prettier + berörda tester gröna, matrisen enhetstestad.
