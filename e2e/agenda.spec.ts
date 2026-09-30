import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Agenda är en desktopskärm, minsta bredd 1280 px (docs/tasks/plans/WP-12.md §2
// "Utanför scope": ingen mobilversion — Hoy/WP-14 är mobilvyn enligt F6).
test.skip(
  ({ isMobile }) => isMobile,
  "Agenda är desktop-only, se docs/tasks/plans/WP-12.md §2.",
);

/** Navigerar med riktiga Tab-tryckningar tills `locator` har fokus (samma mönster som
 * e2e/design-lab.spec.ts, DESIGN.md §9). */
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

test.describe("Agenda — rutter", () => {
  test("/design-lab/agenda svarar 200", async ({ page }) => {
    const response = await page.goto("/design-lab/agenda");
    expect(response?.status()).toBe(200);
  });

  test("/design-lab/agenda-dia svarar 200", async ({ page }) => {
    const response = await page.goto("/design-lab/agenda-dia");
    expect(response?.status()).toBe(200);
  });

  // WP-21: /app/agenda visar riktig data (D-020s grind borttagen, D-024). Den delade
  // storageState-sessionen (playwright.config.ts) saknar företag, så den redirectas till
  // onboarding, precis som /app (WP-15) — se e2e/onboarding.spec.ts. Ruttens riktiga
  // innehåll (noindex, ?vista=&fecha=, en ägare MED företag) testas i e2e/owner-live.spec.ts,
  // som loggar in som den seedade ägaren i stället.
  test("/app/agenda utan negocio → redirige a /app/onboarding", async ({
    page,
  }) => {
    await page.goto("/app/agenda");
    await page.waitForURL("**/app/onboarding");
  });
});

test.describe("Agenda — klick på en urkryssad profesional i railen", () => {
  test("gör hen synlig igen i filtret (granskningsfynd)", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    const tomasCheckbox = page.getByRole("checkbox", { name: /tomás/i });
    await expect(tomasCheckbox).toBeChecked();
    await tomasCheckbox.uncheck();
    await expect(tomasCheckbox).not.toBeChecked();

    await page.getByRole("button", { name: "Ver agenda de Tomás" }).click();

    await expect(tomasCheckbox).toBeChecked();
    await expect(
      page
        .getByTestId("day-column")
        .filter({ has: page.getByText("Tomás", { exact: true }) }),
    ).toBeVisible();
  });
});

test.describe("Agenda — tidszon (America/Santiago oavsett webbläsarens tidszon)", () => {
  test.use({ timezoneId: "Europe/Madrid" });

  test("Martina Lagos-blocket står fortfarande vid 11:30, nu-linjen vid 12:40", async ({
    page,
  }) => {
    await page.goto("/design-lab/agenda");
    const block = page.getByRole("button", { name: /Martina Lagos/ });
    const top = await block.evaluate((el) =>
      parseFloat(getComputedStyle(el).top),
    );
    expect(top).toBeCloseTo(161, 0);

    const nowLine = page.getByTestId("now-line").first();
    const nowTop = await nowLine.evaluate((el) =>
      parseFloat(getComputedStyle(el).top),
    );
    expect(nowTop).toBeCloseTo(270.67, 0);
  });
});

test.describe("Agenda — stilparitet vecka ↔ dag (dagvyn saknar en ritad referens)", () => {
  async function hourGap(page: Page): Promise<number> {
    const lines = page.getByTestId("hour-line");
    const tops = await lines.evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el).top)),
    );
    tops.sort((a, b) => a - b);
    return (tops[1] ?? 0) - (tops[0] ?? 0);
  }

  async function gutterWidth(page: Page): Promise<number> {
    const line = page.getByTestId("hour-line").first();
    return line.evaluate((el) => parseFloat(getComputedStyle(el).left));
  }

  async function panelRadius(page: Page): Promise<string> {
    const panel = page.getByTestId("time-grid");
    return panel.evaluate((el) => getComputedStyle(el).borderRadius);
  }

  async function columnBorderColor(page: Page): Promise<string> {
    const col = page.getByTestId("day-column").nth(1);
    return col.evaluate((el) => getComputedStyle(el).borderLeftColor);
  }

  async function eventStyles(page: Page) {
    const block = page.getByTestId("event-block").first();
    return block.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        radius: s.borderRadius,
        padding: `${s.paddingTop} ${s.paddingRight}`,
      };
    });
  }

  async function titleFontSize(page: Page): Promise<string> {
    const title = page
      .getByTestId("event-block")
      .first()
      .locator("div")
      .first();
    return title.evaluate((el) => getComputedStyle(el).fontSize);
  }

  async function nowLineColor(page: Page): Promise<string> {
    const line = page.getByTestId("now-line").first();
    return line.evaluate((el) => getComputedStyle(el).backgroundColor);
  }

  test("avståndet mellan timlinjer är 94px i båda", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    expect(await hourGap(page)).toBeCloseTo(94, 0);
    await page.goto("/design-lab/agenda-dia");
    expect(await hourGap(page)).toBeCloseTo(94, 0);
  });

  test("tidskolumnen är 64px i båda", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    expect(await gutterWidth(page)).toBe(64);
    await page.goto("/design-lab/agenda-dia");
    expect(await gutterWidth(page)).toBe(64);
  });

  test("panelens border-radius är 22px i båda", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    expect(await panelRadius(page)).toBe("22px");
    await page.goto("/design-lab/agenda-dia");
    expect(await panelRadius(page)).toBe("22px");
  });

  test("kolumnkantens färg är rgb(241, 241, 238) i båda", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    expect(await columnBorderColor(page)).toBe("rgb(241, 241, 238)");
    await page.goto("/design-lab/agenda-dia");
    expect(await columnBorderColor(page)).toBe("rgb(241, 241, 238)");
  });

  test("blockens border-radius (12px) och padding (7px 9px) är lika i båda", async ({
    page,
  }) => {
    await page.goto("/design-lab/agenda");
    const week = await eventStyles(page);
    expect(week.radius).toBe("12px");
    expect(week.padding).toBe("7px 9px");
    await page.goto("/design-lab/agenda-dia");
    const day = await eventStyles(page);
    expect(day.radius).toBe("12px");
    expect(day.padding).toBe("7px 9px");
  });

  test("titelns font-size (12.5px) är lika i båda", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    expect(await titleFontSize(page)).toBe("12.5px");
    await page.goto("/design-lab/agenda-dia");
    expect(await titleFontSize(page)).toBe("12.5px");
  });

  test("nu-linjens färg är lika i båda", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    const weekColor = await nowLineColor(page);
    await page.goto("/design-lab/agenda-dia");
    expect(await nowLineColor(page)).toBe(weekColor);
  });
});

test.describe("Agenda — geometri i dagvyn", () => {
  test('Diegos 11:30-block ligger i kolumnen "Diego" med top = 44 + 161', async ({
    page,
  }) => {
    await page.goto("/design-lab/agenda-dia");
    const diegoColumn = page
      .getByTestId("day-column")
      .filter({ has: page.getByText("Diego", { exact: true }) });
    const block = diegoColumn.getByRole("button", { name: /Martina Lagos/ });
    await expect(block).toBeVisible();
    // getComputedStyle(el).top är relativ till blockets eget positionerade ankare (som redan
    // ligger `headerHeight` under kolumnens topp, se time-grid.tsx) — den absoluta positionen
    // i sidled jämförs i stället mot kolumnens egen topkant.
    const [blockBox, columnBox] = await Promise.all([
      block.boundingBox(),
      diegoColumn.boundingBox(),
    ]);
    if (!blockBox || !columnBox) throw new Error("saknar boundingBox");
    expect(blockBox.y - columnBox.y).toBeCloseTo(44 + 161, 0);
  });
});

test.describe("Agenda — tangentbord", () => {
  test("Tab når vyval → dagrad → block; Enter öppnar popovern och fokus hamnar i den; Escape stänger", async ({
    page,
  }) => {
    await page.goto("/design-lab/agenda?estado=solapadas");
    const vista = page.getByRole("radio", { name: "Semana" });
    await tabUntilFocused(page, vista);

    // Chromiums riktiga accessible-name-beräkning lägger in ett mellanslag mellan de två
    // <span>-elementen (veckodag/siffra) som jsdom inte gör (se day-pill-row.test.tsx) —
    // därför \s* i stället för en exakt sträng.
    const todayPill = page.getByRole("button", { name: /^vie\s*2$/ });
    await tabUntilFocused(page, todayPill);

    const block = page.getByRole("button", { name: /Martina Lagos/ });
    await tabUntilFocused(page, block);

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Detalle de la reserva" });
    await expect(dialog).toBeVisible();
    const isInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]');
      return (
        !!dialogEl &&
        (dialogEl === document.activeElement ||
          dialogEl.contains(document.activeElement))
      );
    });
    expect(isInsideDialog).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("piltangenter i SegmentedControl når Mes (WP-50)", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    // Långsam CI: vänta tills Radix hydrerat innan piltangenten (annars tappas den).
    await expect(async () => {
      await page.getByRole("radio", { name: "Semana" }).focus();
      await page.keyboard.press("ArrowLeft");
      await expect(page.getByRole("radio", { name: "Mes" })).toBeFocused({
        timeout: 1000,
      });
    }).toPass({ timeout: 10_000 });
  });
});

// "Agenda — 1280×800, ingen horisontell scroll på /app/agenda": flyttad till
// e2e/owner-live.spec.ts (WP-21) — kräver en ägare MED företag, som den delade
// storageState-sessionen här saknar (se "Agenda — rutter" ovan).
test.describe("Agenda — panelen scrollar vertikalt inuti (inte sidan)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("rutnätet scrollar vertikalt inuti panelen (/design-lab/agenda)", async ({
    page,
  }) => {
    await page.goto("/design-lab/agenda");
    const panel = page.getByTestId("time-grid").locator("> div").first();
    const canScroll = await panel.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(canScroll).toBe(true);
  });
});

test.describe("Agenda — lanes (?estado=solapadas)", () => {
  test("två block sida vid sida med halva bredden", async ({ page }) => {
    await page.goto("/design-lab/agenda?estado=solapadas");
    const martina = page.getByRole("button", { name: /Martina Lagos/ });
    const rodrigo = page.getByRole("button", { name: /Rodrigo Peña/ });
    const [mBox, rBox] = await Promise.all([
      martina.boundingBox(),
      rodrigo.boundingBox(),
    ]);
    expect(mBox).not.toBeNull();
    expect(rBox).not.toBeNull();
    if (!mBox || !rBox) throw new Error("unreachable");
    // Sida vid sida: ungefär samma bredd, olika x.
    expect(Math.abs(mBox.width - rBox.width)).toBeLessThan(2);
    expect(Math.abs(mBox.x - rBox.x)).toBeGreaterThan(mBox.width / 2);
  });
});

test.describe("Agenda — ett block för bara en profesional krockar med en bokning (?estado=bloqueo)", () => {
  test("bokningen syns och går att klicka på, inte dold under blocket (granskningsfynd)", async ({
    page,
  }) => {
    await page.goto("/design-lab/agenda?estado=bloqueo");
    const bookingButton = page.getByRole("button", { name: /Martina Lagos/ });
    await expect(bookingButton).toBeVisible();

    const box = await bookingButton.boundingBox();
    if (!box) throw new Error("saknar boundingBox");
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const topElementIsTheBooking = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const block = el?.closest('[data-testid="event-block"]');
      return (
        block?.getAttribute("aria-label")?.includes("Martina Lagos") ?? false
      );
    }, center);
    expect(topElementIsTheBooking).toBe(true);

    // Delar lane med blocket: smalare än en hel kolumn (kolumnens `data-column-key` är
    // dagens datum i veckovyn, se agenda-screen.tsx).
    const column = page.locator(
      '[data-testid="day-column"][data-column-key="2026-10-02"]',
    );
    const columnBox = await column.boundingBox();
    if (!columnBox) throw new Error("saknar boundingBox");
    expect(box.width).toBeLessThan(columnBox.width * 0.7);

    // Klickbar: öppnar popovern.
    await bookingButton.click();
    await expect(
      page.getByRole("dialog", { name: "Detalle de la reserva" }),
    ).toBeVisible();
  });
});

test.describe("Agenda — style bara för geometri (D-021)", () => {
  test("inga style-attribut med färger i DOM:en", async ({ page }) => {
    await page.goto("/design-lab/agenda");
    const offenders = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("[style]"));
      return els
        .map((el) => el.getAttribute("style") ?? "")
        .filter((style) => /color|background|rgb|#/i.test(style));
    });
    expect(offenders).toEqual([]);
  });
});

test.describe("Agenda — axe", () => {
  const pages = [
    "/design-lab/agenda",
    "/design-lab/agenda-dia",
    "/design-lab/agenda?estado=vacia",
    "/design-lab/agenda?estado=cerrado",
    "/design-lab/agenda?estado=solapadas",
    "/design-lab/agenda?estado=bloqueo",
  ];

  for (const url of pages) {
    test(`${url} har inga axe-överträdelser`, async ({ page }) => {
      await page.goto(url);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
