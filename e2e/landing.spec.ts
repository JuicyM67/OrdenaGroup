// Landningssidan (/, offentlig). Ingen referensbild (design.md: sidan har ingen
// *.dc.html), så här testas bara att den renderar, länkar går rätt, är fri från
// horisontell scroll vid 360 px och inte har axe-överträdelser — se PR-rapporten.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { brand } from "../src/config/brand";
import { paraClientes } from "../src/i18n";
import { home, landing } from "../src/i18n/es-CL.marketing";
import { paginas } from "../src/i18n/paginas";

test("renderar med rubrik, nav och CTA:er", async ({ page, isMobile }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Mobil: glas-naven visar bara logga + meny; CTA:n finns i heron (e-postfältet).
  await expect(
    isMobile
      ? page
          .getByRole("main")
          .getByRole("button", { name: home.hero.cta })
          .first()
      : page
          .getByRole("banner")
          .getByRole("link", { name: landing.nav.ctaCrearAgenda, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: new RegExp(home.precios.tituloPre) }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: home.faq.titulo }),
  ).toBeVisible();
});

test("hero: foto, pill med bransch och USP-karusell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(home.hero.prefijo).first()).toBeVisible();
  await expect(
    page.getByRole("img", { name: home.hero.fotoAlt }),
  ).toBeVisible();
});

test('"Entrar" → "Tengo un negocio" lleva a /login', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'El botón "Entrar" del header se oculta en mobil (< sm), el CTA cubre la misma acción',
  );
  await page.goto("/");
  // Med marknadsplatsen på (D-060) är "Entrar" en meny med kund- och företagsinloggning.
  await page
    .getByRole("banner")
    .getByRole("button", { name: paginas.nav.entrar })
    .click();
  // Länken i popovern (sidfoten har en likadan textlänk).
  await page
    .getByRole("dialog")
    .getByRole("link", { name: paraClientes.nav.tengoNegocio })
    .click();
  await page.waitForURL("**/login");
});

test('"Ver la página de ejemplo" lleva al negocio de demo (brand.demoSlug)', async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: home.showcase.cta }).click();
  await page.waitForURL(`**/${brand.demoSlug}`);
});

test("el formulario del hero lleva a /comenzar con el correo (WP-83)", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#hero-email").fill("ana@example.com");
  // Inloggade projekt omdirigeras vidare från /comenzar – kontrollera själva
  // navigeringen dit i stället för slutadressen.
  const navigated = page.waitForRequest(
    (r) =>
      r.isNavigationRequest() &&
      r.url().includes("/comenzar?email=ana%40example.com"),
  );
  await page
    .getByRole("main")
    .getByRole("button", { name: home.hero.cta })
    .first()
    .click();
  await navigated;
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
  // La primera pregunta viene abierta; probamos con la segunda.
  const { pregunta: primeraPregunta, respuesta } = home.faq.items[1]!;
  await expect(page.getByText(respuesta)).not.toBeVisible();
  await page.getByText(primeraPregunta).click();
  await expect(page.getByText(respuesta)).toBeVisible();
});

test.describe("axe (wcag2a, wcag2aa, wcag21aa)", () => {
  test("/ sin violaciones", async ({ page }) => {
    // Stillastående animationer (samma som för besökare med minskad rörelse) och
    // utan de dekorativa produktmockuperna (aria-hidden): de byter färg mitt i
    // animationen och bär ingen information.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude('[aria-hidden="true"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
