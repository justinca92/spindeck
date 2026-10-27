import { test } from "node:test";
import assert from "node:assert/strict";
import { calls } from "@decky/api";

globalThis.__PLUGIN_VERSION__ = "1.4.1";
globalThis.window = globalThis;
globalThis.backend = { prepare_update: async () => true };
const { newer, checkNow, useUpdateCheck, startUpdate } = await import("../../src/updater.ts");

const DIGEST = "a".repeat(64);
const ZIP = "https://github.com/justinca92/spindeck/releases/download/v1.5.0/spindeck-1.5.0.zip";
function release({ tag = "v1.5.0", assets = [{ name: "spindeck-1.5.0.zip", browser_download_url: ZIP, digest: `sha256:${DIGEST}` }], ok = true } = {}) {
  globalThis.fetch = async () => ({ ok, status: ok ? 200 : 403, json: async () => ({ tag_name: tag, assets, html_url: "https://github.com/x" }) });
}

test("newer compares numerically, part by part", () => {
  assert.equal(newer("1.10.0", "1.9.2"), true);
  assert.equal(newer("1.4.1", "1.4.1"), false);
  assert.equal(newer("1.4", "1.4.1"), false);
  assert.equal(newer("2.0.0", "10.0.0"), false);
});

test("newer: a release beats its own pre-releases, pre-releases count up", () => {
  assert.equal(newer("1.5.0", "1.5.0-rc.1"), true, "rc users are offered the stable release");
  assert.equal(newer("1.5.0-rc.1", "1.5.0"), false);
  assert.equal(newer("1.5.0-rc.1", "1.4.1"), true);
  assert.equal(newer("1.5.0-rc.2", "1.5.0-rc.1"), true);
  assert.equal(newer("1.5.0-rc.10", "1.5.0-rc.9"), true);
  assert.equal(newer("1.5.0-rc.1", "1.5.0-rc.1"), false);
  assert.equal(newer("1.5.1-rc.1", "1.5.0"), true);
});

test("check: a newer release is offered with its GitHub digest", async () => {
  release();
  await checkNow();
  const st = useUpdateCheck();
  assert.equal(st.kind, "available");
  assert.equal(st.info.version, "1.5.0");
  assert.equal(st.info.hash, DIGEST);
  assert.equal(st.info.url, ZIP);
});

test("check: same or older release → up to date", async () => {
  release({ tag: "v1.4.1" });
  await checkNow();
  assert.deepEqual(useUpdateCheck(), { kind: "latest", version: "1.4.1" });
});

test("check: API error or no plugin zip → error", async () => {
  release({ ok: false });
  await checkNow();
  assert.equal(useUpdateCheck().kind, "error");
  release({ assets: [{ name: "source.tar.gz", browser_download_url: ZIP }] });
  await checkNow();
  assert.equal(useUpdateCheck().kind, "error");
});

const rel = (tag, extra = {}) => ({
  tag_name: tag,
  html_url: `https://github.com/justinca92/spindeck/releases/tag/${tag}`,
  assets: [{ name: `spindeck-${tag.slice(1)}.zip`, browser_download_url: `https://github.com/justinca92/spindeck/releases/download/${tag}/spindeck-${tag.slice(1)}.zip`, digest: `sha256:${DIGEST}` }],
  ...extra,
});
function serve(latest, list) {
  const urls = [];
  globalThis.fetch = async (url) => (urls.push(url), { ok: true, status: 200, json: async () => (url.endsWith("/latest") ? latest : list) });
  return urls;
}

test("stable channel: only GitHub's latest release, never a pre-release", async () => {
  const urls = serve(rel("v1.4.1"), [rel("v1.5.0-rc.1", { prerelease: true }), rel("v1.4.1")]);
  await checkNow("stable");
  assert.deepEqual(useUpdateCheck(), { kind: "latest", version: "1.4.1" });
  assert.match(urls[0], /\/releases\/latest$/);
});

test("pre-release channel: the newest release, pre-releases included; drafts skipped", async () => {
  const urls = serve(rel("v1.4.1"), [rel("v9.0.0", { draft: true }), rel("v1.5.0-rc.1", { prerelease: true }), rel("v1.4.1")]);
  await checkNow("prerelease");
  const st = useUpdateCheck();
  assert.equal(st.kind, "available");
  assert.equal(st.info.version, "1.5.0-rc.1");
  assert.equal(st.info.hash, DIGEST);
  assert.match(urls[0], /\/releases\?per_page=\d+$/);
});

test("pre-release channel moves on to the stable release once it's out", async () => {
  serve(rel("v1.5.0"), [rel("v1.5.0"), rel("v1.5.0-rc.2", { prerelease: true }), rel("v1.5.0-rc.1", { prerelease: true })]);
  await checkNow("prerelease");
  assert.equal(useUpdateCheck().info.version, "1.5.0");
});

function decky() {
  const installs = [];
  globalThis.DeckyBackend = { call: async (...a) => installs.push(a) };
  calls.length = 0;
  return installs;
}
const info = { version: "1.5.0", url: ZIP, hash: DIGEST, page: "" };

test("update: hands Decky the zip with its hash, after marking the update", async () => {
  const installs = decky();
  assert.equal(await startUpdate(info), true);
  assert.deepEqual(installs, [["utilities/install_plugin", ZIP, "Spindeck", "1.5.0", DIGEST, 2]]);
  assert.deepEqual(calls.map(([n]) => n), ["prepare_update"], "settings protected before the uninstall");
});

test("update: refused without a digest (Decky would skip its check)", async () => {
  const installs = decky();
  assert.equal(await startUpdate({ ...info, hash: "" }), false);
  assert.deepEqual(installs, []);
});

test("update: refused from anywhere but this repo's releases", async () => {
  const installs = decky();
  assert.equal(await startUpdate({ ...info, url: "https://example.com/spindeck-1.5.0.zip" }), false);
  assert.equal(await startUpdate({ ...info, url: "https://github.com/someone/spindeck/releases/download/v1/spindeck-1.5.0.zip" }), false);
  assert.deepEqual(installs, []);
});
