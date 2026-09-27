// Se docs/tasks/plans/WP-11.md §5. Inicio är en skärm för ägarens desktop (F6, min 1280 px,
// se planens §2) — körs bara i projektet "desktop".
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.skip(
  ({ isMobile }) => isMobile,
  "Inicio är en desktop-skärm (F6); mobil är Hoy (WP-14), se planens §2",
);

/** Navigerar med riktiga Tab-tryckningar tills `locator` har fokus (DESIGN.md §9). */
async function tabUntilFocused(page: Page, locator: Locator, maxPresses = 400) {
  const handle = await locator.elementHandle();
  if (!handle) throw new Error("tabUntilFocused: elementet finns inte");
  for (let i = 0; i < maxPresses; i++) {
    const isFocused = await page.evaluate(
      (el) => el === document.activeElement,
      handle,
    );
    if (isFocused) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("tabUntilFocused: nådde inte elementet med Tab");
}

test.describe("rutter", () => {
  for (const url of ["/design-lab/main", "/app/inicio"]) {
    test(`${url} svarar 200 och har exakt en h1 "Inicio"`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("Inicio");
    });
  }
});

test.describe("tidszon (America/Santiago oavsett webbläsarens tidszon)", () => {
  for (const timezoneId of ["Europe/Madrid", "Pacific/Auckland"]) {
    test.describe(`timezoneId=${timezoneId}`, () => {
      test.use({ timezoneId });

      test('visar "Viernes 2 de octubre" och "15:00"', async ({ page }) => {
        await page.goto("/design-lab/main");
        await expect(
          page.getByText("Viernes 2 de octubre").first(),
        ).toBeVisible();
        await expect(page.getByText("15:00", { exact: true })).toBeVisible();
      });
    });
  }
});

test("tangentbord: nav → header → VER DETALLE → Enviar recordatorio → Ver agenda → radernas knappar → kalender → Compartir", async ({
  page,
}) => {
  await page.goto("/design-lab/main");

  await tabUntilFocused(
    page,
    page.getByRole("link", { name: "Inicio", exact: true }),
  );
  await tabUntilFocused(page, page.getByRole("button", { name: "Buscar" }));
  await tabUntilFocused(page, page.getByRole("link", { name: "VER DETALLE" }));
  await tabUntilFocused(
    page,
    page.getByRole("button", { name: "Enviar recordatorio" }),
  );
  await tabUntilFocused(page, page.getByRole("link", { name: "Ver agenda" }));

  const rows = page.getByRole("listitem");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  for (let i = 0; i < rowCount; i++) {
    await tabUntilFocused(
      page,
      rows.nth(i).getByRole("button", { name: "Más opciones" }),
    );
  }

  await tabUntilFocused(
    page,
    page.getByRole("button", { name: "Mes anterior" }),
  );
  await tabUntilFocused(
    page,
    page.getByRole("button", { name: "Viernes 2 de octubre" }),
  );
  await tabUntilFocused(
    page,
    page.getByRole("link", { name: "Compartir hora flash" }),
  );
});

test("1280×800 en /app/inicio: sin scroll horizontal y el hero no se recorta", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/app/inicio");

  const noHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(noHorizontalScroll).toBe(true);

  const hero = page.getByRole("region", { name: "Resumen de la semana" });
  const clipped = await hero.evaluate(
    (el) => el.scrollHeight > el.clientHeight,
  );
  expect(clipped).toBe(false);
});

test('"Agenda de hoy" hace scroll interno con 14 filas (?estado=lleno), la página no se estira', async ({
  page,
}) => {
  await page.goto("/design-lab/main?estado=lleno");

  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(14);

  const list = page.locator("ul", { has: rows.first() });
  const scrollsInternally = await list.evaluate(
    (el) => el.scrollHeight > el.clientHeight,
  );
  expect(scrollsInternally).toBe(true);

  // Sidan (artboarden) i sig ska aldrig behöva sidscroll — bokningarna klipps aldrig bort,
  // de scrollar internt i "Agenda de hoy".
  const noPageScroll = await page.evaluate(
    () =>
      document.documentElement.scrollHeight <=
      document.documentElement.clientHeight,
  );
  expect(noPageScroll).toBe(true);
});

test("?estado=vacio: visar hero.tituloVacio och agendaHoy.vacio", async ({
  page,
}) => {
  await page.goto("/design-lab/main?estado=vacio");
  await expect(
    page.getByText("Esta semana todavía no recuperaste horas"),
  ).toBeVisible();
  await expect(
    page.getByText("No tienes reservas para hoy todavía."),
  ).toBeVisible();
});

test("?estado=sin-flash: visar inicio.flashCard.vacio i stället för datum/tid/rabatt", async ({
  page,
}) => {
  await page.goto("/design-lab/main?estado=sin-flash");
  await expect(
    page.getByText("No tienes ninguna hora flash activa todavía."),
  ).toBeVisible();
  await expect(page.getByText(/−\d+%/)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Crear hora flash" }),
  ).toBeVisible();
});

test.describe("axe (wcag2a, wcag2aa, wcag21aa)", () => {
  for (const url of [
    "/design-lab/main",
    "/design-lab/main?estado=vacio",
    "/design-lab/main?estado=lleno",
    "/design-lab/main?estado=sin-flash",
  ]) {
    test(`${url} sin violaciones`, async ({ page }) => {
      await page.goto(url);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("estilos calculados", () => {
  test("hero: border-radius 28px, altura 272px", async ({ page }) => {
    await page.goto("/design-lab/main");
    const hero = page.getByRole("region", { name: "Resumen de la semana" });
    const styles = await hero.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        radius: s.borderRadius,
        height: el.getBoundingClientRect().height,
      };
    });
    expect(styles.radius).toBe("28px");
    expect(styles.height).toBe(272);
  });

  test("StatTile: altura 116px", async ({ page }) => {
    await page.goto("/design-lab/main");
    const tile = page
      .getByText("Reservas hoy · 2 por confirmar", { exact: true })
      .locator("..");
    const height = await tile.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(height).toBe(116);
  });

  test("AgendaRow: altura 60px", async ({ page }) => {
    await page.goto("/design-lab/main");
    const row = page.getByRole("listitem").first();
    const height = await row.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(height).toBe(60);
  });
});
