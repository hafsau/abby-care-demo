import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const path of ["/", "/system", "/notes", "/visit", "/visit?step=7&lang=es", "/visit?step=9", "/visit?step=10&view=operator", "/visit?hospital=1"]) {
  test(`no WCAG violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await axe(page);
  });
}

test("audit mode and audit tab are accessible", async ({ page }) => {
  await page.goto("/visit?step=11&view=operator");
  await page.getByRole("button", { name: "Audit mode" }).click();
  await axe(page);
  await page.getByRole("tab", { name: "Audit trail" }).click();
  await axe(page);
});
