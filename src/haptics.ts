import { findModuleExports } from "./webpack";
import { debug } from "./log";
// Wheel haptic "tick", played exactly like Steam's own radial menu does.
//
// Confirmed on device (SteamOS 3.8, Steam client 2026-09):
//  - Steam's haptic service (module containing "PlaySteamDeckHaptic" and
//    "Playing legacy haptics") exposes PlaySteamDeckHaptic(location, type, intensity, dBGain)
//    and finds the Steam Deck controller itself.
//  - Haptic type enum: { Tick: 1, Click: 2 }.
//  - Location values, tested one by one on device: 1 = RIGHT pad, 2 = LEFT pad,
//    3 and 4 = no vibration. (An earlier guess of 3/4 from code usage was wrong.)
//  - The radial menu ticks with type Tick, intensity 1, gain -12 dB.
// Any error disables haptics for the session (no repeated exceptions).

// Location values differ by mode (both tested one by one on device):
//   normal mode:        1 = right, 2 = left
//   keyboard action set: 0 = left, 1 = right, 2 = both
export const HAPTIC_LOCATION = { left: 2, right: 1 } as const;
export const HAPTIC_LOCATION_KEYBOARD = { left: 0, right: 1 } as const;

let service: any | null | undefined;
let broken = false;

function findService(): any | null {
  if (service !== undefined) return service;
  service = null;
  try {
    const mod = findModuleExports("PlaySteamDeckHaptic", "Playing legacy haptics");
    for (const v of Object.values(mod ?? {})) {
      if (v && typeof (v as any).PlaySteamDeckHaptic === "function") return (service = v);
    }
    debug("haptic", "haptic service not found");
  } catch (e) {
    debug("haptic", "search failed", e);
  }
  return service;
}

/** Strength level 1–9 → dB gain: 1 = -24 dB … 5 = -12 dB (Steam's radial menu) … 9 = 0 dB. */
export const levelToDb = (level: number) => -24 + (Math.max(1, Math.min(9, Math.round(level))) - 1) * 3;

const TICK = 1;

/**
 * One wheel haptic click: Steam's own radial-menu haptic (Tick), at the chosen
 * strength. Compared on device against Click, a heavier Click and low-level
 * TriggerHapticPulse bursts (0.9.13–0.9.16); Tick felt best.
 * @param keyboardMode true while the keyboard action set is on (circle input);
 *   location values are different in that mode (see table above).
 */
export function wheelTick(pad: "left" | "right", keyboardMode = false, level = 5) {
  if (broken) return;
  const s = findService();
  if (!s) return;
  try {
    const loc = keyboardMode ? HAPTIC_LOCATION_KEYBOARD[pad] : HAPTIC_LOCATION[pad];
    s.PlaySteamDeckHaptic(loc, TICK, 1, levelToDb(level));
  } catch (e) {
    broken = true;
    debug("haptic", "disabled after error", e);
  }
}
