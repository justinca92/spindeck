// The home: wheel ⇄ Steam's sections, and the top band that makes Steam's bar and
// the tab row read as one (ported from the old flow.mjs / band.mjs scripts).
import { expect, test, type Page } from "@playwright/test";
import { events, homeReady, open } from "./helpers";

const slider = (page: Page) => page.locator("[data-spindeck-root] > div");
const onSections = (page: Page) => expect(slider(page)).toHaveAttribute("style", /top: -100%/);
const onWheel = (page: Page) => expect(slider(page)).toHaveAttribute("style", /top: 0%/);
const focused = (page: Page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
const tabRow = (page: Page) => page.locator(".tab-row");
const header = (page: Page) => page.locator(".steam-header");
const BAR = "rgba(0, 0, 0, 0.5)"; // the mock's Steam bar look, which Spindeck learns and copies

async function toSections(page: Page) {
  await homeReady(page);
  await page.keyboard.press("ArrowDown");
  await onSections(page);
  await page.waitForTimeout(800); // SWITCH_COOLDOWN_MS
}

test("▼ to Steam's sections (focus on the current tab), ▲ from the top back to the wheel", async ({ page }) => {
  const errors = await open(page);
  await toSections(page);
  expect(await focused(page)).toBe("What's New");
  await expect(tabRow(page)).toBeInViewport();
  await page.keyboard.press("ArrowUp");
  await onWheel(page);
  expect(errors).toEqual([]);
});

test("Ⓑ deep in the sections jumps to the top; Ⓑ at the top is Steam's own (Steam menu)", async ({ page }) => {
  await open(page);
  await toSections(page);
  await page.getByRole("button", { name: "Recommended: Something new" }).focus();
  await page.keyboard.press("Escape");
  await expect.poll(() => focused(page)).toBe("What's New");
  expect(await events(page, "steamMenu")).toEqual([]);
  await page.keyboard.press("Escape");
  expect(await events(page, "steamMenu")).toEqual([[]]);
  await onSections(page);
});

test("a held ▲ stops at the top of the sections; a fresh press leaves for the wheel", async ({ page }) => {
  await open(page);
  await toSections(page);
  await page.getByRole("button", { name: "Event: Summer update" }).focus(); // top content row
  await page.evaluate(() => (window as any).mock.press("DIR_UP", true)); // auto-repeat of a held ▲
  await page.waitForTimeout(500);
  await onSections(page);
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowUp");
  await onWheel(page);
});

test("▲ on the wheel goes to Steam's search box, but not right after arriving", async ({ page }) => {
  await open(page);
  await page.waitForFunction(() => document.querySelector('[data-dw="title"]'));
  await page.keyboard.press("ArrowUp"); // within ARRIVAL_IGNORE_MS: a held D-pad, ignored
  expect(await page.evaluate(() => document.activeElement?.className)).not.toBe("steam-search");
  await page.waitForTimeout(900);
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".steam-search")).toBeFocused();
});

test("top band: Steam's bar is see-through on the wheel; on the sections the tab row carries the bar's look", async ({ page }) => {
  await open(page);
  await homeReady(page);
  await expect(header(page)).toHaveClass(/spindeck-clear-header/);
  await expect(header(page)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.keyboard.press("ArrowDown");
  await onSections(page);
  await expect(tabRow(page)).toHaveCSS("background-color", BAR);
  await expect(tabRow(page)).toHaveCSS("margin-top", "-40px"); // grown up behind Steam's 40px bar
  await expect(header(page)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)"); // one band, no seam
  await page.waitForTimeout(800);
  await page.keyboard.press("ArrowUp");
  await onWheel(page);
  await expect.poll(() => tabRow(page).getAttribute("style")).not.toMatch(/margin-top|backdrop/); // released
});

test("top band survives Steam rewriting the tab row's style (restored before the next frame)", async ({ page }) => {
  await open(page);
  await toSections(page);
  await expect(tabRow(page)).toHaveCSS("background-color", BAR);
  const bg = await page.evaluate(async () => {
    const row = document.querySelector<HTMLElement>(".tab-row")!;
    row.setAttribute("style", "background: #2a2f38"); // what a React re-render of Steam's does
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return getComputedStyle(row).backgroundColor;
  });
  expect(bg).toBe(BAR);
});

test("Steam re-rendering its home on the sections: new recent row hidden, sections back in place, band follows", async ({ page }) => {
  const errors = await open(page);
  await toSections(page);
  await expect(tabRow(page)).toHaveCSS("background-color", BAR);
  const oldRow = await tabRow(page).elementHandle();
  await page.evaluate(() => (window as any).mock.rerenderHome());
  expect(await oldRow!.evaluate((el) => el.isConnected)).toBe(false); // every element replaced
  await expect(page.locator(".recent-row")).toHaveCSS("visibility", "hidden", { timeout: 3000 });
  await expect.poll(async () => Math.round((await tabRow(page).boundingBox())!.y), { timeout: 3000 }).toBeLessThanOrEqual(40); // back at the top
  await expect(tabRow(page)).toHaveCSS("margin-top", "-40px");
  await page.waitForTimeout(1200); // a sync tick: the listeners move to the new elements
  await page.evaluate(() => document.querySelector(".steam-home")!.scrollBy(0, 400)); // the new scroller
  await expect.poll(() => tabRow(page).getAttribute("style"), { timeout: 3000 }).not.toMatch(/margin-top/);
  expect(errors).toEqual([]);
});

test("Ⓑ deep in the sections returns to the selected tab (Friends), not always What's New", async ({ page }) => {
  await open(page);
  await toSections(page);
  await page.getByRole("button", { name: "Friends" }).evaluate((el) => ((el as HTMLElement).style.background = "#555")); // Steam paints the selected tab as a pill
  await page.getByRole("button", { name: "Recommended: Something new" }).focus();
  await page.keyboard.press("Escape");
  await expect.poll(() => focused(page)).toBe("Friends");
});

test("Steam's smooth scrolling on the sections isn't fought, and the band doesn't rewrite the tab row every frame", async ({ page }) => {
  await open(page);
  await toSections(page);
  const r = await page.evaluate(async () => {
    const vs = document.querySelector<HTMLElement>(".steam-home")!;
    const tabs = document.querySelector<HTMLElement>(".tab-row")!;
    let tabWrites = 0;
    new MutationObserver(() => tabWrites++).observe(tabs, { attributes: true, attributeFilter: ["style"] });
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const off = vs.scrollTop;
    let corrections = 0;
    // Down 400px and back, 20 frames each way, like Steam scrolling to a focused item.
    for (const target of [off + 400, off]) {
      const start = vs.scrollTop;
      for (let i = 1; i <= 20; i++) {
        const want = Math.round(start + ((target - start) * i) / 20);
        vs.scrollTop = want;
        await frame();
        if (Math.abs(vs.scrollTop - want) > 2) corrections++;
      }
    }
    await new Promise((res) => setTimeout(res, 400));
    return { corrections, tabWrites, end: Math.round(vs.scrollTop), off: Math.round(off) };
  });
  expect(r.corrections).toBe(0); // the clamp never yanks the scroll mid-way
  expect(r.tabWrites).toBeLessThanOrEqual(6); // only when the row crosses the top edge, not per frame
  expect(Math.abs(r.end - r.off)).toBeLessThanOrEqual(2);
});
