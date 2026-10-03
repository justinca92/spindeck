// Debug logging to Steam's console (CEF devtools), never to the UI.
export function debug(area: string, ...args: unknown[]) {
  try {
    console.debug(`[Spindeck:${area}]`, ...args);
  } catch {
    /* ignore */
  }
}
