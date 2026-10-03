import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8771);
const b = await chromium.launch();
// 1) unload cleanup without React unmounting
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8771/"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1800);
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const wheel = [...document.querySelectorAll("[data-focusable]")].find((e) => e.__props?.onOptionsButton);
    const before = { kb: [...window.__ks] };
    wheel.__props.onGamepadDirection({ detail: { button: 10 }, preventDefault() {}, stopPropagation() {} }); await sleep(1300);
    const tabs = document.getElementById("tabs"), hdr = document.getElementById("steamhdr");
    const during = { cleared: document.querySelectorAll(".spindeck-clear-header").length, style: !!document.getElementById("spindeck-clear-header-style"), spacer: document.querySelectorAll("[data-spindeck-spacer]").length, tabsInline: tabs.getAttribute("style") };
    window.__ks.length = 0;
    window.__plugin.onDismount();
    const recentRow = [...document.querySelectorAll("button")].find((b) => b.textContent === "recent").parentElement;
    const after = { cleared: document.querySelectorAll(".spindeck-clear-header").length, style: !!document.getElementById("spindeck-clear-header-style"), spacer: document.querySelectorAll("[data-spindeck-spacer]").length, tabsInline: tabs.getAttribute("style"), hdrBg: getComputedStyle(hdr).backgroundColor, recentVisible: getComputedStyle(recentRow).visibility, kbCalls: [...window.__ks] };
    return { before, during, after };
  });
  console.log("UNLOAD", JSON.stringify(r, null, 1), "errors", errs);
  await p.close();
}
// 2) crash → original home
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8771/#crash"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => ({ originalShown: !!document.getElementById("orighome"), pluginRoot: !!document.querySelector("[data-spindeck-root]"), rootChildren: document.getElementById("root").children.length }));
  console.log("CRASH", JSON.stringify(r), "pageerrors", errs.length);
  await p.close();
}
// 3) unload while rubbing input is live on the wheel
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto("http://localhost:8771/"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => { const live = [...window.__ks]; window.__ks.length = 0; window.__plugin.onDismount(); return { liveBefore: live.slice(-3), afterDismount: [...window.__ks] }; });
  console.log("UNLOAD-ON-WHEEL", JSON.stringify(r));
  await p.close();
}
// 4) unrecognised home layout: no errors, screens still switch
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8771/#flat"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fs = [...document.querySelectorAll("[data-focusable]")];
    const wheel = fs.find((e) => e.__props?.onOptionsButton); const sec = fs.find((e) => e.__props?.onButtonDown && !e.__props?.onOptionsButton);
    const box = wheel.closest("[data-spindeck-wheel]").parentElement.parentElement;
    wheel.__props.onGamepadDirection({ detail: { button: 10 }, preventDefault() {}, stopPropagation() {} }); await sleep(1500);
    const down = box.style.top;
    sec.__props.onButtonDown({ detail: { button: 2 }, preventDefault() {}, stopPropagation() {} });
    sec.__props.onGamepadDirection({ detail: { button: 9 }, preventDefault() {}, stopPropagation() {} }); await sleep(900);
    return { down, after: box.style.top };
  });
  console.log("FLAT", JSON.stringify(r), "pageerrors", errs);
  await p.close();
}
await b.close(); srv.close();
