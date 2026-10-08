// Bottom layout screenshots (rotating pad on each side): custom text vertically
// level with the game title away from the wheel, Ⓨ pill right under it.
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : f2.endsWith(".png") ? "image/png" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8781);
const b = await chromium.launch();
for (const mode of ["bottom", "bottom-right"]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8781/#" + mode); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const pill = [...document.querySelectorAll("div")].find((d) => d.style.borderRadius === "999px");
    const mid = (el) => { const b = el.getBoundingClientRect(); return Math.round((b.top + b.bottom) / 2); };
    const om = document.querySelector('[data-dw="owner-main"]'), ti = document.querySelector('[data-dw="title"]');
    const info = document.querySelector('[data-dw="info-slot"]'), sub = document.querySelector('[data-dw="owner"]').lastElementChild;
    return { owner: box(document.querySelector('[data-dw="owner"]')), title: box(ti), pill: box(pill), mainMidY: mid(om), titleMidY: mid(ti), subMidY: mid(sub), infoMidY: mid(info) };
  });
  console.log(mode, JSON.stringify(r), "errors", errs);
  if (r.mainMidY !== r.titleMidY) { console.log("FAIL: main text not level with the game title"); process.exitCode = 1; }
  const gap = r.pill[1] - r.owner[3], sameSide = mode === "bottom" ? r.pill[2] === r.owner[2] : r.pill[0] === r.owner[0];
  if (gap < 8 || gap > 16 || !sameSide) { console.log("FAIL: Today's game pill not right under the custom text", gap, sameSide); process.exitCode = 1; }
  await p.screenshot({ path: `out/${mode}.png` });
  await p.close();
}
await b.close(); srv.close();
