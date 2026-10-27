// "Reload the wheel" from the panel: bumps a counter the wheel is keyed on, so
// it mounts fresh (and forgets its remembered games). Runtime only.
import { useSyncExternalStore } from "react";

let generation = 0;
const listeners = new Set<() => void>();
let onReset = () => {};

export function requestWheelReset() {
  onReset();
  generation++;
  for (const l of listeners) l();
}

/** Called on every reset, before the wheel remounts (the wheel clears its remembered games). */
export function onWheelReset(f: () => void) {
  onReset = f;
}

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export const useWheelGeneration = () => useSyncExternalStore(subscribe, () => generation);
