import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8768);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://localhost:8768/"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bg = (id) => getComputedStyle(document.getElementById(id)).backgroundColor;
  const wheel = [...document.querySelectorAll("[data-focusable]")].find((e) => e.__props?.onOptionsButton);
  const sec = [...document.querySelectorAll("[data-focusable]")].find((e) => e.__props?.onButtonDown && !e.__props?.onOptionsButton);
  const ev = (button) => ({ detail: { button }, preventDefault() {}, stopPropagation() {} });
  const out = [["wheel: hdr", bg("steamhdr"), "tabs", bg("tabs")]];
  wheel.__props.onGamepadDirection(ev(10)); await sleep(1300);
  { const a = getComputedStyle(document.getElementById("tabs"), "::after"); out.push(["blur:", getComputedStyle(document.getElementById("steamhdr")).backdropFilter, getComputedStyle(document.getElementById("tabs")).backdropFilter]); out.push(["sections: hdr", bg("steamhdr"), "tabs", bg("tabs"), "tabsTop", Math.round(document.getElementById("tabs").getBoundingClientRect().top), "after:", a.height, a.backgroundColor, a.content]); }
  { const tabs = document.getElementById("tabs"); const hdr = document.getElementById("steamhdr");
    tabs.className = "react-rewrote-me"; tabs.setAttribute("style", "height: 58px; background: #2a2f38"); hdr.className = "rerender"; hdr.setAttribute("style", hdr.getAttribute("style").replace(/background[^;]*;?/g, "") + ";background:#1b2028");
    await new Promise((r) => requestAnimationFrame(r));
    const a = getComputedStyle(tabs, "::after");
    out.push(["after React rewrite (next frame): hdr", bg("steamhdr"), "tabs", bg("tabs"), "after:", a.height, a.backgroundColor]); }
  sec.__props.onGamepadDirection(ev(9)); await sleep(1300);
  out.push(["back to wheel: hdr", bg("steamhdr"), "tabs", bg("tabs"), "inline:", document.getElementById("tabs").getAttribute("style"), "class:", document.getElementById("tabs").className]); await sleep(2500); out.push(["2.5s later tabs", bg("tabs")]);
  return out;
});
console.log(r.map((x) => x.join(" ")).join("\n")); await b.close(); srv.close();
