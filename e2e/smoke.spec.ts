import { expect, test } from "@playwright/test";

test("startsidan svarar 200 med lang es-CL", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CL");
});

test("tokens laddas genom Tailwind (canvas/ink)", async ({ page }) => {
  await page.goto("/");
  const { backgroundColor, color } = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { backgroundColor: style.backgroundColor, color: style.color };
  });
  expect(backgroundColor).toBe("rgb(244, 244, 240)");
  expect(color).toBe("rgb(22, 22, 26)");
});

test("typsnitten laddas via next/font", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const result = await page.evaluate(() => {
    const display = document.querySelector(".font-display");
    const displayFamily = display ? getComputedStyle(display).fontFamily : "";
    const bodyFamily = getComputedStyle(document.body).fontFamily;

    const loadedFamilies: string[] = [];
    document.fonts.forEach((face) => {
      if (face.status === "loaded") loadedFamilies.push(face.family);
    });

    return { displayFamily, bodyFamily, loadedFamilies };
  });

  const firstFamily = (fontFamily: string) =>
    fontFamily
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "");

  expect(firstFamily(result.displayFamily)).toBe("Bricolage Grotesque");
  expect(firstFamily(result.bodyFamily)).toBe("Plus Jakarta Sans");
  expect(result.loadedFamilies.some((f) => f === "Bricolage Grotesque")).toBe(
    true,
  );
  expect(result.loadedFamilies.some((f) => f === "Plus Jakarta Sans")).toBe(
    true,
  );
});

test("ingen horisontell scroll", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(true);
});
