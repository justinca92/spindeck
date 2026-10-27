// Debug logging to Steam's console (CEF devtools), never to the UI.
export const debug = (area: string, ...args: unknown[]) => console.debug(`[Spindeck:${area}]`, ...args);
