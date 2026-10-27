// End to end: controller input on the wheel → what the plugin asks of Steam.
import { expect, test } from "@playwright/test";
import { backend, clearEvents, events, open, title, wheelReady } from "./helpers";

const qam = (page) => page.getByLabel("Quick Access");

test("D-pad ◀ ▶ steps through the library with Steam's UI sound", async ({ page }) => {
  await open(page);
  await wheelReady(page);
  await page.keyboard.press("ArrowRight");
  await expect(title(page)).toHaveText("BRASS LANTERN");
  await page.keyboard.press("ArrowLeft");
  await expect(title(page)).toHaveText("AETHER DRIFT");
  expect((await events(page, "sound")).flat()).toContain("deck_ui_navigation.wav");
});

test("Ⓐ opens the game page by default; Ⓑ comes back to the same game", async ({ page }) => {
  await open(page);
  await wheelReady(page);
  await page.keyboard.press("ArrowRight");
  await clearEvents(page);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Brass Lantern" })).toBeVisible();
  expect(await events(page, "navigate")).toEqual([["/library/app/1001"]]);
  expect(await events(page, "RunGame")).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(title(page)).toHaveText("BRASS LANTERN");
});

test("“Ⓐ launches the game” on: Ⓐ runs it, Ⓧ opens its page", async ({ page }) => {
  await open(page, { aLaunches: true });
  await wheelReady(page);
  await clearEvents(page);
  await page.keyboard.press("Enter");
  await expect.poll(() => events(page, "RunGame")).toEqual([["1000", "", -1, 100]]);
  expect(await events(page, "navigate")).toEqual([]);
  await page.keyboard.press("x");
  await expect.poll(() => events(page, "navigate")).toEqual([["/library/app/1000"]]);
});

test("Ⓐ on a game that isn't installed opens its page (Install), never RunGame", async ({ page }) => {
  await open(page, { aLaunches: true, baseView: "base:all", sortMode: "alpha" });
  await wheelReady(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight"); // Aether, Brass, Cinder, Dune Courier
  await expect(title(page)).toHaveText("DUNE COURIER");
  await clearEvents(page);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Install")).toBeVisible();
  expect(await events(page, "RunGame")).toEqual([]);
});

test("Ⓨ roulette lands on a game; Ⓐ mid-spin never launches the game in flight", async ({ page }) => {
  await open(page, { aLaunches: true });
  await wheelReady(page);
  await clearEvents(page);
  await page.keyboard.press("y");
  await expect(page.getByText("Picking today's game…")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Today's game: /)).toBeVisible({ timeout: 15000 });
  expect(await events(page, "RunGame")).toEqual([]);
  const landed = (await page.getByText(/Today's game: /).textContent())!.split("Today's game: ")[1];
  await expect(title(page)).toHaveText(landed.toUpperCase());
});

test("trackpad circle spins the wheel, with a haptic tick on that pad", async ({ page }) => {
  await open(page);
  await wheelReady(page);
  await expect.poll(() => events(page, "analog:register"), { timeout: 5000 }).toHaveLength(1); // circle input on once the wheel settles
  await clearEvents(page);
  await page.evaluate(() => (window as any).mock.circle(130)); // 40° per game → 3 steps: Aether → Brass → RetroArch → Cinder
  await expect(title(page)).toHaveText("CINDER VALE");
  expect((await events(page, "haptic")).length).toBeGreaterThan(3);
});

test("a game installed meanwhile shows up when Steam's window regains focus, selection kept", async ({ page }) => {
  await open(page);
  await wheelReady(page);
  await page.evaluate(() => {
    const now = Math.floor(Date.now() / 1000);
    (window as any).mock.apps.push({ appid: 4242, app_type: 1, display_name: "Fresh Install", installed: true, rt_last_time_played: now + 60 });
  });
  await page.waitForTimeout(10_500); // the list read at start-up counts as fresh for LIBRARY_REFRESH_MS
  await page.evaluate(() => (window.dispatchEvent(new Event("blur")), window.dispatchEvent(new Event("focus"))));
  await page.waitForTimeout(1200); // WINDOW_REFOCUS_DELAY_MS
  await expect(title(page)).toHaveText("AETHER DRIFT"); // still on the game you were on
  await page.keyboard.press("ArrowLeft");
  await expect(title(page)).toHaveText("FRESH INSTALL"); // the new one, most recent first
});

test("L1 / R1 switch to the assigned views", async ({ page }) => {
  await open(page, { r1View: "favorite", viewAnim: false });
  await wheelReady(page);
  await page.keyboard.press("e");
  await expect(page.getByText("★ Favorites")).toBeVisible();
  await expect(title(page)).toHaveText("RETROARCH"); // most recent of the favorites
  await page.keyboard.press("q");
  await expect(title(page)).toHaveText("AETHER DRIFT");
});

test("a setting changed in Quick Access survives a reload (saved by main.py)", async ({ page }) => {
  await open(page, undefined, "?qam");
  const toggle = qam(page).getByRole("switch", { name: "Ⓐ launches the game" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(600); // the settings write is debounced
  await page.reload();
  await page.waitForFunction(() => (window as any).mock?.ready);
  await expect(qam(page).getByRole("switch", { name: "Ⓐ launches the game" })).toHaveAttribute("aria-checked", "true");
});

const DIGEST = "b".repeat(64);
const release = (digest: string | null) => ({
  tag_name: "v9.9.9",
  html_url: "https://github.com/justinca92/spindeck/releases/tag/v9.9.9",
  assets: [{ name: "spindeck-9.9.9.zip", browser_download_url: "https://github.com/justinca92/spindeck/releases/download/v9.9.9/spindeck-9.9.9.zip", ...(digest ? { digest: `sha256:${digest}` } : {}) }],
});

test("in-panel update: Decky gets the release zip with GitHub's sha256", async ({ page }) => {
  await page.route("https://api.github.com/**", (r) => r.fulfill({ json: release(DIGEST) }));
  await open(page, undefined, "?qam");
  await qam(page).getByText("Check for updates").click();
  await qam(page).getByText("Update to v9.9.9").click();
  await expect.poll(() => events(page, "decky")).toEqual([
    ["utilities/install_plugin", "https://github.com/justinca92/spindeck/releases/download/v9.9.9/spindeck-9.9.9.zip", "Spindeck", "9.9.9", DIGEST, 2],
  ]);
  expect((await events(page, "backend")).flat()).toContain("prepare_update");
});

test("update channel: Stable ignores pre-releases, Pre-release offers them (and is saved)", async ({ page }) => {
  const asset = (v: string) => ({ name: `spindeck-${v}.zip`, browser_download_url: `https://github.com/justinca92/spindeck/releases/download/v${v}/spindeck-${v}.zip`, digest: `sha256:${DIGEST}` });
  const stable = { tag_name: "v1.4.1", assets: [asset("1.4.1")] };
  const rc = { tag_name: "v9.9.9-rc.1", prerelease: true, assets: [asset("9.9.9-rc.1")] };
  await page.route("https://api.github.com/**", (r) => r.fulfill({ json: r.request().url().endsWith("/latest") ? stable : [rc, stable] }));
  await open(page, undefined, "?qam");
  await qam(page).getByText("Check for updates").click();
  await expect(qam(page).getByText(/You're up to date/)).toBeVisible();
  await qam(page).locator(".field", { hasText: "Update channel" }).click(); // Stable → Pre-release
  await expect(qam(page).getByText("Pre-release (early, less tested)")).toBeVisible();
  await expect(qam(page).getByText(/You're up to date/)).toHaveCount(0); // the old answer is cleared
  await qam(page).getByText("Check for updates").click();
  await expect(qam(page).getByText("Update to v9.9.9-rc.1")).toBeVisible();
  await expect.poll(async () => (await backend(page, "get_settings"))?.updateChannel, { timeout: 3000 }).toBe("prerelease");
});

test("in-panel update without a digest: refused, manual install suggested", async ({ page }) => {
  await page.route("https://api.github.com/**", (r) => r.fulfill({ json: release(null) }));
  await open(page, undefined, "?qam");
  await qam(page).getByText("Check for updates").click();
  await qam(page).getByText("Update to v9.9.9").click();
  await expect(qam(page).getByText("Install the new zip from GitHub")).toBeVisible();
  expect(await events(page, "decky")).toEqual([]);
});
