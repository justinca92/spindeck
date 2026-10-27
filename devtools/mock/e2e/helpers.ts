import { expect, type Page } from "@playwright/test";

const ORIGIN = "http://127.0.0.1:5191";

/** Fresh settings in the real backend (main.py), optionally seeded, then the mock home loaded. */
export async function open(page: Page, settings?: Record<string, unknown>, query = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.request.post("/dev/reset", { headers: { origin: ORIGIN } });
  if (settings) await backend(page, "set_settings", { settingsVersion: 7, ...settings });
  await page.goto("/" + query);
  await page.waitForFunction(() => (window as any).mock?.ready);
  return errors;
}

export async function backend(page: Page, method: string, ...args: unknown[]) {
  const r = await page.request.post(`/api/${method}`, { headers: { origin: ORIGIN }, data: args });
  expect(r.ok()).toBe(true);
  return (await r.json()).result;
}

export const title = (page: Page) => page.locator('[data-dw="title"]');

/** What the plugin asked of Steam / Decky, from the mock's event log. */
export const events = (page: Page, kind: string): Promise<unknown[][]> => page.evaluate((k) => (window as any).mock.events(k), kind);
export const clearEvents = (page: Page) => page.evaluate(() => (window as any).mock.clear());

/** The wheel has focus and is ready for input (it ignores ▲/▼ right after arriving). */
export async function wheelReady(page: Page) {
  await expect(title(page)).toBeVisible();
  await page.waitForTimeout(400);
}

/** On the home wheel ▲ / ▼ are ignored this long after arriving (held D-pad guard, ARRIVAL_IGNORE_MS). */
export async function homeReady(page: Page) {
  await expect(title(page)).toBeVisible();
  await page.waitForTimeout(900);
}
