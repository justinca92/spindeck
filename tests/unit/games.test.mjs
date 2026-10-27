import { test } from "node:test";
import assert from "node:assert/strict";
import { navigated } from "@decky/ui";
import { launch, listCollections, loadCollectionGames, loadGames } from "../../src/games.ts";

const GAME = 1;
const SHORTCUT = 1073741824;
const apps = [
  { appid: 10, app_type: GAME, display_name: "Celeste", installed: true, rt_last_time_played: 300, minutes_playtime_forever: 50 },
  { appid: 20, app_type: GAME, display_name: "Hades", installed: false, rt_last_time_played: 500, minutes_playtime_forever: 900 },
  { appid: 30, app_type: SHORTCUT, display_name: "Emulator", m_gameid: "9876543210", rt_last_time_locally_played: 400 },
  { appid: 40, app_type: 4, display_name: "A Tool", installed: true }, // not a game
];
globalThis.collectionStore = {
  GetCollection: (id) => (id === "type-games" ? { allApps: apps } : id === "favorite" ? { displayName: "Favorites", allApps: [apps[1]] } : id === "c1" ? { allApps: [apps[1], apps[0]] } : null),
  userCollections: [{ id: "hidden", displayName: "Hidden" }, { id: "c1", displayName: "RPGs", allApps: [1, 2] }, { id: "favorite" }],
};
globalThis.appStore = { GetCustomVerticalCapsuleURLs: (a) => [`/local/${a.appid}.jpg`] };
const ids = (list) => list.map((g) => g.appid);

test("installed view: games only, shortcuts count as installed", () => {
  assert.deepEqual(ids(loadGames(true, "recent")), [30, 10]);
});

test("whole library, each sort", () => {
  assert.deepEqual(ids(loadGames(false, "recent")), [20, 30, 10], "local play time used for shortcuts");
  assert.deepEqual(ids(loadGames(false, "alpha")), [10, 30, 20]);
  assert.deepEqual(ids(loadGames(false, "playtime")), [20, 10, 30]);
});

test("entries: RunGame id, local art first, CDN fallback only for Steam apps", () => {
  const [shortcut] = loadGames(true, "recent");
  assert.equal(shortcut.gameid, "9876543210");
  assert.deepEqual(shortcut.capsule, ["/local/30.jpg"]);
  const celeste = loadGames(true, "alpha")[0];
  assert.equal(celeste.gameid, "10");
  assert.equal(celeste.capsule[0], "/local/10.jpg");
  assert.match(celeste.capsule[1], /\/10\/library_600x900\.jpg$/);
});

test("collections: Favorites first, Hidden never offered, no duplicates", () => {
  assert.deepEqual(
    listCollections().map((c) => c.id),
    ["favorite", "c1"],
  );
  assert.deepEqual(ids(loadCollectionGames("c1", "alpha")), [10, 20], "a collection includes uninstalled games");
});

test("a broken Steam store gives an empty wheel, not a crash", () => {
  const saved = globalThis.collectionStore;
  globalThis.collectionStore = { GetCollection: () => { throw new Error("changed"); } };
  try {
    assert.deepEqual(loadGames(false, "recent"), []);
  } finally {
    globalThis.collectionStore = saved;
  }
});

test("launch: RunGame with the game id; the game page if Steam's call fails", () => {
  const runs = [];
  globalThis.SteamClient = { Apps: { RunGame: (...a) => runs.push(a) } };
  const [shortcut] = loadGames(true, "recent");
  launch(shortcut);
  assert.deepEqual(runs, [["9876543210", "", -1, 100]]);
  navigated.length = 0;
  globalThis.SteamClient = { Apps: {} };
  launch(shortcut);
  assert.deepEqual(navigated, ["/library/app/30"]);
});
