// Side layout "Hero art v1.3.0 style": the 1.3.0 art (centred, at the edge, 72% side fade,
// single backdrop) when on, the current one when off; the switch shows in the panel
// only for the side layout.
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : f2.endsWith(".png") ? "image/png" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8783);
const b = await chromium.launch(); let fail = 0;
for (const mode of ["side", "side-legacy"]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8783/#" + mode); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const fg = [...document.querySelectorAll(".dw-hero")].pop(); return fg ? { top: fg.style.top, left: fg.style.left, right: fg.style.right, mask72: / 72%/.test(fg.style.webkitMaskImage), layers: document.querySelectorAll(".dw-hero").length } : null; });
  const ok = mode === "side" ? r?.top === "38%" && !r.mask72 && r.layers === 3 : r?.top === "50%" && r.mask72 && r.layers === 2;
  if (!ok || errs.length) fail++;
  console.log(ok ? "PASS" : "FAIL", mode, JSON.stringify(r), errs);
  await p.screenshot({ path: `out/hero-${mode}.png` });
  await p.close();
}
for (const mode of ["qam", "qam-bottom"]) {
  const p = await b.newPage(); await p.goto("http://localhost:8783/#" + mode); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(600);
  const shown = await p.evaluate(() => [...document.querySelectorAll('[data-c="ToggleField"]')].some((e) => /v1\.3\.0/.test(e.getAttribute("data-label") || "")));
  const ok = mode === "qam" ? shown : !shown; if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", mode, "toggle shown:", shown);
  await p.close();
}
await b.close(); srv.close(); process.exit(fail ? 1 : 0);
