// Offline build with Bun (no npm needed): `bun build/build.ts`
// Produces dist/index.js in the ES-module format Decky Loader imports.
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dir, "..");
const pluginName: string = JSON.parse(readFileSync(resolve(root, "plugin.json"), "utf8")).name;
const shim = (f: string) => resolve(import.meta.dir, "shims", f);

const result = await Bun.build({
  entrypoints: [resolve(root, "src/index.tsx")],
  outdir: resolve(root, "dist"),
  naming: "index.js",
  format: "esm",
  target: "browser",
  minify: false,
  define: { __PLUGIN_NAME__: JSON.stringify(pluginName) },
  plugins: [
    {
      name: "decky-externals",
      setup(b) {
        b.onResolve({ filter: /^react$/ }, () => ({ path: shim("react.js") }));
        b.onResolve({ filter: /^@decky\/ui$/ }, () => ({ path: shim("decky-ui.js") }));
        b.onResolve({ filter: /^@decky\/api$/ }, () => ({ path: shim("decky-api.js") }));
      },
    },
  ],
});
if (!result.success) {
  for (const l of result.logs) console.error(l);
  process.exit(1);
}
console.log("built", result.outputs.map((o) => o.path).join(", "));
