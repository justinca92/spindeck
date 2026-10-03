import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8775);
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8775/#pulse"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  window.__pulses.length = 0;
  // clockwise quarter circle on the left pad (type 48), 2° per message, 8 ms apart
  for (let deg = 90; deg >= 0; deg -= 1) {
    const a = (deg * Math.PI) / 180;
    window.__analog(0, 48, false, 0.8 * Math.cos(a), 0.8 * Math.sin(a));
    await new Promise((r) => setTimeout(r, 8));
  }
  await new Promise((r) => setTimeout(r, 400));
  const sel = [...document.querySelectorAll("span")].find((s) => /·/.test(s.textContent))?.textContent;
  return { haptics: window.__pulses.length, first: window.__pulses[0], sel };
});
console.log(JSON.stringify(r)); await b.close(); srv.close();
