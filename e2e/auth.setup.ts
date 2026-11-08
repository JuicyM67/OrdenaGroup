// Playwright "setup"-projekt (WP-15): loggar in en ägare via det riktiga magisk länk-flödet
// mot lokal Supabase + Mailpit och sparar sessionen, så att `desktop`/`mobile` kan återanvända
// den (storageState) i stället för att göra hela inloggningsflödet i varje spec-fil. Körs
// bara lokalt/i CI mot `npm run db:start`, aldrig mot moln (hård regel 8).
import { test as setup } from "@playwright/test";

import { SIN_NEGOCIO_URL } from "./helpers/invitation";
import { waitForConfirmLink } from "./helpers/mailpit";

const STORAGE_STATE = "playwright/.auth/owner.json";
const EMAIL = `wp15-owner-${Date.now()}@example.test`;

setup("logga in en ägare och spara sessionen", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await page.getByText(`Te enviamos un código y un link a ${EMAIL}.`).waitFor();

  const link = await waitForConfirmLink(EMAIL);
  await page.goto(link);

  // /auth/confirm redirectar till /app, som i sin tur skickar ett konto utan företag till
  // /app/onboarding — under den stängda betan (src/config/beta.ts) till /app/beta
  // (src/app/(app)/app/page.tsx).
  await page.waitForURL(SIN_NEGOCIO_URL);

  await page.context().storageState({ path: STORAGE_STATE });
});
