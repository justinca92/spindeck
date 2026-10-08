// #2: another plugin (SteamGridDB "uniform featured") patching the home route
// before or after Spindeck, with the home wheel on and off. Must render, never React #130.
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8779);
const b = await chromium.launch();
let fail = 0;
for (const mode of ["sgdb-after", "sgdb-before", "sgdb-after-off", "sgdb-before-off", "decky-spindeck-first", "decky-sgdb-first", "decky-spindeck-first-off", "decky-sgdb-first-off", "decky-pingpong"]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:8779/#" + mode); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ wheel: !!document.querySelector("[data-spindeck-wheel]"), original: !!document.getElementById("orighome"), sgdbHit: window.__sgdbHit || 0, rivalMoves: window.__rivalMoves || 0 }));
  // Decky modes: SteamGridDB's patch must also have reached Steam's real recents row.
  // Ping-pong: Spindeck gives up after a few moves and shows Steam's home; no loop, no error.
  const want = mode === "decky-pingpong" ? r.original && !r.wheel && r.rivalMoves < 10 : (mode.endsWith("-off") ? r.original && !r.wheel : r.wheel) && (!mode.startsWith("decky") || r.sgdbHit > 0);
  const ok = want && !errs.some((e) => /#130|invalid|Element type|Cannot read properties/i.test(e));
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", mode, JSON.stringify(r), errs.slice(0, 2));
  await p.close();
}
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
