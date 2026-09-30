# WP-36 · Superadmin (grunddel) — F19

Ägaren 2026-09-30: en egen yta för plattformsägaren att hantera företag och konton (support). Stripe (WP-34) och ärenden (WP-52) kommer senare och kopplas hit.

## Omfång
- `/admin` (egen route-grupp, egen layout, `noindex`). Bara plattformsadmins; alla andra får 404 (inte 403 — röj inte att ytan finns).
- **Åtkomst:** tabell `private.platform_admins(user_id, created_at)` — ingen RLS-väg från klienten, läses bara på servern. Första admin läggs in manuellt av ägaren med SQL (dokumenteras). Kräver **TVÅSTEGSVERIFIERING** (Supabase MFA TOTP, `aal2`): ej inskriven → inskrivningssida med QR; inloggad med aal1 → verifieringssida.
- **Företag:** lista med sök (namn, slug, ägarens e-post), filter plan/status; detaljvy: plan + slutdatum för manuell plan, status (aktiv/fryst/radering begärd), antal bokningar/personal/konton, senaste aktivitet, medlemmar.
- **Åtgärder:** skapa företag åt någon (namn, e-post, plan, ev. gratis till datum → ägaren får inbjudan via mejl och går igenom onboarding), byt plan (+ `plan_override_until`), frys/avfrys, begär radering/ångra (återanvänd WP-26 `requestBusinessDeletion`/`cancel`), skicka ny inloggningslänk till en användare, byt e-post på ett konto.
- **Logg:** `private.admin_audit_log(id, admin_user_id, action, business_id, target_user_id, details jsonb, created_at)` — varje åtgärd skrivs i samma transaktion. Ingen persondata i `details` utöver id:n. Visas i detaljvyn.
- Alla admin-actions: servern kontrollerar `requirePlatformAdmin(userId, aal)` först, kör sedan med service role. Ägarens befintliga flöden oförändrade.

## Ägare
db-engineer: tabeller, `businesses.plan_override_until`, ev. `create_business_for(email…)` · ui-engineer: `/admin`-ytan, MFA-sidor, server actions i `src/server/admin/` · integrations-engineer: inbjudningsmejl till ny ägare (återanvänd inbjudningsmönstret från WP-46) · security-reviewer: EN granskning före merge.

## Test
Inga nya tester utöver en pgTAP att `platform_admins`/`admin_audit_log` inte går att läsa/skriva som `authenticated`/`anon` (ägarens arbetssätt 2026-09-30). CI en gång.

## Klart när
Ägaren kan logga in på `/admin` med tvåstegsverifiering, hitta ett företag, byta plan, frysa, begära radering, skicka ny inloggningslänk och lägga upp ett nytt företag åt någon — och varje åtgärd syns i loggen.
