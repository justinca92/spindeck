// Lets `node --test` import src/*.ts directly (Node 24 strips the types itself):
// extensionless relative imports resolve to .ts, and Decky's / React's runtime
// modules (provided by Steam at runtime) resolve to the small stubs next to this file.
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
console.debug = () => {}; // plugin debug logging: noise in test output
