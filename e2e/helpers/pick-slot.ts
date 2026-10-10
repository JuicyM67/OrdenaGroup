import type { Page } from "@playwright/test";

/**
 * Väljer första dag som faktiskt har en ledig tid och klickar på den tiden.
 * Sent på eftermiddagen (Santiago) kan dagens sista tider redan vara bokade
 * av ett tidigare projekt i samma körning, så "första dagen" räcker inte.
 */
export async function pickFirstFreeSlot(page: Page): Promise<void> {
  const daySection = page.locator('[aria-labelledby="paso-dia-hora"]');
  const days = daySection.getByRole("button");
  await days.first().waitFor();
  const times = page.getByRole("button", { name: /Elegir la hora/ });
  const count = await days.count();
  for (let i = 0; i < count; i++) {
    const day = days.nth(i);
    if (await day.isDisabled()) continue;
    await day.click();
    try {
      await times.first().waitFor({ timeout: 4_000 });
    } catch {
      continue;
    }
    await times.first().click();
    return;
  }
  throw new Error("Ingen ledig tid i fönstret");
}
