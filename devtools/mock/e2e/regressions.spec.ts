// Regressions that once broke on device, ported from the old tests/*.mjs scripts.
import { expect, test } from "@playwright/test";
import { homeReady, open, title } from "./helpers";

const REACT_BREAKAGE = /#130|invalid|Element type|Cannot read properties|not extensible|read only/i;

// #2: SteamGridDB's home patch ("Matching Recents Capsule") loaded before or after
// Spindeck. Spindeck keeps its patch last, so SteamGridDB patches Steam's real home
// (it reaches the recents row) and the wheel wraps the result: no React #130.
for (const order of ["first", "last"] as const) {
  test(`SteamGridDB's home patch loaded ${order}: wheel shown, SteamGridDB reaches Steam's recents row`, async ({ page }) => {
    const errors = await open(page, undefined, `?sgdb=${order}`);
    await expect(title(page)).toHaveText("AETHER DRIFT");
    await expect.poll(() => page.evaluate(() => (window as any).mock.sgdbHits)).toBeGreaterThan(0);
    expect(errors.filter((e) => REACT_BREAKAGE.test(e))).toEqual([]);
  });

  test(`SteamGridDB loaded ${order}, wheel turned off: Steam's own home, still patched by SteamGridDB`, async ({ page }) => {
    const errors = await open(page, { homeEnabled: false }, `?sgdb=${order}`);
    await expect(page.locator(".recent-row")).toBeVisible();
    await expect(title(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).mock.sgdbHits)).toBeGreaterThan(0);
    expect(errors.filter((e) => REACT_BREAKAGE.test(e))).toEqual([]);
  });
}

test("a rival plugin that also keeps its patch last: Spindeck stops swapping, no loop", async ({ page }) => {
  const errors = await open(page, undefined, "?sgdb=last&rival");
  await expect(title(page)).toHaveText("AETHER DRIFT");
  await page.waitForTimeout(1500);
  const moves = await page.evaluate(() => (window as any).mock.rivalMoves);
  expect(moves).toBeLessThanOrEqual(5);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).mock.rivalMoves)).toBe(moves); // settled
  expect(errors.filter((e) => REACT_BREAKAGE.test(e))).toEqual([]);
});

test("unload without React unmounting: everything done to Steam's UI is undone", async ({ page }) => {
  await open(page);
  await homeReady(page);
  await page.keyboard.press("ArrowDown"); // sections: the band styles Steam's header and the tab row
  await expect(page.locator(".tab-row")).toHaveAttribute("style", /margin-top/);
  await page.waitForTimeout(800);
  await page.keyboard.press("ArrowUp"); // back on the wheel: header cleared, circle input on
  await expect.poll(() => page.evaluate(() => (window as any).mock.keyboardActionset()), { timeout: 4000 }).toBe(true);
  const during = await page.evaluate(() => ({ cleared: document.querySelectorAll(".spindeck-clear-header").length, spacer: document.querySelectorAll("[data-spindeck-spacer]").length }));
  expect(during.cleared).toBeGreaterThan(0);
  expect(during.spacer).toBe(1);
  await page.evaluate(() => (window as any).mock.unload());
  const after = await page.evaluate(() => ({
    cleared: document.querySelectorAll(".spindeck-clear-header").length,
    style: !!document.getElementById("spindeck-clear-header-style"),
    spacer: document.querySelectorAll("[data-spindeck-spacer]").length,
    tabRowStyled: /margin-top|backdrop/.test(document.querySelector(".tab-row")!.getAttribute("style") ?? ""),
    headerBg: getComputedStyle(document.querySelector(".steam-header")!).backgroundColor,
    recentRow: getComputedStyle(document.querySelector(".recent-row")!).visibility,
    keyboardActionset: (window as any).mock.keyboardActionset(),
  }));
  expect(after).toEqual({ cleared: 0, style: false, spacer: 0, tabRowStyled: false, headerBg: "rgba(0, 0, 0, 0.5)", recentRow: "visible", keyboardActionset: false });
});

test("a crash inside the wheel falls back to Steam's original home", async ({ page }) => {
  await open(page, undefined, "?crash");
  await expect(page.locator(".recent-row")).toBeVisible();
  await expect(page.locator(".recent-row")).toHaveCSS("visibility", "visible");
  await expect(title(page)).toHaveCount(0);
});

test("an unknown Steam home layout: no errors, ▼ / ▲ still switch screens", async ({ page }) => {
  const errors = await open(page, undefined, "?flat");
  await homeReady(page);
  const slider = page.locator("[data-spindeck-root] > div");
  await page.keyboard.press("ArrowDown");
  await expect(slider).toHaveAttribute("style", /top: -100%/);
  await page.waitForTimeout(800);
  await page.keyboard.press("ArrowUp");
  await expect(slider).toHaveAttribute("style", /top: 0%/, { timeout: 3000 });
  expect(errors).toEqual([]);
});
