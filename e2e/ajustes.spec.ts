// WP-15b: la ägaren seedeada (supabase/seed.sql, dueno@example.com → "Barbería Norte",
// slug barberia-norte) cambia el precio de un servicio en /app/ajustes y lo ve reflejado en
// /barberia-norte. Un solo test (no la storageState compartida, que no tiene negocio) — mismo
// motivo que e2e/owner-live.spec.ts: max_frequency 1s del magic link y "spara tokens".
//
// WP-55: Ajustes es ahora un panel con pestañas, cada una su propia ruta
// (/app/ajustes/negocio, /app/ajustes/servicios, …) — /app/ajustes solo redirige a la
// primera. "Nombre del negocio" y los servicios ya no están en la misma pantalla.
import { expect, test } from "@playwright/test";

import { waitForConfirmLink } from "./helpers/mailpit";

test.use({ storageState: { cookies: [], origins: [] } });
test.skip(
  ({ isMobile }) => isMobile,
  "un solo test (proyecto desktop): Ajustes no tiene una versión mobile propia en WP-15b",
);

const OWNER_EMAIL = "dueno@example.com";

test("Ajustes: cambiar el precio de un servicio se ve en /barberia-norte", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(OWNER_EMAIL);
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await expect(
    page.getByText(`Te enviamos un link a ${OWNER_EMAIL}.`),
  ).toBeVisible();
  const link = await waitForConfirmLink(OWNER_EMAIL);
  await page.goto(link);
  await page.waitForURL("**/app/inicio");

  await page.goto("/app/ajustes");
  await page.waitForURL("**/app/ajustes/negocio");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ajustes" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.getByLabel("Nombre del negocio")).toHaveValue(
    "Barbería Norte",
  );

  await page.goto("/app/ajustes/servicios");
  const row = page
    .getByTestId("service-row")
    .filter({ hasText: "Corte clásico" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("$12.000");

  await row.getByRole("button", { name: "Editar" }).click();
  const editor = page.getByTestId("service-editor");
  const priceField = editor.getByLabel("Precio");
  await priceField.fill("");
  await priceField.fill("13500");
  await editor.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(row).toContainText("$13.500");

  await page.goto("/barberia-norte");
  await expect(
    page.getByRole("heading", { name: "Barbería Norte" }),
  ).toBeVisible();
  const serviceButton = page.getByRole("button", { name: /Corte clásico/ });
  await expect(serviceButton).toContainText("$13.500");
});
