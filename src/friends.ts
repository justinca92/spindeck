// How many of the user's friends are in this game right now, from Steam's
// friends store (the same data the Friends list shows). Not public API: the
// store and field names vary by client, so everything is defensive, read only,
// and the shape is logged once (debug level) for checking on device.
// Returns null when it can't tell (then the UI shows nothing).

import { debug } from "./log";

declare const window: any;

function store(): any {
  return window?.friendStore ?? window?.g_FriendsUIApp?.FriendStore ?? null;
}

function friendsList(fs: any): any[] {
  const cands = [fs?.allFriends, fs?.m_FriendsList?.allFriends, fs?.FriendGroupStore?.allFriends, fs?.m_mapFriends && [...fs.m_mapFriends.values()]];
  for (const c of cands) if (Array.isArray(c) && c.length) return c;
  return [];
}

/** The appid a friend is playing (0 when not in a game). */
function playing(f: any): number {
  const p = f?.persona ?? f?.m_persona ?? f;
  const id = p?.m_unGamePlayedAppID ?? p?.m_gameid ?? p?.gameid ?? p?.m_game_id ?? p?.appid ?? 0;
  const n = typeof id === "string" ? Number(id) : Number(id ?? 0);
  // A gameid for a Steam app is its appid; shortcuts' 64-bit gameids won't match any appid.
  return Number.isFinite(n) ? n : 0;
}

let logged = false;
export function friendsInGame(appid: number): number | null {
  try {
    const fs = store();
    if (!fs) {
      if (!logged) debug("friends", "no friends store");
      logged = true;
      return null;
    }
    const list = friendsList(fs);
    if (!logged) {
      logged = true;
      const f = list[0];
      debug("friends", "store", {
        keys: Object.keys(fs).slice(0, 40),
        count: list.length,
        sample: f && { keys: Object.keys(f).slice(0, 30), persona: f.persona && Object.keys(f.persona).slice(0, 40) },
      });
    }
    if (!list.length) return null;
    let n = 0;
    for (const f of list) if (playing(f) === appid) n++;
    return n;
  } catch (e) {
    debug("friends", "read failed", e);
    return null;
  }
}
