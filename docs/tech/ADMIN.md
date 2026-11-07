# `/admin` — plattformsadmin (F19/WP-36, D-038)

Intern yta för plattformsägaren: hantera företag (plan, frys, radering),
skicka en ny inloggningslänk eller byta e-post på ett konto, och bjuda in
någon att skapa ett nytt företag. Bara ägaren och den hen lägger till
använder ytan — ingen självbetjäning, `noindex`, 404 för alla andra.

## Bli första admin

1. Logga in i appen som vanligt (`/login`), minst en gång — kontot måste
   finnas i `auth.users` innan det kan läggas till som admin.
2. Hämta ditt `user_id`: Supabase Studio → Authentication → Users, eller i
   SQL Editor:

   ```sql
   select id from auth.users where email = 'din@epost.cl';
   ```

3. Lägg in dig själv i `private.platform_admins` (SQL Editor, kör som
   `postgres`/superuser — det finns medvetet ingen insert-policy eller RPC
   för det här steget, se migrationskommentaren i
   `supabase/migrations/20260930180000_platform_admin.sql`):

   ```sql
   insert into private.platform_admins (user_id) values ('<user_id>');
   ```

4. Gå till `/admin`. Du skickas till `/admin/mfa` (ingen `aal2` än) —
   skanna QR-koden med en autentiseringsapp och skriv in koden.
5. Klart. En redan inloggad admin kan lägga till fler admins samma väg
   (steg 2–3) — det finns ingen UI för det, bara SQL.

## Hur åtkomsten funkar

- `private.platform_admins` är FÖRETAGSOBEROENDE — inte samma sak som
  `memberships.role = 'admin'` (en företagsnivå-roll). RLS är påslaget utan
  någon policy: ingen klientsession når tabellen, bara servern
  (`service_role`, `src/server/admin/auth.ts`).
- Varje skyddad sida (utom `/admin/mfa`) kräver `aal2` (Supabase MFA TOTP):
  `requireAdminPage()` redirectar till `/admin/mfa` om den saknas, `404`
  om personen inte finns i `platform_admins` alls.
- Varje mutation skriver en rad i `private.admin_audit_log` i samma
  transaktion som åtgärden. `details` innehåller bara id:n/koder, aldrig
  namn/telefon/e-post.

## Flödet "Nytt företag"

`/admin/nuevo` skapar en rad i `private.business_invitations` (token
hashas som i `src/server/bookings/token.ts`) och mejlar
`${APP_URL}/app/bienvenida/${token}` direkt via Resend (inte utkorgen).
Mottagaren öppnar länken (`src/app/app/bienvenida/[token]/`, publik —
undantagen i `src/proxy.ts`), ber om en inloggningslänk om hen inte redan
är inloggad, och `public.accept_business_invitation(token)` skapar
företaget (med `comuna`/`category` tomma) och gör mottagaren till `owner`.
`/app/onboarding` känner igen det ofärdiga företaget
(`isOnboardingDraft`, `src/server/onboarding/owner-business.ts`) och
UPPDATERAR det i stället för att skapa ett nytt
(`src/server/onboarding/complete-onboarding.ts`).

## Hjälpa ett företag (WP-84, D-069)

På `/admin/negocios/[id]`:

- **Rubro y ubicación** — rubro, comuna och dirección (inte för utkast från
  en inbjudan). Loggas som `business_place` (bara vilka fält som ändrats).
- **Importar desde otro sistema** — samma AI-import som ägarens Ajustes →
  Negocio, via `POST /api/admin/import/extract` och `adminImportAction`.
  Öppettider importeras bara om företaget saknar öppettider. Loggas som
  `import` (bara antal).
- **Borrar ahora** — raderar direkt (testkonton, dubbletter). Skriv
  företagets slug för att bekräfta. Loggas som `delete_now` (bara slug).
