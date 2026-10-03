import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f = path.join(dir, q.url === "/" ? "index.html" : q.url); const f2 = f.split("?")[0]; r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : f2.endsWith(".png") ? "image/png" : "text/html"); return fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); fs.createReadStream(f).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8766);
const b = await chromium.launch();
const out = [];
for (let run = 0; run < 1; run++) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto("http://localhost:8766/" + (process.env.HASH || ""));
  await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start());
  await p.waitForTimeout(1200);
  const cdp = await p.context().newCDPSession(p); await cdp.send("Performance.enable");
  const get = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const m0 = await get();
  const selName = await p.evaluate(async () => {
    const wheel = [...document.querySelectorAll("[data-focusable]")].find((e) => e.__props?.onOptionsButton);
    let heroMounts = 0, renders = 0;
    new MutationObserver((ms) => { for (const m of ms) { for (const n of m.addedNodes) if (n.classList?.contains("dw-hero")) heroMounts++; if (m.type === "attributes") renders++; } }).observe(wheel, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    window.__hm = () => [heroMounts, renders];
    const ev = (button) => ({ detail: { button }, preventDefault() {}, stopPropagation() {} });
    for (let i = 0; i < 40; i++) { wheel.__props.onGamepadDirection(ev(12)); await new Promise((r) => setTimeout(r, 20)); }
    await new Promise((r) => setTimeout(r, 500));
    return [...wheel.querySelectorAll("span")].find((s) => /·/.test(s.textContent))?.textContent + " heroMounts=" + window.__hm()[0] + " styleWrites=" + window.__hm()[1];
  });
  const m1 = await get();
  out.push({ sel: selName, task: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), script: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000), style: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000), layout: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000) });
  await p.close();
}
console.log(JSON.stringify(out));
await b.close(); srv.close();
