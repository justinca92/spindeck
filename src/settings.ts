// Settings live in a JSON file on the Deck (via the Python backend), so they
// survive reboots and Steam client restarts. The backend deletes that file
// when the plugin is uninstalled.
import { callable } from "@decky/api";
import { useEffect, useState } from "react";
import { getLang } from "./locale";

export type SortMode = "recent" | "alpha" | "playtime";
export type PadSide = "left" | "right";

export interface WheelSettings {
  homeEnabled: boolean;   // replace the Steam home screen with the wheel
  ownerText: string;      // bottom-left title, e.g. "j1의 스팀덱"
  subtitleText: string;   // optional second line
  accentColor: string;    // CSS color for highlights
  baseView: string;           // main wheel: "base:installed" / "base:all" or a Steam collection id
  sortMode: SortMode;         // recently played, or A–Z
  // L1 / R1 on the wheel: "" (nothing), "base:all" / "base:installed", or a Steam collection id; each with its own sort.
  l1View: string;
  l1Sort: SortMode;
  r1View: string;
  r1Sort: SortMode;
  viewAnim: boolean;          // L1/R1 swap animation (revolver)
  dockedNoHaptics: boolean;   // no Deck haptics while docked (external display)
  capsuleScale: number;       // capsule art size multiplier (1 = 80×120)
  textScale: number;          // game title size multiplier
  wheelSizePct: number;       // wheel radius as % of screen width
  visibleCount: number;       // how many games fit on screen at once
  heroScale: number;          // sharp hero art width as % of screen width
  soundEnabled: boolean;
  hapticEnabled: boolean;
  hapticLevel: number; // 1–9 (5 = Steam's radial-menu strength); default 7     // tick on the rotating trackpad, like Steam's radial menu
  odometerTurns: number;     // easter egg: total trackpad turns ever spun (finger only)
  settingsVersion: number;    // bumped when a default must be re-applied to saved settings
  rawPadApi: boolean;         // advanced: subscribe to raw controller state (off by default)      // play Steam's UI sound on each wheel step   // hide the original home's top "recent games" row below the wheel
  stepDegrees: number;    // trackpad degrees per wheel step (lower = more sensitive)
  hapticDegrees: number;  // trackpad degrees per haptic click (finer than steps feels like a scroll wheel)
  rotatePad: PadSide;     // which trackpad spins the wheel
  language: "auto" | "ko" | "en"; // UI language; auto = follow Steam
  barLook?: { color: string; image: string; backdrop: string }; // Steam's opaque top bar, learned
}

export const DEFAULTS: WheelSettings = {
  homeEnabled: true,
  ownerText: "나의 스팀덱",
  subtitleText: "",
  accentColor: "#66c0f4",
  baseView: "base:installed",
  sortMode: "recent",
  l1View: "",
  l1Sort: "recent",
  r1View: "",
  r1Sort: "recent",
  viewAnim: true,
  dockedNoHaptics: true,
  capsuleScale: 1.2,
  textScale: 0.7,
  wheelSizePct: 32,
  visibleCount: 11,
  heroScale: 105,
  soundEnabled: true,
  hapticEnabled: true,
  hapticLevel: 7,
  odometerTurns: 0,
  settingsVersion: 6,
  rawPadApi: true,
  stepDegrees: 40,
  hapticDegrees: 5,
  rotatePad: "left",
  language: "auto",
};

const backendGet = callable<[], Partial<WheelSettings> | null>("get_settings");
const backendSet = callable<[settings: WheelSettings], boolean>("set_settings");

let current: WheelSettings = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function initSettings() {
  let needsSave = false;
  try {
    const saved = await backendGet();
    // Default bottom text in the UI language, until the user sets their own.
    const merged: any = { ...DEFAULTS, ownerText: getLang() === "ko" ? "나의 스팀덱" : "My Steam Deck", ...(saved ?? {}) };
    // Older saves stored a boolean instead of a scope.
    if (saved && "installedOnly" in saved && !("libraryScope" in saved)) {
      merged.libraryScope = (saved as any).installedOnly ? "installed" : "all";
    }
    // 1.2.0: "Show" became a full view pick (library or collection).
    if (saved && !("baseView" in saved) && merged.libraryScope) merged.baseView = `base:${merged.libraryScope}`;
    delete merged.libraryScope;
    delete merged.installedOnly;
    delete merged.clockwiseIsNext; // option removed in 0.2.3
    // v2 (0.4.2): the raw controller API is the only path that sees the LEFT
    // trackpad (Steam UI scrolls internally, no wheel events). It was turned off
    // in 0.3.0 on suspicion of breaking UI sounds — that was a muted WirePlumber
    // stream instead — so turn it back on once for existing saves.
    if ((merged.settingsVersion ?? 1) < 2) {
      merged.rawPadApi = true;
      merged.settingsVersion = 2;
      needsSave = true;
    }
    // v3 (0.5.1): the keyboard-action-set input (0.5.0) makes Steam treat pad
    // rubbing as B / Steam-menu presses on the home screen, so it is off again.
    if (merged.settingsVersion < 3) {
      merged.rawPadApi = false;
      merged.settingsVersion = 3;
      needsSave = true;
    }
    // v4 (0.5.14): circle rubbing confirmed working on device → on by default again.
    if (merged.settingsVersion < 4) {
      merged.rawPadApi = true;
      merged.settingsVersion = 4;
      needsSave = true;
    }
    // v5 (0.9.17): tuned on device — 40° per game, a haptic click every 5°;
    // both sliders and the haptic-style picker were removed, so apply them.
    if (merged.settingsVersion < 5) {
      merged.stepDegrees = DEFAULTS.stepDegrees;
      merged.hapticDegrees = DEFAULTS.hapticDegrees;
      merged.settingsVersion = 5;
      needsSave = true;
    }
    // v6 (1.0.1): default haptic strength raised 5 → 7; move saves still on the old default.
    if (merged.settingsVersion < 6) {
      if ((merged.hapticLevel ?? 5) === 5) merged.hapticLevel = DEFAULTS.hapticLevel;
      merged.settingsVersion = 6;
      needsSave = true;
    }
    delete merged.shelfCollections; // 1.2.0 pre-release builds only
    delete merged.favoritesOnL1;
    delete merged.hapticMode;
    delete merged.hideRecentShelf; // always on since 0.9.4 (toggle removed)
    current = merged;
    if (needsSave) backendSet(current).catch(() => {});
  } catch (e) {
    console.error("[Spindeck] failed to load settings", e);
  }
  loaded = true;
  emit();
}

/** False until the saved file was read: never save derived values before that. */
export const settingsLoaded = () => loaded;

export function getSettings(): WheelSettings {
  return current;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
export function updateSettings(patch: Partial<WheelSettings>) {
  current = { ...current, ...patch };
  emit();
  // Debounce so typing in a text field doesn't write the file on every key.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    backendSet(current).catch((e) => console.error("[Spindeck] failed to save settings", e));
  }, 400);
}

function useStore<T>(read: () => T): T {
  const [v, setV] = useState(read);
  useEffect(() => {
    const l = () => setV(read());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return v;
}

export const useSettings = () => useStore(() => current);
export const useSettingsLoaded = () => useStore(() => loaded);
