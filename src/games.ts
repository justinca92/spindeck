import { Navigation } from "@decky/ui";
import { debug } from "./log";
// Reads the library from Steam's internal stores. These globals are not a
// public API; field names can shift between client updates.

declare const collectionStore: any;
declare const appStore: any;
declare const SteamClient: any;

export interface GameEntry {
  appid: number;
  gameid: string;      // what RunGame wants (differs from appid for non-Steam shortcuts)
  name: string;
  lastPlayed: number;
  installed: boolean;
  hero: string[];      // candidate URLs, first that loads wins
  capsule: string[];
  overview: any;       // Steam's app overview object (needed for the native ≡ menu)
}

const APP_TYPE_GAME = 1;
const APP_TYPE_SHORTCUT = 1073741824;

const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

// Steam keeps library art on disk (its library cache) and serves it locally;
// these appStore methods return those local URLs. Tried in order, before the
// CDN, so after a reboot the art comes from disk instead of the network.
// Names vary by client: missing ones are skipped. (Not public API.)
const LOCAL_METHODS = {
  hero: ["GetCustomHeroImageURLs", "GetCachedHeroImageURLs", "GetHeroImageURLs"],
  capsule: ["GetCustomVerticalCapsuleURLs", "GetCachedVerticalImageURLs", "GetVerticalCapsuleURLs"],
} as const;

let loggedArtApi = false;
function logArtApi() {
  if (loggedArtApi) return;
  loggedArtApi = true;
  try {
    const names = new Set<string>();
    for (let o = appStore; o && o !== Object.prototype; o = Object.getPrototypeOf(o))
      for (const n of Object.getOwnPropertyNames(o)) if (/URL|Image|Capsule|Hero/i.test(n)) names.add(n);
    debug("art", "appStore image methods", [...names].sort());
  } catch {
    /* ignore */
  }
}

function urls(app: any, kind: "hero" | "capsule"): string[] {
  const out: string[] = [];
  logArtApi();
  for (const m of LOCAL_METHODS[kind]) {
    try {
      const r = appStore?.[m]?.(app);
      const list = Array.isArray(r) ? r : typeof r === "string" ? [r] : [];
      for (const u of list) if (typeof u === "string" && u && !out.includes(u)) out.push(u);
    } catch {
      /* ignore */
    }
  }
  if (app.app_type !== APP_TYPE_SHORTCUT) {
    out.push(
      kind === "hero"
        ? `${CDN}/${app.appid}/library_hero.jpg`
        : `${CDN}/${app.appid}/library_600x900.jpg`
    );
  }
  return out;
}

export function loadGames(installedOnly: boolean, sort: "recent" | "alpha" | "playtime"): GameEntry[] {
  // Steam's stores aren't a public API: if they change shape, show an empty wheel, never crash.
  try {
    return readGames(installedOnly, sort);
  } catch {
    return [];
  }
}

function readGames(installedOnly: boolean, sort: "recent" | "alpha" | "playtime"): GameEntry[] {
  const coll =
    collectionStore?.GetCollection?.("type-games") ??
    collectionStore?.allGamesCollection ??
    collectionStore?.allAppsCollection;
  return toEntries(coll?.allApps ?? [], installedOnly, sort);
}

/** A Steam collection (Favorites or one of the user's own) the wheel can show with L1/R1. */
export interface CollectionInfo {
  id: string;
  name: string;
  count: number;
}

/** Favorites first, then the user's collections in Steam's order. Hidden is never offered. */
export function listCollections(): CollectionInfo[] {
  try {
    const out: CollectionInfo[] = [];
    const size = (c: any) => (c?.allApps ?? c?.visibleApps ?? []).length;
    const fav = collectionStore?.GetCollection?.("favorite");
    if (fav) out.push({ id: "favorite", name: fav.displayName || "Favorites", count: size(fav) });
    const user: any[] = collectionStore?.userCollections ?? [];
    for (const c of user) {
      if (!c?.id || c.id === "favorite" || c.id === "hidden" || out.some((o) => o.id === c.id)) continue;
      out.push({ id: String(c.id), name: c.displayName || String(c.id), count: size(c) });
    }
    return out;
  } catch {
    return [];
  }
}

/** Games in one collection (installed or not: a collection is the user's own pick). */
export function loadCollectionGames(id: string, sort: "recent" | "alpha" | "playtime"): GameEntry[] {
  try {
    const c = collectionStore?.GetCollection?.(id);
    return toEntries(c?.allApps ?? c?.visibleApps ?? [], false, sort);
  } catch {
    return [];
  }
}

function toEntries(apps: any[], installedOnly: boolean, sort: "recent" | "alpha" | "playtime"): GameEntry[] {
  const list: GameEntry[] = apps
    .filter((a) => a && (a.app_type === APP_TYPE_GAME || a.app_type === APP_TYPE_SHORTCUT))
    .map((a) => ({
      appid: a.appid,
      gameid: String(a.m_gameid ?? a.gameid ?? a.appid),
      name: a.display_name ?? a.sort_as ?? String(a.appid),
      lastPlayed: a.rt_last_time_played ?? a.rt_last_time_locally_played ?? 0,
      installed: a.app_type === APP_TYPE_SHORTCUT ? true : !!(a.installed ?? a.local_per_client_data?.installed),
      hero: urls(a, "hero"),
      capsule: urls(a, "capsule"),
      overview: a,
    }))
    .filter((g) => !installedOnly || g.installed);

  const minutes = (g: GameEntry) => Number(g.overview?.minutes_playtime_forever ?? 0);
  list.sort((x, y) =>
    sort === "alpha"
      ? x.name.localeCompare(y.name)
      : sort === "playtime"
        ? minutes(y) - minutes(x) || y.lastPlayed - x.lastPlayed // most played first; ties by recent
        : y.lastPlayed - x.lastPlayed
  );
  return list;
}

/** Open Steam's own game details page for this app. */
export function openGamePage(g: GameEntry) {
  try {
    Navigation.Navigate(`/library/app/${g.appid}`);
  } catch {
    /* ignore */
  }
}

export function launch(g: GameEntry) {
  SteamClient.Apps.RunGame(g.gameid, "", -1, 100);
}

export interface AchievementProgress {
  achieved: number;
  total: number;
}

/**
 * Watches achievement progress for one app via Steam's app-details feed.
 * Calls back with null for games without achievements (and for non-Steam shortcuts).
 * Field names come from the internal AppDetails object; verify in DevTools if it stays empty.
 */
export function subscribeAchievements(
  appid: number,
  cb: (p: AchievementProgress | null) => void
): () => void {
  let reg: any;
  try {
    reg = SteamClient?.Apps?.RegisterForAppDetails?.(appid, (details: any) => {
      const a = details?.achievements;
      const total = a?.nTotal ?? 0;
      cb(total > 0 ? { achieved: a?.nAchieved ?? 0, total } : null);
    });
  } catch {
    cb(null);
  }
  return () => reg?.unregister?.();
}
