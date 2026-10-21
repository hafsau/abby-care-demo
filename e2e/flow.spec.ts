import { expect, test } from "@playwright/test";

const phone = (page: import("@playwright/test").Page) => page.getByRole("region", { name: /Rosa/ });

test("the whole visit, driven from the screens themselves", async ({ page }) => {
  await page.goto("/visit");
  const p = phone(page);
  await p.getByRole("button", { name: "Clock in" }).click();
  await p.getByRole("button", { name: "Log today's tasks" }).click();
  await expect(p.getByText("Not done · asleep")).toBeVisible();
  await p.getByRole("button", { name: "We're at therapy" }).click();
  await p.getByRole("button", { name: "Continue" }).click();
  await expect(p.getByText("Your hours aren't lost")).toBeVisible();
  await expect(p.getByText(/nobody edits them, including you/)).toBeVisible();
  await p.getByRole("button", { name: "Send for review" }).click();
  await p.getByRole("button", { name: "Add tonight's note" }).click();

  // Escalation is shown before any AI draft exists.
  await expect(p.getByText("Call the on-call nurse")).toBeVisible();
  await expect(p.getByText(/Call 911 if/)).toBeVisible();
  await expect(p.getByText("Check your note")).toHaveCount(0);
  await p.getByRole("button", { name: "Write my note from this" }).click();

  // An AI line she didn't say blocks signing until she fixes it.
  const sign = p.getByRole("button", { name: "Sign my note" });
  await expect(sign).toBeDisabled();
  await p.getByRole("button", { name: "Use what I said" }).click();
  await expect(sign).toBeEnabled();
  await sign.click();
  await expect(p.getByText("Note signed. Dana's looking at it.")).toBeVisible();

  // Dana records an outcome on her own surface.
  await expect(page.getByRole("tab", { name: "Dana · clinician" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Seizures above his usual pattern", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Record outcome" }).click();
  await expect(p.getByText("Dana reviewed this at 9:12 pm")).toBeVisible();

  // Sam approves the fix; the story ends verified.
  await page.getByRole("button", { name: "Next: Sam approves the time fix" }).click();
  await expect(page.getByRole("tab", { name: "Sam · operations" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Next: Care verified" }).click();
  await expect(page.getByText("Ready to bill", { exact: true })).toBeVisible();
  await expect(p.getByText("Care verified").first()).toBeVisible();

  // The edit is in the append-only trail.
  await page.getByRole("tab", { name: "Audit trail" }).click();
  await expect(page.getByText("Edited an AI line")).toBeVisible();
  await expect(page).toHaveURL(/step=11/);
});

test("Spanish on the caregiver side", async ({ page }) => {
  await page.goto("/visit?step=7");
  const p = phone(page);
  await p.getByRole("button", { name: "ES", exact: true }).click();
  await expect(p.getByText("Revisa tu nota")).toBeVisible();
  await expect(p.getByRole("button", { name: "Firmar mi nota" })).toBeDisabled();
  await expect(page).toHaveURL(/lang=es/);
});

test("state rules re-render from config", async ({ page }) => {
  await page.goto("/visit?step=10&view=operator");
  await expect(page.getByText(/PA-01 · Device or connectivity issue/)).toBeVisible();
  await page.getByRole("button", { name: "Florida" }).click();
  await expect(page.getByText(/VM-10 · Mobile device failure/)).toBeVisible();
  await expect(page.getByText(/Late after 10 min/)).toBeVisible();
});

test("hospital stay puts every view on hold", async ({ page }) => {
  await page.goto("/visit");
  await page.getByLabel("Edge case: Mateo is in the hospital").check();
  await expect(phone(page).getByRole("button", { name: "Clock in" })).toBeDisabled();
  await expect(page.getByText(/resumption-of-care visit needed/)).toBeVisible();
  await page.getByRole("tab", { name: "Sam · operations" }).click();
  await expect(page.getByText("Member inpatient since Thursday 6:30 am.")).toBeVisible();
});

test("locked controls explain themselves for the clinician", async ({ page }) => {
  await page.goto("/visit?step=9");
  await expect(page.getByText("Clinicians don't change visit times. Care operations reviews EVV fixes.")).toBeVisible();
});

test("state diagram shows each role's view of a state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Claim-ready" }).click();
  await expect(page.getByText("Not shown to this role").first()).toBeVisible();
  await page.getByRole("button", { name: "Awaiting caregiver" }).click();
  await expect(page.getByText(/Can do now: Sign the note/)).toBeVisible();
});

test("readable at 200% text size", async ({ page }) => {
  await page.goto("/visit?step=7");
  await page.addStyleTag({ content: "html { font-size: 200% !important } body * { font-size: max(1em, inherit) }" });
  await page.evaluate(() => document.documentElement.style.setProperty("zoom", "2"));
  await expect(phone(page).getByRole("button", { name: "Use what I said" })).toBeVisible();
});

test("site is noindexed", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});
