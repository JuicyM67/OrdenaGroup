import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("/design-lab/components har inga axe-överträdelser (wcag2a/aa, wcag21aa)", async ({
  page,
}) => {
  await page.goto("/design-lab/components");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
