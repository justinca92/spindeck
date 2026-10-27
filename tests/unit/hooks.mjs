import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const STUBS = {
  react: new URL("./stubs/react.mjs", import.meta.url).href,
  "@decky/api": new URL("./stubs/decky-api.mjs", import.meta.url).href,
  "@decky/ui": new URL("./stubs/decky-ui.mjs", import.meta.url).href,
};

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?(\?|$)/.test(specifier) && context.parentURL) {
    const [path, query] = specifier.split("?");
    const url = new URL(path + ".ts", context.parentURL);
    if (existsSync(fileURLToPath(url))) return { url: url.href + (query ? "?" + query : ""), shortCircuit: true };
  }
  return next(specifier, context);
}
