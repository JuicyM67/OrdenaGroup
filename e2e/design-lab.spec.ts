import { expect, test } from "@playwright/test";

test.describe("design lab — routes", () => {
  test("/design-lab svarar 200", async ({ page }) => {
    const response = await page.goto("/design-lab");
    expect(response?.status()).toBe(200);
  });

  test("/design-lab/components svarar 200", async ({ page }) => {
    const response = await page.goto("/design-lab/components");
    expect(response?.status()).toBe(200);
  });

  test("/design-lab har noindex", async ({ page }) => {
    await page.goto("/design-lab");
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  });
});

test.describe("design lab — komponentkatalog", () => {
  test("ingen horisontell scroll vid 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/design-lab/components");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(true);
  });

  test("Pill vald: background-color och höjd matchar tokens", async ({
    page,
  }) => {
    await page.goto("/design-lab/components");
    const selected = page.getByRole("button", { name: "Diego", pressed: true });
    const box = await selected.boundingBox();
    const bg = await selected.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe("rgb(22, 22, 26)");
    expect(box?.height).toBe(44);
  });

  test("StatusChip success: bakgrund och textfärg matchar tokens", async ({
    page,
  }) => {
    await page.goto("/design-lab/components");
    const chip = page.getByText("Confirmada", { exact: true });
    const styles = await chip.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, color: s.color };
    });
    expect(styles.bg).toBe("rgb(213, 238, 220)");
    expect(styles.color).toBe("rgb(31, 107, 58)");
  });

  test("Card: border-radius 24px, ingen box-shadow eller border", async ({
    page,
  }) => {
    await page.goto("/design-lab/components");
    const surfaceCard = page.getByText("surface", { exact: true });
    const styles = await surfaceCard.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        radius: s.borderRadius,
        shadow: s.boxShadow,
        borderWidth: s.borderWidth,
      };
    });
    expect(styles.radius).toBe("24px");
    expect(styles.shadow).toBe("none");
    expect(styles.borderWidth).toBe("0px");
  });

  test("IconButton är 48×48 som standard", async ({ page }) => {
    await page.goto("/design-lab/components");
    const button = page.getByRole("button", { name: "Buscar" }).first();
    const box = await button.boundingBox();
    expect(box?.width).toBe(48);
    expect(box?.height).toBe(48);
  });

  test("fokusring på ljus yta: 2px ink, offset 2", async ({ page }) => {
    await page.goto("/design-lab/components");
    await page.getByRole("button", { name: "Mover" }).focus();
    const styles = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        color: s.outlineColor,
        width: s.outlineWidth,
        offset: s.outlineOffset,
      };
    });
    expect(styles?.color).toBe("rgb(22, 22, 26)");
    expect(styles?.width).toBe("2px");
    expect(styles?.offset).toBe("2px");
  });

  test("reducerad rörelse: transition-duration 0s på Pill", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design-lab/components");
    const duration = await page
      .getByRole("button", { name: "Cualquiera" })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe("0s");
  });
});

test.describe("design lab — pekskärm", () => {
  test.skip(({ isMobile }) => !isMobile, "bara relevant i mobilprojektet");

  test("tap på Pill växlar aria-pressed", async ({ page }) => {
    await page.goto("/design-lab/components");
    const pill = page.getByRole("button", { name: "Tomás" });
    await expect(pill).toHaveAttribute("aria-pressed", "false");
    await pill.tap();
    await expect(pill).toHaveAttribute("aria-pressed", "true");
  });
});
