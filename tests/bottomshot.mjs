// Bottom layout screenshots (rotating pad on each side): custom text vertically
// centred away from the wheel, Ⓨ pill alone in the bottom corner.
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
    return { owner: box(document.querySelector('[data-dw="owner"]')), title: box(document.querySelector('[data-dw="title"]')), pill: box(pill) };
  });
  console.log(mode, JSON.stringify(r), "errors", errs);
  await p.screenshot({ path: `out/${mode}.png` });
  await p.close();
}
await b.close(); srv.close();
