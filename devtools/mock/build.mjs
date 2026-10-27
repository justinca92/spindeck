// Builds the mock: out/plugin.js (the plugin from ../../src, wired exactly like
// build/build.ts — same shims, same build-time values) and out/mock.js (the fake
// Steam / Decky shell, with its own React from node_modules).
// `node build.mjs --watch` rebuilds both on every change.
import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const here = fileURLToPath(new URL("./", import.meta.url));
const json = (f) => JSON.parse(readFileSync(root + f, "utf8"));
const shim = (f) => root + "build/shims/" + f;

const plugin = {
  entryPoints: [root + "src/index.tsx"],
  outfile: here + "out/plugin.js",
  bundle: true,
  format: "esm",
  target: "es2020",
  jsx: "transform",
  jsxFactory: "window.SP_REACT.createElement",
  jsxFragment: "window.SP_REACT.Fragment",
  alias: { react: shim("react.js"), "@decky/ui": shim("decky-ui.js"), "@decky/api": shim("decky-api.js") },
  define: { __PLUGIN_NAME__: JSON.stringify(json("plugin.json").name), __PLUGIN_VERSION__: JSON.stringify(json("package.json").version) },
  logLevel: "info",
};
const mock = {
  entryPoints: [here + "mock.jsx"],
  outfile: here + "out/mock.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  external: ["./plugin.js"], // loaded at runtime, after the fake Steam globals exist
  jsx: "automatic",
  // Production React, like Steam's: Decky's route patching writes to elements, which development React freezes.
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  for (const o of [plugin, mock]) await (await esbuild.context(o)).watch();
} else {
  await Promise.all([esbuild.build(plugin), esbuild.build(mock)]);
}
