// F1, WP-15: inloggning (magisk länk, lokal Supabase + Mailpit) → onboarding i 5 steg
// (WP-51 lade till "Tu página" mellan Horario och Tu link) → bokningslänk. Egen, fräsch
// session (ignorerar storageState-projektet i playwright.config.ts, som redan är inloggad
// OCH onboardad) — den här specen gör hela flödet själv, från noll.
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
  await expect(
    page.getByText(`Te enviamos un código y un link a ${email}.`),
  ).toBeVisible();

  const link = await waitForConfirmLink(email);
  await page.goto(link);
  await page.waitForURL("**/app/onboarding");

  // Sesión visible (nav.cerrarSesion) — F1, WP-15.
  await expect(page.getByText(`Sesión iniciada como ${email}`)).toBeVisible();

  // WP-83: importar primero (solo si la importación está activa), después
  // Tu negocio → Rubro → Ubicación y contacto, un paso a la vez.
  const desdeCero = page.getByRole("button", { name: /No, parto desde cero/ });
  if (await desdeCero.isVisible().catch(() => false)) {
    await desdeCero.click();
  }
  const slug = `wp15-e2e-${Date.now()}`;
  await expect(
    page.getByRole("heading", { name: "¿Cómo se llama tu negocio?" }),
  ).toBeVisible();
  await page.getByLabel("Nombre del negocio").fill("Barbería E2E");
  await page.getByLabel("Tu link de reservas").fill(slug);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(
    page.getByRole("heading", { name: "¿A qué te dedicas?" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Barbería" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(
    page.getByRole("heading", { name: "¿Dónde te encuentran tus clientes?" }),
  ).toBeVisible();
  await page.getByLabel("Comuna", { exact: true }).fill("Providencia");
  await page
    .getByLabel("Dirección", { exact: true })
    .fill("Av. Providencia 1234");
  await page.getByLabel("Teléfono del negocio").fill("+56912345678");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 1 de 5: Servicios.
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Nombre del servicio").fill("Corte de pelo");
  await page.getByLabel("Duración (min)").fill("30");
  await page.getByLabel("Precio").fill("12000");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 2 de 5: Equipo.
  await expect(page.getByRole("heading", { name: "Equipo" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar profesional" }).click();
  await page.getByLabel("Nombre").fill("Diego");
  await page.getByRole("button", { name: "Corte de pelo" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 3 de 5: Horario (se dejan los valores por defecto: lun–vie 09:00–19:00).
  await expect(page.getByRole("heading", { name: "Horario" })).toBeVisible();
  // WP-26: casilla obligatoria de términos + encargo, nunca premarcada.
  await page.getByRole("checkbox", { name: /Acepto los Términos/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 4 de 5: Tu página (WP-51) — el negocio ya existe acá. Todo es
  // opcional: este flujo salta el paso (la subida de imágenes ya se
  // cubre en las pruebas de Ajustes → Perfil, mismos componentes).
  await expect(page.getByRole("heading", { name: "Tu página" })).toBeVisible();
  await page.getByRole("button", { name: "Saltar este paso" }).click();

  // WP-83 (D-068): Elige tu plan — sin pago en la app; sigue con Gratis.
  await expect(
    page.getByRole("heading", { name: "Elige tu plan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Seguir con Gratis" }).first().click();

  // Paso 5 de 5: Tu link.
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
