import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Use demo replay", exact: true })
    .click();
  await expect(page.locator(".window-card")).toHaveCount(3);
});
test("planner modes, house selection and timeline remain linked", async ({
  page,
}) => {
  await expect(page.locator(".window-card.selected")).toContainText(
    "Immersion",
  );
  await page.getByRole("button", { name: "Lower bills", exact: true }).click();
  await expect(page.locator(".window-card.selected")).toContainText("23:00");
  await page.getByRole("button", { name: "Less carbon", exact: true }).click();
  await expect(page.locator(".window-card.selected")).toContainText("05:30");
  await page.locator(".house-label").filter({ hasText: "Laundry" }).click();
  await expect(page.locator(".window-card.selected")).toContainText(
    "Washing machine",
  );
  await page.locator(".carbon-band button").nth(20).click();
  await expect(page.locator(".timeline-readout")).toContainText("00:00");
  await expect(page.locator(".time-cursor")).toContainText("00:00");
  await page.screenshot({
    path: "/tmp/wattwhen-e2e-desktop.png",
    fullPage: true,
  });
});
test("EV, solar and battery update forecasts and annual estimates", async ({
  page,
}) => {
  await page.getByLabel("YOUR HOUSEHOLD").selectOption("solar");
  await expect(page.locator(".window-card")).toHaveCount(4);
  await expect(
    page
      .getByRole("complementary")
      .getByRole("button", { name: "Electric car", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Solar year", exact: true }).click();
  await expect(
    page.getByText("Estimated bill reduction", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".solar-stats")).toContainText("3,889 kWh");
  await page
    .getByText("Assumptions & monthly figures", { exact: true })
    .click();
  await expect(page.locator(".source-details")).toContainText("65% self-use");
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await expect(page.locator(".source-details")).toContainText("35% self-use");
  await page.getByRole("button", { name: "Solar panels", exact: true }).click();
  await expect(page.getByText("Meet your solar year.")).toBeVisible();
});
test("chat fallback is explicit, focus stays in dialog, Escape restores focus", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Ask WattWhen AI",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page
    .getByRole("button", { name: "When should I run the immersion?" })
    .click();
  await expect(page.locator(".message.assistant")).toBeVisible();
  await expect(page.locator(".message.assistant")).toContainText(
    "Calculated planner · not AI",
  );
  await expect(page.locator(".message.assistant")).toContainText(
    "These use the configured appliance durations",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("mobile layout does not overflow and settings can be changed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".configure > summary").click();
  await page.getByLabel("County", { exact: true }).selectOption("Galway");
  await expect(page.locator(".house-topline")).toContainText("Galway");
  await page.getByLabel("Tumble dryer", { exact: true }).check();
  await expect(page.locator(".window-card")).toHaveCount(4);
  await page.screenshot({
    path: "/tmp/wattwhen-e2e-mobile.png",
    fullPage: true,
  });
});
test("API rejects invalid settings and impossible deadline yields no windows", async ({
  request,
}) => {
  const bad = await request.post("/api/plan", {
    data: { household: "mam", mode: "invalid", sample: true },
  });
  expect(bad.status()).toBe(400);
  const late = await request.post("/api/plan", {
    data: {
      household: "mam",
      mode: "cost",
      sample: true,
      deadline: "2026-10-04T13:15:00Z",
    },
  });
  expect(late.ok()).toBe(true);
  expect((await late.json()).windows).toEqual([]);
});
test("sample bill review changes the rates used by the planner", async ({
  page,
}) => {
  await page.locator(".configure > summary").click();
  await page.locator(".bill-upload > summary").click();
  await page.getByRole("button", { name: "Try a fictional demo bill" }).click();
  await expect(page.locator(".bill-review")).toContainText(
    "Fictional demo · not AI",
  );
  await page
    .getByRole("button", { name: "Confirm sample rates & apply" })
    .click();
  await expect(page.locator(".timeline-footer")).toContainText(
    "Night rate 15c",
  );
  await expect(page.locator(".house-metrics")).toContainText("34");
  await page
    .getByRole("button", { name: "Reset to default sample tariff" })
    .click();
  await expect(page.locator(".timeline-footer")).toContainText(
    "Night rate 16c",
  );
});
