// Rökning för sitio-webbens nya sidor (WP-hemsida). En rad per sida: svarar 200 och har
// en h1. Inget innehåll, inget axe (redan täckt av `e2e/landing.spec.ts`/`a11y.spec.ts`) —
// bara att varje route faktiskt renderar. Inte körd av WP-hemsida (se PR-rapporten): kör
// den separat med `npx playwright test e2e/sitio.spec.ts`.
import { expect, test } from "@playwright/test";

const PAGINAS = [
  "/funcionalidades",
  "/precios",
  "/para/barberias",
  "/para/peluquerias",
  "/para/estetica",
  "/para/kinesiologia",
  "/preguntas",
  "/contacto",
  "/horas-flash",
  "/ventajas",
] as const;

for (const ruta of PAGINAS) {
  test(`${ruta} responde 200 con un h1`, async ({ page }) => {
    const response = await page.goto(ruta);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("/para/no-existe responde 404", async ({ page }) => {
  const response = await page.goto("/para/no-existe");
  expect(response?.status()).toBe(404);
});
