import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8774);
const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:8774/#qam"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1200);
const r = await p.evaluate(() => [...document.querySelectorAll("[data-label]")].map((e) => e.dataset.label + (e.dataset.desc ? " — " + e.dataset.desc : "")).join("\n"));
console.log(r); console.log("errors", errs); await b.close(); srv.close();
