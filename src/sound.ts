// Steam UI plays its navigation sound when focus moves between elements. The
// wheel is a single focusable that consumes input itself, so Steam never plays
// it. We ask Steam's own UI audio store to play its own sound files, the same
// path Steam uses (so it follows Steam's UI-sound setting and output stream).
// Files below were confirmed present on SteamOS (loaded by Steam UI itself).
import { debug } from "./log";

const BASE = "https://steamloopback.host/sounds/";
export const SOUNDS = {
  step: "deck_ui_navigation.wav",
  launch: "deck_ui_launch_game.wav",
  detail: "deck_ui_into_game_detail.wav",
  screen: "deck_ui_tab_transition_01.wav",
} as const;

function steamAudio(): any {
  try {
    return (globalThis as any).SteamUIStore?.m_GamepadUIAudioStore;
  } catch {
    return undefined;
  }
}

export function playUiSound(kind: keyof typeof SOUNDS) {
  const url = BASE + SOUNDS[kind];
  const store = steamAudio();
  if (store?.PlayAudioURL) {
    try {
      Promise.resolve(store.PlayAudioURL(url)).catch((e: any) => debug("sound", "Steam playback failed", e));
      return;
    } catch (e) {
      debug("sound", "Steam playback failed", e);
    }
  }
  // Fallback: plain HTML audio (may be blocked by autoplay rules).
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch((e) => debug("sound", "HTML playback failed", e));
  } catch (e) {
    debug("sound", "no audio", e);
  }
}
