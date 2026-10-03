import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve("out");
const srv = http.createServer((q, r) => { const f2 = path.join(dir, (q.url === "/" ? "index.html" : q.url).split("?")[0].split("#")[0]); r.setHeader("content-type", f2.endsWith(".js") ? "text/javascript" : "text/html"); fs.createReadStream(f2).on("error", () => { r.statusCode = 404; r.end(); }).pipe(r); }).listen(8772);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://localhost:8772/"); await p.waitForFunction(() => window.__start); await p.evaluate(() => window.__start()); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fs = [...document.querySelectorAll("[data-focusable]")];
  const wheel = fs.find((e) => e.__props?.onOptionsButton); const sec = fs.find((e) => e.__props?.onButtonDown && !e.__props?.onOptionsButton);
  wheel.__props.onGamepadDirection({ detail: { button: 10 }, preventDefault() {}, stopPropagation() {} }); await sleep(1300);
  const out = [["enter (What's New selected) →", document.activeElement.textContent]];
  // L1/R1 to Friends: Steam marks it selected (pill background)
  document.getElementById("friends").style.background = "#555";
  const row2 = [...document.querySelectorAll("button")].find((b) => b.textContent === "row2"); row2.focus();
  sec.__props.onButtonDown({ detail: { button: 2 }, preventDefault() {}, stopPropagation() {} }); await sleep(50);
  out.push(["Ⓑ deep on Friends →", document.activeElement.textContent]);
  const ev2 = { detail: { button: 2 }, p: false, preventDefault() { this.p = true; }, stopPropagation() {} }; sec.__props.onButtonDown(ev2);
  out.push(["Ⓑ again consumed (false = Steam menu)", ev2.p]);
  return out;
});
console.log(r.map((x) => x.join(" ")).join("\n")); await b.close(); srv.close();
