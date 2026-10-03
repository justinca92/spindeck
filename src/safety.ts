// Stability helpers: an error boundary that falls back to Steam's own UI, and a
// teardown registry so unloading the plugin always leaves Steam as it was —
// even if React doesn't get to run every effect cleanup.
import React from "react";
import { debug } from "./log";

const R: any = React;

/**
 * Renders `children`; if anything inside throws while rendering (e.g. a Steam
 * update changed something we rely on), renders `fallback` instead — for the
 * home that's Steam's original home, untouched.
 */
class SafeBoundaryImpl extends R.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    debug("safety", "falling back to Steam's UI after an error", error);
  }
  render() {
    const p: any = (this as any).props;
    return (this as any).state.failed ? p.fallback ?? null : p.children;
  }
}

export const SafeBoundary = SafeBoundaryImpl as unknown as (p: { fallback?: any; children?: any }) => any;

const teardowns = new Set<() => void>();

/** Register something that must be undone when the plugin unloads. Returns an unregister function. */
export function onTeardown(fn: () => void): () => void {
  teardowns.add(fn);
  return () => {
    teardowns.delete(fn);
  };
}

/** Run every registered teardown (each at most once, errors isolated). */
export function teardownAll() {
  for (const fn of [...teardowns]) {
    teardowns.delete(fn);
    try {
      fn();
    } catch (e) {
      debug("safety", "teardown failed", e);
    }
  }
}

/** Run `fn`, returning `fallback` if it throws (logged). */
export function attempt<T>(area: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    debug(area, "failed", e);
    return fallback;
  }
}
