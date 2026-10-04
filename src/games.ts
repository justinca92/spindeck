import { Navigation } from "@decky/ui";
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

function urls(app: any, kind: "hero" | "capsule"): string[] {
  const out: string[] = [];
  try {
    if (kind === "hero") {
      const custom = appStore?.GetCustomHeroImageURLs?.(app);
      if (Array.isArray(custom)) out.push(...custom);
    } else {
      const custom = appStore?.GetCustomVerticalCapsuleURLs?.(app);
      if (Array.isArray(custom)) out.push(...custom);
    }
  } catch {
    /* ignore */
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

export function loadGames(installedOnly: boolean, sort: "recent" | "alpha"): GameEntry[] {
  // Steam's stores aren't a public API: if they change shape, show an empty wheel, never crash.
  try {
    return readGames(installedOnly, sort);
  } catch {
    return [];
  }
}

function readGames(installedOnly: boolean, sort: "recent" | "alpha"): GameEntry[] {
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
export function loadCollectionGames(id: string, sort: "recent" | "alpha"): GameEntry[] {
  try {
    const c = collectionStore?.GetCollection?.(id);
    return toEntries(c?.allApps ?? c?.visibleApps ?? [], false, sort);
  } catch {
    return [];
  }
}

function toEntries(apps: any[], installedOnly: boolean, sort: "recent" | "alpha"): GameEntry[] {
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

  list.sort((x, y) =>
    sort === "alpha" ? x.name.localeCompare(y.name) : y.lastPlayed - x.lastPlayed
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
