// Backend calls go to globalThis.backend[name] (set by each test); every call is recorded.
export const calls = [];
export const callable =
  (name) =>
  async (...args) => {
    calls.push([name, ...args]);
    const fn = globalThis.backend?.[name];
    if (!fn) throw new Error(`no backend stub for ${name}`);
    return fn(...args);
  };
export const definePlugin = (fn) => fn;
export const routerHook = { addPatch() {}, removePatch() {}, addRoute() {}, removeRoute() {} };
