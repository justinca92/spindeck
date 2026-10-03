// Steam's UI modules aren't exported, so they are found inside its webpack
// bundle by *content* (minified names change between client updates).
let req: any;

function getRequire(): any {
  if (req) return req;
  try {
    const chunk = (globalThis as any).webpackChunksteamui;
    chunk?.push([[Math.random()], {}, (r: any) => (req = r)]);
  } catch {
    /* bundle layout changed: callers fall back */
  }
  return req;
}

/** Exports of the first module whose source contains every one of `needles`. */
export function findModuleExports(...needles: string[]): Record<string, any> | null {
  const r = getRequire();
  if (!r?.m) return null;
  for (const id of Object.keys(r.m)) {
    try {
      const src = String(r.m[id]);
      if (needles.every((n) => src.includes(n))) return r(id) ?? null;
    } catch {
      /* skip modules that can't be read or loaded */
    }
  }
  return null;
}
