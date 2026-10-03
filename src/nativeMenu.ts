// Opens Steam's own library context menu (the one ≡ shows on a game tile:
// Play, Properties, Favorites, Manage…) for a game on the wheel.
//
// Steam doesn't export it, so we locate it inside Steam's webpack bundle by
// *content*, not by its minified name (names change between client updates).
// Confirmed on device (SteamOS, 2026-10): the library tile calls
//   showContextMenu(<Menu overview client="mostavailable" launchSource
//                     bInGamepadUI ownerWindow …/>, event, menuOptions())
import { Navigation, showContextMenu } from "@decky/ui";
import { createElement } from "react";
import { debug } from "./log";
import { findModuleExports } from "./webpack";

let cached: { Menu: any; options: any } | null | undefined;

function findAppMenu() {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    const mod = findModuleExports("ContextMenuAction", "launchSource", "LibraryContextMenu");
    let Menu: any, options: any;
    for (const v of Object.values(mod ?? {})) {
      if (typeof v !== "function") continue;
      const t = String(v);
      if (t.includes("navigator:") && t.includes("instance:")) Menu = v;
      if (t.includes("bFitToWindow") && t.includes("LibraryContextMenu")) options = v;
    }
    if (Menu) return (cached = { Menu, options });
    debug("menu", "library context menu not found");
  } catch (e) {
    debug("menu", "search failed", e);
  }
  return cached;
}

const LAUNCH_SOURCE_LIBRARY = 100; // same value used for RunGame from the library

export function openNativeGameMenu(appid: number, overview: any, anchor: EventTarget | undefined, ownerWindow: any) {
  const found = findAppMenu();
  if (!found || !overview) {
    debug("menu", "falling back to the game page", { found: !!found, overview: !!overview });
    Navigation.Navigate(`/library/app/${appid}`); // fallback: game page has the ≡ menu
    return;
  }
  try {
    const el = createElement(found.Menu, {
      overview,
      client: "mostavailable",
      launchSource: LAUNCH_SOURCE_LIBRARY,
      bInGamepadUI: true,
      ownerWindow,
    });
    showContextMenu(el, anchor as any, found.options ? found.options() : undefined);
  } catch (e: any) {
    debug("menu", "open failed", e);
    Navigation.Navigate(`/library/app/${appid}`);
  }
}
