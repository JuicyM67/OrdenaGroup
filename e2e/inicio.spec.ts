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

/**
 * Fokusringen ska faktiskt synas: `outline-style: solid` och `outline-color` skild från
 * bakgrunden den ligger mot (närmaste förälderns bakgrund — inte elementets egen fyllning,
 * eftersom outlinen ritas utanför boxen och kan ligga mot ett pastellkort även om knappen
 * själv är mörk, t.ex. "Enviar recordatorio" i ett lime FeatureCard inuti hero-kortet, QA).
 */
async function assertVisibleFocusRing(locator: Locator) {
  const info = await locator.evaluate((el) => {
    const style = getComputedStyle(el);
    let bgEl = el.parentElement;
    let background = "rgba(0, 0, 0, 0)";
    while (bgEl) {
      const c = getComputedStyle(bgEl).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
        background = c;
        break;
      }
      bgEl = bgEl.parentElement;
    }
    return {
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
      background,
    };
  });
  expect(info.outlineStyle).toBe("solid");
  expect(info.outlineColor).not.toBe(info.background);
}

test.describe("rutter", () => {
  // WP-57: Inicios rubrik är nu hälsningen ("Hola, Camila") i stället för "Inicio" —
  // en reklamyta blev en hälsning + dagens läge (ägarens UX-genomgång, "Inicio som
  // 'dagens läge', inte en reklamyta").
  test('/design-lab/main svarar 200 och har exakt en h1 "Hola, Camila"', async ({
    page,
  }) => {
    const response = await page.goto("/design-lab/main");
    expect(response?.status()).toBe(200);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("Hola, Camila");
  });

  // WP-21: /app/inicio visar riktig data (D-020s grind borttagen, D-024). Den delade
  // storageState-sessionen (playwright.config.ts) saknar företag, så den redirectas till
  // onboarding, precis som /app (WP-15) — se e2e/onboarding.spec.ts. Ruttens riktiga
  // innehåll (en ägare MED företag) testas i e2e/owner-live.spec.ts.
  test("/app/inicio utan negocio → redirige a /app/onboarding", async ({
    page,
  }) => {
    await page.goto("/app/inicio");
    await page.waitForURL("**/app/onboarding");
  });
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

// WP-47: "Buscar" (sök saknar backend), "VER DETALLE" (`#detalle-semana`, ingen sektion med
// det id:t) och "Enviar recordatorio"/"Compartir hora flash" (winback/horas flash saknar
// backend) döljs — WP-xx: visas när funktionen finns. Kontomenyn (UserMenu, "…" i
// PageHeader) är ny men testas inte här (Radix Popover, inget tabbstopp-beteende att
// regressionstesta ovanpå det som redan täcks av menu.tsx/user-menu.tsx-komponenterna).
test("tangentbord: nav → header → Ver agenda → radernas knappar → kalender", async ({
  page,
}) => {
  await page.goto("/design-lab/main?estado=solicitudes");

  await tabUntilFocused(
    page,
    page.getByRole("link", { name: "Inicio", exact: true }),
  );
  // WP-45: klockan räknar väntande förfrågningar; ?estado=solicitudes har två → pluralform.
  await tabUntilFocused(
    page,
    page.getByRole("button", { name: "2 notificaciones nuevas" }),
  );

  const verAgenda = page.getByRole("link", { name: "Ver agenda" }).first();
  await tabUntilFocused(page, verAgenda);
  await assertVisibleFocusRing(verAgenda);

  // Bara "Agenda de hoy"-raderna (har "Más opciones"); "Kommande bokningar" har egna listrader.
  const rows = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Más opciones" }) });
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  for (let i = 0; i < rowCount; i++) {
    await tabUntilFocused(
      page,
      rows.nth(i).getByRole("button", { name: "Más opciones" }),
    );
  }

  // WP-57: kalenderkortet (minikalender/"Mes anterior") togs bort från Inicio (ägarens
  // UX-genomgång) — asidens första kort är nu FlashCard, "Compartir hora flash" i stället.
  const compartir = page.getByRole("link", { name: "Compartir hora flash" });
  await tabUntilFocused(page, compartir);
  await assertVisibleFocusRing(compartir);
});

// "1280×800 en /app/inicio: sin scroll horizontal y el hero no se recorta": flyttad till
// e2e/owner-live.spec.ts (WP-21) — kräver en ägare MED företag, som den delade
// storageState-sessionen här saknar (se "rutter" ovan).

test('"Agenda de hoy" hace scroll interno con 14 filas (?estado=lleno), la página no se estira', async ({
  page,
}) => {
  await page.goto("/design-lab/main?estado=lleno");

  // Bara "Agenda de hoy"-raderna (har "Más opciones"); "Kommande bokningar" har egna listrader.
  const rows = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Más opciones" }) });
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

// WP-57: hero-ytan (och dess "Esta semana todavía no recuperaste horas"-tomläge) är borta —
// nästa kund-kortet visar nu `hoy.sinProximaReserva` när dagen är tom, samma tomläge som Hoy.
test("?estado=vacio: visar hoy.sinProximaReserva och agendaHoy.vacio", async ({
  page,
}) => {
  await page.goto("/design-lab/main?estado=vacio");
  await expect(
    page.getByText("No tienes más clientes agendados hoy."),
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
  // WP-30: /app/flash finns — länken "Crear hora flash" visas igen.
  await expect(
    page.getByRole("link", { name: "Crear hora flash" }),
  ).toHaveCount(1);
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
  // WP-57: HeroSummary (28px/272px) ersattes av NextClientCard ("Próxima reserva") —
  // samma mörka kortradie (`--radius-hero`), men ingen fast höjd (innehållet styr den).
  test("Próxima reserva: border-radius 28px", async ({ page }) => {
    await page.goto("/design-lab/main");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    const radius = await card.evaluate(
      (el) => getComputedStyle(el).borderRadius,
    );
    expect(radius).toBe("28px");
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
