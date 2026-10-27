// Smoke: the plugin loads in every entry point without errors.
import { expect, test } from "@playwright/test";
import { backend, open, title } from "./helpers";

test("home: the wheel replaces Steam's home, with the library on it", async ({ page }) => {
  const errors = await open(page);
  await expect(title(page)).toHaveText("AETHER DRIFT"); // most recently played first
  await expect(page.locator(".recent-row")).toBeHidden(); // Steam's recent row stays in the layout, invisible
  await expect(page.getByText("My Steam Deck")).toBeVisible();
  await expect(page.getByText("Today's game?")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Quick Access panel: every section renders, version from package.json", async ({ page }) => {
  const errors = await open(page, undefined, "?qam");
  const qam = page.getByLabel("Quick Access");
  for (const heading of ["Personalize", "Library", "Display", "Wheel controls", "Haptics & sound", "General", "About"]) await expect(qam.getByRole("heading", { name: heading })).toBeVisible();
  await expect(qam.getByText(/^Spindeck v\d+\.\d+\.\d+(-[\w.]+)?$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("wheel turned off: Steam's own home, untouched", async ({ page }) => {
  await open(page, { homeEnabled: false });
  await expect(page.locator(".recent-row")).toBeVisible();
  await expect(title(page)).toHaveCount(0);
});

test("the /spindeck page opens the wheel on its own route", async ({ page }) => {
  const errors = await open(page);
  await page.evaluate(() => (window as any).mock.go("/spindeck"));
  await expect(title(page)).toHaveText("AETHER DRIFT");
  expect(errors).toEqual([]);
});

for (const [steam, text] of [
  ["koreana", "오늘의 게임은?"],
  ["german", "Spiel des Tages?"],
  ["japanese", "今日のゲームは？"],
]) {
  test(`${steam} Steam: the UI follows Steam's language`, async ({ page }) => {
    const errors = await open(page, undefined, `?lang=${steam}`);
    await expect(page.getByText(text)).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("backend round-trip: settings written by the panel reach main.py", async ({ page }) => {
  await open(page, undefined, "?qam");
  await page.getByLabel("Quick Access").locator(".field", { hasText: "Wheel sound" }).click();
  await expect.poll(async () => (await backend(page, "get_settings"))?.soundEnabled, { timeout: 3000 }).toBe(false);
});

test("the v1.3.0 hero art option is offered only for the side layout", async ({ page }) => {
  await open(page, undefined, "?qam");
  const qam = page.getByLabel("Quick Access");
  await expect(qam.getByText("Hero art v1.3.0 style")).toBeVisible();
  await open(page, { layout: "bottom" }, "?qam");
  await expect(page.getByLabel("Quick Access").getByText("Wheel position")).toBeVisible();
  await expect(page.getByLabel("Quick Access").getByText("Hero art v1.3.0 style")).toHaveCount(0);
});
