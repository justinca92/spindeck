// "Reload the wheel" from the panel: bumps a counter the wheel is keyed on, so
// it mounts fresh (and forgets its remembered games). Runtime only.
import { useEffect, useState } from "react";

let generation = 0;
const listeners = new Set<() => void>();
const resetHooks = new Set<() => void>();

export function requestWheelReset() {
  for (const f of resetHooks) f();
  generation++;
  for (const l of listeners) l();
}

/** Called on every reset, before the wheel remounts (e.g. to clear remembered state). */
export function onWheelReset(f: () => void) {
  resetHooks.add(f);
}

export function useWheelGeneration(): number {
  const [g, setG] = useState(generation);
  useEffect(() => {
    const l = () => setG(generation);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return g;
}
