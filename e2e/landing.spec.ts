// Landningssidan (/, offentlig). Ingen referensbild (design.md: sidan har ingen
// *.dc.html), så här testas bara att den renderar, länkar går rätt, är fri från
// horisontell scroll vid 360 px och inte har axe-överträdelser — se PR-rapporten.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { landing, sitio } from "../src/i18n/es-CL.marketing";

test("renderar med rubrik, nav och CTA:er", async ({ page, isMobile }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Mobil: glas-naven visar bara logga + meny; CTA:n finns i heron.
  await expect(
    isMobile
      ? page
          .getByRole("main")
          .getByRole("link", { name: landing.hero.ctaPrimario })
          .first()
      : page
          .getByRole("banner")
          .getByRole("link", { name: landing.nav.ctaCrearAgenda, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: landing.precios.titulo }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: landing.preguntas.titulo }),
  ).toBeVisible();
});

test("hero: novedad y vista previa de producto", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByText(sitio.inicio.heroBento.nuevo.texto),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: landing.hero.vistaPreviaAria }),
  ).toBeVisible();
});

test('"Entrar" lleva a /login', async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    'El link "Entrar" del header se oculta en mobil (< sm), el CTA cubre la misma acción',
  );
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: landing.nav.entrar })
    .click();
  await page.waitForURL("**/login");
});

test('el CTA secundario ("Ver una agenda de ejemplo") lleva a /barberia-norte', async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: landing.hero.ctaSecundario }).click();
  await page.waitForURL("**/barberia-norte");
});

test("el CTA primario del hero lleva a /login", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: landing.hero.ctaPrimario })
    .first()
    .click();
  await page.waitForURL("**/login");
});

test("360 px de ancho: sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(true);
});

test("preguntas frecuentes: se puede abrir una pregunta (details/summary nativo)", async ({
  page,
}) => {
  await page.goto("/");
  const primeraPregunta = landing.preguntas.items.instalar.pregunta;
  const respuesta = landing.preguntas.items.instalar.respuesta;
  await expect(page.getByText(respuesta)).not.toBeVisible();
  await page.getByText(primeraPregunta).click();
  await expect(page.getByText(respuesta)).toBeVisible();
});

test.describe("axe (wcag2a, wcag2aa, wcag21aa)", () => {
  test("/ sin violaciones", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
