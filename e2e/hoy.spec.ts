import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Se docs/tasks/plans/WP-14.md §5. Alla ?estado= som fixtures.ts känner till.
const ESTADOS = [
  undefined,
  "ahora",
  "atrasado",
  "sin-confirmar",
  "sin-proxima",
  "vacio",
  "cerrado",
  "muchas",
] as const;

function hoyUrl(estado: (typeof ESTADOS)[number]) {
  return estado ? `/design-lab/hoy?estado=${estado}` : "/design-lab/hoy";
}

// /app/hoy renderas i full, responsiv bredd (till skillnad från /design-lab/hoy, som är en
// fast 390×844-artboard för npm run visual, se page.tsx). Reflow/scroll-testerna nedan
// testar därför den riktiga routen, med samma fixtures via ?estado=.
function appHoyUrl(estado: (typeof ESTADOS)[number]) {
  return estado ? `/app/hoy?estado=${estado}` : "/app/hoy";
}

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

async function expectMinTapTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test.describe("Hoy — routes", () => {
  test("/design-lab/hoy svarar 200 med en h1 'Hoy'", async ({ page }) => {
    const response = await page.goto("/design-lab/hoy");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hoy" }),
    ).toBeVisible();
  });

  test("/app/hoy svarar 200 med en h1 'Hoy'", async ({ page }) => {
    const response = await page.goto("/app/hoy");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hoy" }),
    ).toBeVisible();
  });

  test("/app/hoy har noindex", async ({ page }) => {
    await page.goto("/app/hoy");
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  });
});

test.describe("Hoy — 360 px, ingen horisontell scroll", () => {
  for (const estado of ESTADOS) {
    test(`?estado=${estado ?? "(standard)"}: scrollWidth === 360`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(appHoyUrl(estado));
      const width = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(width).toBe(360);
    });
  }

  test("Llegó/No vino bryts inte till flera rader (whitespace: nowrap, höjd h-12)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/app/hoy");
    for (const name of ["Llegó", "No vino"]) {
      const button = page.getByRole("button", { name });
      const box = await button.boundingBox();
      const whiteSpace = await button.evaluate(
        (el) => getComputedStyle(el).whiteSpace,
      );
      expect(whiteSpace).toBe("nowrap");
      expect(box!.height).toBe(48);
    }
  });
});

test.describe("Hoy — muchas (scroll)", () => {
  test("sista radens boundingBox ligger ovanför flikradens topp när sidan är scrollad till botten", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app/hoy?estado=muchas");
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const rows = page.locator("li").filter({ hasText: /Vicente Silva/ });
    await expect(rows).toBeVisible();
    const rowBox = await rows.boundingBox();
    const tabBarBox = await page
      .getByRole("navigation", { name: "Secciones" })
      .boundingBox();
    expect(rowBox).not.toBeNull();
    expect(tabBarBox).not.toBeNull();
    expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(tabBarBox!.y + 1);
  });
});

test.describe("Hoy — klickytor ≥ 44×44", () => {
  test("flikar, snabbåtgärder, Llegó/No vino och notisknappen", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");
    for (const name of ["Hoy", "Agenda", "Clientes", "Caja"]) {
      await expectMinTapTarget(page.getByRole("link", { name, exact: true }));
    }
    for (const name of ["Crear hora flash", "Lista de espera · 3", "Cobrar"]) {
      await expectMinTapTarget(page.getByRole("link", { name }));
    }
    for (const name of ["Llegó", "No vino"]) {
      await expectMinTapTarget(page.getByRole("button", { name }));
    }
    // baseFixture har unreadNotifications: 1, så aria-label är den singulara varianten av
    // nav.notificacionesNuevas, inte den tomma nav.notificaciones.
    await expectMinTapTarget(
      page.getByRole("button", { name: "1 notificación nueva" }),
    );
  });
});

test.describe("Hoy — notisknappen", () => {
  test("badge och aria-label speglar unreadNotifications (>0 → prick + notificacionesNuevas)", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");
    const button = page.getByRole("button", { name: "1 notificación nueva" });
    await expect(button.locator(".bg-alert")).toBeVisible();
  });
});

test.describe("Hoy — pekskärm", () => {
  test.skip(({ isMobile }) => !isMobile, "bara relevant i mobilprojektet");

  test("tryck på Llegó visar nästa kund och läser upp bekräftelsen", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    await expect(card.getByText("Joaquín Rivas")).toBeVisible();

    await page.getByRole("button", { name: "Llegó" }).tap();

    await expect(card.getByText("Valentina Soto")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Marcado como Llegó.");
    await expect(card).toBeFocused();
  });
});

test.describe("Hoy — tidszon (America/Santiago oavsett webbläsarens tidszon)", () => {
  for (const timezoneId of ["Europe/Madrid", "Asia/Tokyo"]) {
    test(`${timezoneId}: visar 15:00, Viernes 2 de octubre, en 20 min`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      await page.goto("/design-lab/hoy");
      await expect(page.getByText("Viernes 2 de octubre")).toBeVisible();
      await expect(page.getByText("15:00")).toBeVisible();
      await expect(page.getByText("Siguiente · en 20 min")).toBeVisible();
      await context.close();
    });
  }
});

test.describe("Hoy — tangentbord", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "tangentbordsnavigation, inte pekskärm",
  );

  test("header → Llegó → No vino → snabbåtgärder → flikar, fokusring lime på mörk yta", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");

    const notif = page.getByRole("button", { name: "1 notificación nueva" });
    await tabUntilFocused(page, notif);

    const llego = page.getByRole("button", { name: "Llegó" });
    await tabUntilFocused(page, llego, 5);
    const styles = await llego.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.outlineColor, width: s.outlineWidth };
    });
    expect(styles.color).toBe("rgb(227, 243, 107)");
    expect(styles.width).toBe("2px");

    const noVino = page.getByRole("button", { name: "No vino" });
    await tabUntilFocused(page, noVino, 5);

    const flash = page.getByRole("link", { name: "Crear hora flash" });
    await tabUntilFocused(page, flash, 5);

    const hoyTab = page.getByRole("link", { name: "Hoy", exact: true });
    await tabUntilFocused(page, hoyTab, 20);
  });
});

test.describe("Hoy — NextClientCard, fokus efter Llegó", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "kräver tangentbordsaktivering (input-modality), inte pekskärm",
  );

  test("fokusringen ligger innanför kortet (negativ offset, lime på mörk botten)", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");
    // tabIndex={-1}: kortet nås inte med Tab (avsiktligt, se DESIGN.md §7), utan får fokus
    // programmatiskt när Llegó flyttar vidare till nästa kund (FRÅGA 1). Aktivera Llegó med
    // tangentbordet (inte .click()) — annars räknar Chromium input-modality som "pekare" och
    // visar ingen focus-visible-ring alls på det nya kortet, oavsett offset.
    const llego = page.getByRole("button", { name: "Llegó" });
    await tabUntilFocused(page, llego, 10);
    await page.keyboard.press("Enter");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    await expect(card).toBeFocused();
    const styles = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        color: s.outlineColor,
        width: s.outlineWidth,
        offset: s.outlineOffset,
        background: s.backgroundColor,
      };
    });
    expect(styles.color).toBe("rgb(227, 243, 107)"); // lime
    expect(styles.width).toBe("2px");
    // Negativ offset → ringen ligger innanför kortets (mörka) bakgrund, inte på den ljusa
    // canvasen bakom det (granskningsfynd: ~1,1:1 kontrast där, 13,97:1 mot bg-dark).
    expect(styles.offset).toBe("-2px");
    expect(styles.background).toBe("rgb(28, 28, 34)"); // bg-dark
  });
});

test.describe("Hoy — cerrado", () => {
  test("nästa-kund-kortet visar 'Hoy no atiendes.', inte 'No tienes más clientes agendados hoy.'", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy?estado=cerrado");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    await expect(card.getByText("Hoy no atiendes.")).toBeVisible();
    await expect(
      page.getByText("No tienes más clientes agendados hoy."),
    ).toHaveCount(0);
  });
});

test.describe("Hoy — reducerad rörelse", () => {
  test("transition-duration 0s på knappar och flikar", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design-lab/hoy");
    const buttonDuration = await page
      .getByRole("button", { name: "Llegó" })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(buttonDuration).toBe("0s");
    const tabDuration = await page
      .getByRole("link", { name: "Hoy", exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(tabDuration).toBe("0s");
  });
});

test.describe("Hoy — axe", () => {
  for (const estado of ESTADOS) {
    test(`/design-lab/hoy?estado=${estado ?? "(standard)"} har inga axe-överträdelser`, async ({
      page,
    }) => {
      await page.goto(hoyUrl(estado));
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("/app/hoy har inga axe-överträdelser", async ({ page }) => {
    await page.goto("/app/hoy");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
