import { expect, test, type Page } from "@playwright/test";

const phone = (page: Page) => page.getByRole("region", { name: /Rosa/ });

test("the whole visit, driven from the screens themselves", async ({ page }) => {
  await page.goto("/visit");
  const p = phone(page);
  await p.getByRole("button", { name: "Clock in" }).click();
  await p.getByRole("button", { name: "Log today's tasks" }).click();
  await expect(p.getByText("Not done · asleep")).toBeVisible();

  // The seizure check runs on taps at 3:14 pm, before any AI exists in the story.
  await p.getByRole("button", { name: "Log a seizure" }).click();
  await expect(p.getByText("Call the on-call nurse")).toBeVisible();
  await expect(p.getByText(/doesn't use AI/)).toBeVisible();
  await expect(p.getByText(/5 minutes or longer/)).toBeVisible();
  await expect(p.getByRole("link", { name: "Call 911" })).toBeVisible();

  await p.getByRole("button", { name: "We're going to therapy" }).click();
  await p.getByRole("button", { name: "Continue" }).click();
  await expect(p.getByText("Your hours aren't lost")).toBeVisible();
  await expect(p.getByText(/nobody can change them, not even you/)).toBeVisible();
  await expect(p.getByText(/Send your fix by Tue, Oct 27/)).toBeVisible();
  await p.getByRole("button", { name: "Send for review" }).click();
  await p.getByRole("button", { name: "Add tonight's note" }).click();
  await expect(p.getByText(/already ran at 3:14 pm/)).toBeVisible();
  await p.getByRole("button", { name: "Write my note from this" }).click();

  // An AI line she didn't say blocks signing until she fixes it.
  const sign = p.getByRole("button", { name: "Sign my note" });
  await expect(sign).toBeDisabled();
  await p.getByRole("button", { name: "Use what I said" }).click();
  await expect(sign).toBeEnabled();
  await sign.click();
  await expect(p.getByText("Note signed. Dana's looking at it.")).toBeVisible();

  // Dana's choice is hers: nothing preselected away from the suggestion.
  await expect(page.getByText("Seizures above his usual pattern", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nurse home visit within 24 hours (suggested)")).toBeChecked();
  await page.getByLabel("Phone follow-up tomorrow").check();
  await expect(page.getByLabel(/Why you changed it/)).toBeVisible();
  await page.getByRole("button", { name: "Fill in Dana's answers" }).click();
  await page.getByRole("button", { name: "Record outcome" }).click();
  await expect(p.getByText("Dana reviewed this at 9:12 pm")).toBeVisible();
  await expect(page.getByText(/Changed from the suggested/)).toBeVisible();

  // Sam approves; care is verified before it's claim-ready.
  await page.getByRole("button", { name: "Next: Sam approves the time fix" }).click();
  await expect(page.getByText(/operations is waiting on the aggregator/)).toBeVisible();
  await expect(page.getByText(/claim-ready for operations/)).toHaveCount(0);
  await page.getByRole("button", { name: /Next: The aggregator accepts/ }).click();
  await expect(page.getByText("Ready to bill", { exact: true })).toBeVisible();
  await expect(page.getByText(/claim-ready for operations/)).toBeVisible();

  // Compliance view shows the edit in full.
  await page.getByRole("tab", { name: /Audit trail/ }).click();
  await expect(page.getByText("Edited an AI line")).toBeVisible();
  await expect(page).toHaveURL(/step=12/);
});

test("operations sees who and when, not clinical content", async ({ page }) => {
  await page.goto("/visit?step=12&view=operator");
  await page.getByRole("button", { name: "Audit mode" }).click();
  const region = page.getByRole("region", { name: /Operations web view/ });
  await expect(region.getByText("Edited an AI line")).toBeVisible();
  await expect(region.getByText(/refused his 2:00 pm/)).toHaveCount(0);
  await expect(region.getByText("Clinical detail visible to clinicians and compliance").first()).toBeVisible();
});

test("Spanish on the caregiver side, including the note she signs", async ({ page }) => {
  await page.goto(`/visit?step=8`);
  const p = phone(page);
  await p.getByRole("button", { name: "ES", exact: true }).click();
  await expect(p.getByText("Revisa tu nota")).toBeVisible();
  await expect(p.getByText(/se negó a la alimentación/)).toBeVisible();
  await expect(p.getByRole("button", { name: "Firmar mi nota" })).toBeDisabled();
  await p.getByRole("button", { name: "Usar lo que dije" }).click();
  await expect(p.getByText(/porque Mateo estaba dormido/)).toBeVisible();
  await expect(p.getByText(/La IA escribió/)).toBeVisible();
  await expect(page).toHaveURL(/lang=es/);
});

test("state rules re-render from config", async ({ page }) => {
  await page.goto("/visit?step=11&view=operator");
  await expect(page.getByText(/PA-01 · Device or connectivity issue/)).toBeVisible();
  await page.getByRole("button", { name: "Florida" }).click();
  await expect(page.getByText(/VM-10 · Mobile device failure/)).toBeVisible();
  await expect(page.getByText(/note also needs task codes/)).toBeVisible();
  await page.goto("/visit?step=5&state=FL");
  await expect(phone(page).getByText(/Send your fix by Fri, Oct 23/)).toBeVisible();
});

test("hospital stay puts every view on hold, and pay is still clear", async ({ page }) => {
  await page.goto("/visit");
  await page.getByLabel("Edge case: Mateo is in the hospital").check();
  const p = phone(page);
  await expect(p.getByRole("button", { name: "Clock in" })).toBeDisabled();
  await expect(p.getByText("Thursday, Oct 22")).toBeVisible();
  await expect(p.getByText(/still paid on payday/).first()).toBeVisible();
  await expect(page.getByText(/resumption of care/)).toBeVisible();
  await page.getByRole("tab", { name: "Sam · operations" }).click();
  await expect(page.getByText("Member inpatient since Thursday 6:30 am.")).toBeVisible();
});

test("proof shortcuts land on the right moment", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /An AI line she didn't say blocks signing/ }).first().click();
  await expect(phone(page).getByRole("button", { name: "Sign my note" })).toBeDisabled();
  await page.goto("/visit");
  await page.getByRole("link", { name: /Billing is operations-only/ }).click();
  await expect(page.getByText("Ready to bill", { exact: true })).toBeVisible();
});

test("locked controls explain themselves for the clinician", async ({ page }) => {
  await page.goto("/visit?step=10");
  await expect(page.getByText("Clinicians don't change visit times. Care operations reviews EVV fixes.")).toBeVisible();
});

test("state diagram shows each role's view of a state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Claim-ready" }).click();
  await expect(page.getByText("Not shown to this role").first()).toBeVisible();
  await page.getByRole("button", { name: "Awaiting caregiver" }).click();
  await expect(page.getByText(/Can do now: Sign the note/)).toBeVisible();
});

test("readable at 200% zoom", async ({ page }) => {
  await page.goto("/visit?step=8");
  await page.evaluate(() => document.documentElement.style.setProperty("zoom", "2"));
  await expect(phone(page).getByRole("button", { name: "Use what I said" })).toBeVisible();
});

test("site is noindexed", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});
