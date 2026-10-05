// Which controller is the user playing with? Used to keep the Deck's own
// haptics for when the Deck itself is in the user's hands: if another
// controller is connected and that's where the input comes from (Deck docked
// to a TV with a pad, a Steam Controller…), the Deck doesn't vibrate.
//
// Steam's controller APIs aren't public; shapes vary between clients, so
// everything is defensive and logged (debug level) for checking on device.
// Runtime only, nothing is saved.

import { debug } from "./log";
import { onTeardown } from "./safety";

declare const SteamClient: any;

const DECK_PRODUCT_ID = 0x1205; // Valve (0x28DE) Steam Deck controller
const VALVE_VENDOR_ID = 0x28de;

let known = false; // got a controller list at least once
const deck = new Set<number>(); // controller indices that are the Deck itself
let others = 0; // connected controllers that aren't the Deck
let lastIdx: number | null = null; // controller index of the latest input we saw

function isDeck(c: any): boolean {
  const name = String(c?.strName ?? c?.name ?? "");
  if (/steam\s*deck|neptune|jupiter|galileo/i.test(name)) return true;
  const vid = Number(c?.unVendorID ?? c?.vendorId ?? -1);
  const pid = Number(c?.unProductID ?? c?.productId ?? -1);
  return vid === VALVE_VENDOR_ID && pid === DECK_PRODUCT_ID;
}

function indexOf(c: any): number | null {
  const i = c?.nControllerIndex ?? c?.unControllerIndex ?? c?.controllerIndex ?? c?.nIndex;
  return typeof i === "number" ? i : null;
}

function onList(list: any) {
  try {
    const arr: any[] = Array.isArray(list) ? list : Array.isArray(list?.controllers) ? list.controllers : [];
    deck.clear();
    others = 0;
    for (const c of arr) {
      const i = indexOf(c);
      if (isDeck(c)) {
        if (i !== null) deck.add(i);
      } else others++;
    }
    known = arr.length > 0;
    debug("controllers", { deck: [...deck], others, list: arr });
  } catch (e) {
    debug("controllers", "list parse failed", e);
  }
}

/** Note where an input came from (controller index). */
export function noteInput(idx: unknown) {
  if (typeof idx === "number" && idx >= 0) lastIdx = idx;
}

function onInput(...args: any[]) {
  // Newer clients pass an array of { nController, nA, bS }; older ones
  // (controllerIndex, button, pressed).
  const a = args[0];
  if (Array.isArray(a)) {
    for (const m of a) if (m?.bS !== false) noteInput(m?.nController ?? m?.controllerIndex);
  } else noteInput(a);
}

let started = false;
/** Start watching (idempotent; undone on plugin unload). */
export function watchControllers() {
  if (started) return;
  started = true;
  const regs: any[] = [];
  try {
    regs.push(SteamClient?.Input?.RegisterForControllerListChanges?.(onList));
  } catch (e) {
    debug("controllers", "list watch unavailable", e);
  }
  try {
    regs.push(SteamClient?.Input?.RegisterForControllerInputMessages?.(onInput));
  } catch (e) {
    debug("controllers", "input watch unavailable", e);
  }
  onTeardown(() => {
    for (const r of regs) {
      try {
        r?.unregister?.();
      } catch {
        /* ignore */
      }
    }
    started = false;
    known = false;
    deck.clear();
    others = 0;
    lastIdx = null;
  });
}

/**
 * true  = the user is on the Deck's own controls (or nothing else is connected),
 * false = another controller is in use,
 * null  = can't tell (no controller info from Steam).
 */
export function deckInHands(): boolean | null {
  if (!known) return null;
  if (others === 0) return true;
  if (lastIdx !== null && deck.size) return deck.has(lastIdx);
  return false; // another controller is connected and we can't see where input comes from
}
