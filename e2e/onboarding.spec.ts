// F1, WP-15: inloggning (magisk länk, lokal Supabase + Mailpit) → onboarding i 4 steg →
// bokningslänk. Egen, fräsch session (ignorerar storageState-projektet i playwright.config.ts,
// som redan är inloggad OCH onboardad) — den här specen gör hela flödet själv, från noll.
import { expect, test } from "@playwright/test";

import { waitForConfirmLink } from "./helpers/mailpit";

test.use({ storageState: { cookies: [], origins: [] } });

test("login → onboarding → länk till bokningssidan", async ({
  page,
}, testInfo) => {
  // Unik per projekt: desktop och mobil kör parallellt, och samma adress inom
  // en sekund stoppas av Supabase (`max_frequency`).
  const email = `wp15-flow-${testInfo.project.name}-${Date.now()}@example.test`;

  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await expect(page.getByText(`Te enviamos un link a ${email}.`)).toBeVisible();

  const link = await waitForConfirmLink(email);
  await page.goto(link);
  await page.waitForURL("**/app/onboarding");

  // Sesión visible (nav.cerrarSesion) — F1, WP-15.
  await expect(page.getByText(`Sesión iniciada como ${email}`)).toBeVisible();

  // Paso "negocio" (sin numerar, ver onboarding-wizard.tsx).
  const slug = `wp15-e2e-${Date.now()}`;
  await page.getByLabel("Nombre del negocio").fill("Barbería E2E");
  await page.getByLabel("Tu link de reservas").fill(slug);
  await page.getByLabel("Comuna").fill("Providencia");
  await page.getByRole("button", { name: "Barbería" }).click();
  await page.getByLabel("Teléfono del negocio").fill("+56912345678");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 1 de 4: Servicios.
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Nombre del servicio").fill("Corte de pelo");
  await page.getByLabel("Duración (min)").fill("30");
  await page.getByLabel("Precio").fill("12000");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 2 de 4: Equipo.
  await expect(page.getByRole("heading", { name: "Equipo" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar profesional" }).click();
  await page.getByLabel("Nombre").fill("Diego");
  await page.getByRole("button", { name: "Corte de pelo" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 3 de 4: Horario (se dejan los valores por defecto: lun–vie 09:00–19:00).
  await expect(page.getByRole("heading", { name: "Horario" })).toBeVisible();
  // WP-26: casilla obligatoria de términos + encargo, nunca premarcada.
  await page.getByRole("checkbox", { name: /Acepto los Términos/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 4 de 4: Tu link.
  await expect(
    page.getByRole("heading", { name: "Tu link está listo" }),
  ).toBeVisible();
  await expect(page.getByText(new RegExp(`/${slug}$`))).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver mi página" }),
  ).toHaveAttribute("href", `/${slug}`);

  // Sesión cerrada: vuelve a /login.
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/login");
});
