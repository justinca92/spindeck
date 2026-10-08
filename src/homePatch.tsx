// Wrap Steam's home route. HomeSwitch decides at render time whether to show
// the wheel or the original home, so the toggle works without a restart.
//
// Our patch must be the LAST one on the route (#2). Decky runs route patches in
// registration order, each on the previous one's output. Another plugin patching
// the home after us gets the wheel instead of Steam's home, and SteamGridDB's
// patch ("Matching Recents Capsule") then fails looking for Steam's recent-games
// row in it (wrapReactType(undefined) → Steam's error screen). When we run last,
// everyone else patches Steam's real home first and we wrap their result.
// Plugin load order is arbitrary, so whenever our patch finds another one after
// it, it moves itself to the end (remove + add, Decky's public API, which also
// re-renders) and leaves that one pass untouched.
import { routerHook } from "@decky/api";
import { HomeSwitch } from "./HomeSwitch";
import { debug } from "./log";

export const HOME_ROUTE = "/library/home";
const SPINDECK_HOME = "data-spindeck-home";
/** Two plugins both insisting on being last would swap forever: after this many moves… */
const MAX_MOVES = 4;
/** …within this window, stop moving for good (until the plugin reloads) and wrap where we are. */
const MOVE_WINDOW_MS = 30_000;
/** Without access to Decky's patch list: move to the end at these times after load instead. */
const BLIND_MOVES_MS = [2_000, 8_000, 20_000];

let active = false;
let movePending = false;
let gaveUp = false;
let moves: number[] = [];
const timers: ReturnType<typeof setTimeout>[] = [];

/** Decky's patches for the home route, in run order (null if this Decky doesn't expose them). */
function homePatches(): Set<unknown> | null {
  try {
    const set = (routerHook as any)?.routerState?._routePatches?.get?.(HOME_ROUTE);
    return set instanceof Set ? set : null;
  } catch {
    return null;
  }
}

function lastOf(set: Set<unknown>) {
  let last: unknown;
  set.forEach((p) => (last = p));
  return last;
}

function moveToEnd() {
  if (!active) return;
  moves.push(Date.now());
  debug("home", "another plugin patches the home after us: moving our patch last");
  routerHook.removePatch(HOME_ROUTE, patchHome);
  routerHook.addPatch(HOME_ROUTE, patchHome);
}

function patchHome(props: any) {
  const set = homePatches();
  if (!gaveUp && set && lastOf(set) !== patchHome) {
    const now = Date.now();
    moves = moves.filter((t) => now - t < MOVE_WINDOW_MS);
    if (moves.length >= MAX_MOVES) {
      // Another plugin keeps moving itself last too. One that does that wraps the
      // final result (it doesn't dig into Steam's home like SteamGridDB), so stop
      // swapping for good and wrap where we are.
      gaveUp = true;
      debug("home", "another plugin also keeps its home patch last: staying where we are");
    } else {
      // Never wrap while someone patches after us: their patch would get the wheel.
      // This one pass shows Steam's home with their patches; the move re-renders.
      if (!movePending) {
        movePending = true;
        timers.push(
          setTimeout(() => {
            movePending = false;
            moveToEnd();
          }, 0),
        );
      }
      return props;
    }
  }
  const original = props.children;
  // Marked by a prop, not by `type`: other plugins' patches may replace the
  // element's type with a wrapper, and we must still never wrap ourselves twice.
  if (original?.type !== HomeSwitch && !original?.props?.[SPINDECK_HOME]) {
    props.children = <HomeSwitch original={original} {...{ [SPINDECK_HOME]: true }} />;
  }
  return props;
}

export function installHomePatch() {
  active = true;
  routerHook.addPatch(HOME_ROUTE, patchHome);
  if (!homePatches()) {
    // Can't see the patch list: re-register a few times while the other plugins load.
    for (const ms of BLIND_MOVES_MS) timers.push(setTimeout(moveToEnd, ms));
  }
}

export function removeHomePatch() {
  active = false;
  timers.splice(0).forEach(clearTimeout);
  movePending = false;
  gaveUp = false;
  moves = [];
  routerHook.removePatch(HOME_ROUTE, patchHome);
}
