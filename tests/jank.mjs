import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8769);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://localhost:8769/"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const wheel = [...document.querySelectorAll("[data-focusable]")].find((e) => e.__props?.onOptionsButton);
  wheel.__props.onGamepadDirection({ detail: { button: 10 }, preventDefault() {}, stopPropagation() {} });
  await sleep(1200);
  const vs = document.getElementById("orighome"); const tabs = document.getElementById("tabs");
  let tabWrites = 0; new MutationObserver(() => tabWrites++).observe(tabs, { attributes: true, attributeFilter: ["style"] });
  const off = vs.scrollTop;
  // Steam-like smooth scroll: down 400px then back up to 40px above the clamp, 20 frames each way
  let corrections = 0, expected = off;
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  for (const target of [off + 400, off - 40]) {
    const start = vs.scrollTop;
    for (let i = 1; i <= 20; i++) {
      expected = Math.round(start + (target - start) * (i / 20));
      vs.scrollTop = expected; await frame();
      if (Math.abs(vs.scrollTop - expected) > 2) corrections++;
    }
  }
  await sleep(400);
  return { corrections, tabWrites, endScroll: vs.scrollTop, off };
});
console.log(JSON.stringify(r)); await b.close(); srv.close();
