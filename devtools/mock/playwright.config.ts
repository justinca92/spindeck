import { defineConfig } from "@playwright/test";

const PORT = 5191; // not the dev port, so a running `npm run serve` doesn't clash

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // one backend settings file
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: "chromium", viewport: { width: 1280, height: 800 }, trace: "retain-on-failure" },
  webServer: {
    command: `node build.mjs && python dev-server.py --port ${PORT} --data .dev-data/e2e`,
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: !process.env.CI,
  },
});
