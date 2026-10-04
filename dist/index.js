// build/shims/decky-ui.js
var D = window.DFL;
var {
  ButtonItem,
  DialogButton,
  DropdownItem,
  Focusable,
  GamepadButton,
  Navigation,
  PanelSection,
  PanelSectionRow,
  SliderField,
  TextField,
  ToggleField,
  staticClasses,
  showContextMenu,
  showModal,
  ModalRoot
} = D;

// build/shims/decky-api.js
var api = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit.connect(1, "Spindeck");
var routerHook = api.routerHook;
var toaster = api.toaster;
var callable = (method) => (...args) => api.call(method, ...args);
var definePlugin = (fn) => (...args) => fn(...args);

// build/shims/react.js
var R = window.SP_REACT;
var react_default = R;
var { createElement, Fragment, useState, useEffect, useMemo, useRef, useCallback, memo, Component } = R;

// src/settings.ts
var DEFAULTS = {
  homeEnabled: true,
  ownerText: "나의 스팀덱",
  subtitleText: "",
  accentColor: "#66c0f4",
  libraryScope: "installed",
  sortMode: "recent",
  favoritesOnL1: true,
  r1View: "",
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
  language: "auto"
};
var backendGet = callable("get_settings");
var backendSet = callable("set_settings");
var current = { ...DEFAULTS };
var loaded = false;
var listeners = new Set;
var emit = () => listeners.forEach((l) => l());
async function initSettings() {
  let needsSave = false;
  try {
    const saved = await backendGet();
    const merged = { ...DEFAULTS, ownerText: getLang() === "ko" ? "나의 스팀덱" : "My Steam Deck", ...saved ?? {} };
    if (saved && "installedOnly" in saved && !("libraryScope" in saved)) {
      merged.libraryScope = saved.installedOnly ? "installed" : "all";
    }
    delete merged.installedOnly;
    delete merged.clockwiseIsNext;
    if ((merged.settingsVersion ?? 1) < 2) {
      merged.rawPadApi = true;
      merged.settingsVersion = 2;
      needsSave = true;
    }
    if (merged.settingsVersion < 3) {
      merged.rawPadApi = false;
      merged.settingsVersion = 3;
      needsSave = true;
    }
    if (merged.settingsVersion < 4) {
      merged.rawPadApi = true;
      merged.settingsVersion = 4;
      needsSave = true;
    }
    if (merged.settingsVersion < 5) {
      merged.stepDegrees = DEFAULTS.stepDegrees;
      merged.hapticDegrees = DEFAULTS.hapticDegrees;
      merged.settingsVersion = 5;
      needsSave = true;
    }
    if (merged.settingsVersion < 6) {
      if ((merged.hapticLevel ?? 5) === 5)
        merged.hapticLevel = DEFAULTS.hapticLevel;
      merged.settingsVersion = 6;
      needsSave = true;
    }
    delete merged.shelfCollections;
    delete merged.hapticMode;
    delete merged.hideRecentShelf;
    current = merged;
    if (needsSave)
      backendSet(current).catch(() => {});
  } catch (e) {
    console.error("[Spindeck] failed to load settings", e);
  }
  loaded = true;
  emit();
}
var settingsLoaded = () => loaded;
function getSettings() {
  return current;
}
var saveTimer;
function updateSettings(patch) {
  current = { ...current, ...patch };
  emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    backendSet(current).catch((e) => console.error("[Spindeck] failed to save settings", e));
  }, 400);
}
function useStore(read) {
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
var useSettings = () => useStore(() => current);
var useSettingsLoaded = () => useStore(() => loaded);

// src/locale.ts
var detected = { lang: "en", raw: "?", source: "none" };
function setDetected(raw, source) {
  detected.raw = raw;
  detected.source = source;
  detected.lang = /^(koreana|ko)/i.test(raw) ? "ko" : "en";
}
function syncGuess() {
  const w = globalThis;
  const locs = w.LocalizationManager?.m_rgLocalesToUse;
  if (Array.isArray(locs) && locs.length)
    return setDetected(String(locs[0]), "Steam");
  const htmlLang = w.document?.documentElement?.lang;
  if (htmlLang)
    return setDetected(String(htmlLang), "page");
  const nav = w.navigator?.language;
  if (nav)
    return setDetected(String(nav), "system");
}
syncGuess();
var listeners2 = new Set;
var asked = false;
function askSteam() {
  if (asked)
    return;
  asked = true;
  try {
    const p = globalThis.SteamClient?.Settings?.GetCurrentLanguage?.();
    Promise.resolve(p).then((lang) => {
      if (typeof lang !== "string" || !lang)
        return;
      setDetected(lang, "Steam");
      listeners2.forEach((l) => l());
    }).catch(() => {});
  } catch {}
}
var resolve = (pref) => pref === "ko" || pref === "en" ? pref : detected.lang;
function getLang() {
  askSteam();
  return resolve(getSettings().language);
}
function useLang() {
  const s = useSettings();
  const [, bump] = useState(0);
  useEffect(() => {
    askSteam();
    const l = () => bump((v) => v + 1);
    listeners2.add(l);
    return () => {
      listeners2.delete(l);
    };
  }, []);
  return resolve(s.language);
}

// src/i18n.ts
var fmtHours = (min) => {
  const h = min / 60;
  return h >= 100 ? String(Math.round(h)) : (Math.round(h * 10) / 10).toString();
};
var ko = {
  homeToggle: "휠 런처를 홈 화면으로",
  homeToggleDesc: "켜두면 재부팅해도 계속 유지돼요",
  openWheel: "휠 런처 열기",
  personalize: "개인화",
  ownerLabel: "하단 문구",
  subLabel: "서브 문구 (선택)",
  subTitle: "서브 문구",
  hangulFor: (f) => `한글로 입력: ${f}`,
  hangulDesc: "스팀 키보드의 한글이 이 패널에선 입력되지 않아서, 전용 한글 자판을 써요",
  accent: "포인트 색상",
  library: "라이브러리",
  view: "보기",
  installed: "설치된 게임",
  all: "모든 라이브러리",
  sort: "정렬",
  recent: "최근 플레이",
  alpha: "알파벳순 (A–Z)",
  l1Favorites: "L1: ★ 즐겨찾기",
  r1Pick: "R1: 내 모음집",
  r1Desc: "휠 화면에서 R1로 볼 모음집을 하나 고르세요.",
  r1None: "없음",
  shelfCount: (n) => `게임 ${n}개`,
  display: "표시",
  heroSize: "히어로 이미지 크기",
  pctOfWidth: "화면 너비 대비 %",
  visible: "한 화면에 보이는 게임 수",
  wheelSize: "휠 크기",
  capsuleSize: "캡슐 이미지 크기",
  base100: "100 = 기본",
  textSize: "게임 이름 글자 크기",
  controls: "휠 조작",
  haptic: "휠 햅틱",
  hapticDesc: "돌리는 쪽 트랙패드만 톡 (스팀 원형 메뉴와 같은 진동)",
  hapticLevel: "진동 세기",
  hapticLevelDesc: (db) => `5 = 스팀 원형 메뉴와 같은 세기 · 지금 ${db} dB`,
  sound: "휠 효과음",
  soundDesc: "게임을 넘길 때 스팀 UI 소리",
  pad: "회전 트랙패드",
  left: "왼쪽",
  right: "오른쪽",
  circle: "트랙패드 원형 회전 (문지르기)",
  circleDesc: "트랙패드를 원을 그리듯 문질러 휠을 돌려요",
  colors: ["스팀 블루", "퍼플", "핑크", "레드", "오렌지", "옐로", "그린", "민트", "화이트"],
  defaultOwner: "나의 스팀덱",
  noGames: "표시할 게임이 없어요",
  letterCount: "게임 {n}개",
  milestone: (n) => `\uD83C\uDF89 다이얼 ${n}바퀴 돌파!`,
  odometer: (n) => `\uD83C\uDF00 지금까지 돌린 바퀴: ${n}`,
  gamePage: "게임 페이지",
  options: "옵션",
  wheel: "휠 런처",
  about: "정보",
  support: "개발자 후원하기 (Ko-fi)",
  supportDesc: "Spindeck이 마음에 드셨다면 커피 한 잔으로 응원해 주세요",
  sourceAndUpdates: "GitHub: 소스 코드 · 업데이트",
  langAuto: "자동 (스팀 언어)",
  playtime: (min) => !min ? "아직 플레이 안 함" : min < 60 ? `플레이 시간 ${min}분` : `플레이 시간 ${fmtHours(min)}시간`,
  roulette: "오늘의 게임은?",
  rouletteSpinning: "오늘의 게임을 고르는 중…",
  rouletteDone: (g) => `오늘의 게임: ${g}`
};
var en = {
  homeToggle: "Use the wheel as Home",
  homeToggleDesc: "Stays on across reboots",
  openWheel: "Open the wheel",
  personalize: "Personalize",
  ownerLabel: "Bottom text",
  subLabel: "Subtitle (optional)",
  subTitle: "Subtitle",
  hangulFor: (f) => `Type in Korean: ${f}`,
  hangulDesc: "Steam's keyboard can't type Korean in this panel, so use this keypad",
  accent: "Accent color",
  library: "Library",
  view: "Show",
  installed: "Installed games",
  all: "Whole library",
  sort: "Sort",
  recent: "Recently played",
  alpha: "Alphabetical (A–Z)",
  l1Favorites: "L1: ★ Favorites",
  r1Pick: "R1: my collection",
  r1Desc: "Pick one collection to open with R1 on the wheel.",
  r1None: "None",
  shelfCount: (n) => `${n} games`,
  display: "Display",
  heroSize: "Hero art size",
  pctOfWidth: "% of screen width",
  visible: "Games visible at once",
  wheelSize: "Wheel size",
  capsuleSize: "Capsule art size",
  base100: "100 = default",
  textSize: "Game title size",
  controls: "Wheel controls",
  haptic: "Wheel haptics",
  hapticDesc: "A tick on the rotating trackpad only (like Steam's radial menus)",
  hapticLevel: "Haptic strength",
  hapticLevelDesc: (db) => `5 = same as Steam's radial menus · now ${db} dB`,
  sound: "Wheel sound",
  soundDesc: "Steam UI sound when moving between games",
  pad: "Rotating trackpad",
  left: "Left",
  right: "Right",
  circle: "Trackpad circle rotation (rubbing)",
  circleDesc: "Rub the trackpad in a circle to spin the wheel",
  colors: ["Steam blue", "Purple", "Pink", "Red", "Orange", "Yellow", "Green", "Mint", "White"],
  defaultOwner: "My Steam Deck",
  noGames: "No games to show",
  letterCount: "{n} games",
  milestone: (n) => `\uD83C\uDF89 ${n} turns on the dial!`,
  odometer: (n) => `\uD83C\uDF00 Dial odometer: ${n} turns`,
  gamePage: "Game page",
  options: "Options",
  wheel: "Wheel launcher",
  about: "About",
  support: "Support the developer (Ko-fi)",
  supportDesc: "If you enjoy Spindeck, a coffee keeps it going",
  sourceAndUpdates: "GitHub: source code · updates",
  langAuto: "Auto (Steam language)",
  playtime: (min) => !min ? "NOT PLAYED YET" : min < 60 ? `PLAYTIME ${min} MIN` : `PLAYTIME ${fmtHours(min)} HRS`,
  roulette: "Today's game?",
  rouletteSpinning: "Picking today's game…",
  rouletteDone: (g) => `Today's game: ${g}`
};
var STRINGS = { ko, en };
var useT = () => STRINGS[useLang()];

// src/log.ts
function debug(area, ...args) {
  try {
    console.debug(`[Spindeck:${area}]`, ...args);
  } catch {}
}

// src/games.ts
var APP_TYPE_GAME = 1;
var APP_TYPE_SHORTCUT = 1073741824;
var CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";
function urls(app, kind) {
  const out = [];
  try {
    if (kind === "hero") {
      const custom = appStore?.GetCustomHeroImageURLs?.(app);
      if (Array.isArray(custom))
        out.push(...custom);
    } else {
      const custom = appStore?.GetCustomVerticalCapsuleURLs?.(app);
      if (Array.isArray(custom))
        out.push(...custom);
    }
  } catch {}
  if (app.app_type !== APP_TYPE_SHORTCUT) {
    out.push(kind === "hero" ? `${CDN}/${app.appid}/library_hero.jpg` : `${CDN}/${app.appid}/library_600x900.jpg`);
  }
  return out;
}
function loadGames(installedOnly, sort) {
  try {
    return readGames(installedOnly, sort);
  } catch {
    return [];
  }
}
function readGames(installedOnly, sort) {
  const coll = collectionStore?.GetCollection?.("type-games") ?? collectionStore?.allGamesCollection ?? collectionStore?.allAppsCollection;
  return toEntries(coll?.allApps ?? [], installedOnly, sort);
}
function listCollections() {
  try {
    const out = [];
    const size = (c) => (c?.allApps ?? c?.visibleApps ?? []).length;
    const fav = collectionStore?.GetCollection?.("favorite");
    if (fav)
      out.push({ id: "favorite", name: fav.displayName || "Favorites", count: size(fav) });
    const user = collectionStore?.userCollections ?? [];
    for (const c of user) {
      if (!c?.id || c.id === "favorite" || c.id === "hidden" || out.some((o) => o.id === c.id))
        continue;
      out.push({ id: String(c.id), name: c.displayName || String(c.id), count: size(c) });
    }
    return out;
  } catch {
    return [];
  }
}
function loadCollectionGames(id, sort) {
  try {
    const c = collectionStore?.GetCollection?.(id);
    return toEntries(c?.allApps ?? c?.visibleApps ?? [], false, sort);
  } catch {
    return [];
  }
}
function toEntries(apps, installedOnly, sort) {
  const list = apps.filter((a) => a && (a.app_type === APP_TYPE_GAME || a.app_type === APP_TYPE_SHORTCUT)).map((a) => ({
    appid: a.appid,
    gameid: String(a.m_gameid ?? a.gameid ?? a.appid),
    name: a.display_name ?? a.sort_as ?? String(a.appid),
    lastPlayed: a.rt_last_time_played ?? a.rt_last_time_locally_played ?? 0,
    installed: a.app_type === APP_TYPE_SHORTCUT ? true : !!(a.installed ?? a.local_per_client_data?.installed),
    hero: urls(a, "hero"),
    capsule: urls(a, "capsule"),
    overview: a
  })).filter((g) => !installedOnly || g.installed);
  list.sort((x, y) => sort === "alpha" ? x.name.localeCompare(y.name) : y.lastPlayed - x.lastPlayed);
  return list;
}
function openGamePage(g) {
  try {
    Navigation.Navigate(`/library/app/${g.appid}`);
  } catch {}
}
function subscribeAchievements(appid, cb) {
  let reg;
  try {
    reg = SteamClient?.Apps?.RegisterForAppDetails?.(appid, (details) => {
      const a = details?.achievements;
      const total = a?.nTotal ?? 0;
      cb(total > 0 ? { achieved: a?.nAchieved ?? 0, total } : null);
    });
  } catch {
    cb(null);
  }
  return () => reg?.unregister?.();
}

// src/safety.ts
var R2 = react_default;

class SafeBoundaryImpl extends R2.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    debug("safety", "falling back to Steam's UI after an error", error);
  }
  render() {
    const p = this.props;
    return this.state.failed ? p.fallback ?? null : p.children;
  }
}
var SafeBoundary = SafeBoundaryImpl;
var teardowns = new Set;
function onTeardown(fn) {
  teardowns.add(fn);
  return () => {
    teardowns.delete(fn);
  };
}
function teardownAll() {
  for (const fn of [...teardowns]) {
    teardowns.delete(fn);
    try {
      fn();
    } catch (e) {
      debug("safety", "teardown failed", e);
    }
  }
}

// src/padInput.ts
var wrap = (d) => {
  if (d > Math.PI)
    d -= 2 * Math.PI;
  if (d < -Math.PI)
    d += 2 * Math.PI;
  return d;
};
function makeStepper(opts) {
  const step = opts.stepDegrees * Math.PI / 180;
  let acc = 0;
  return {
    add(dClockwise) {
      acc += dClockwise;
      while (acc >= step) {
        opts.onStep(1);
        acc -= step;
      }
      while (acc <= -step) {
        opts.onStep(-1);
        acc += step;
      }
    },
    reset() {
      acc = 0;
    }
  };
}
var ANALOG_TYPE = { left: 48, right: 49 };
var ANALOG_DEADZONE = 0.12;
var ANALOG_GESTURE_GAP_MS = 150;
var MAX_TURN_PER_MESSAGE = Math.PI / 2;
function subscribeKeyboardAnalogWheel(opts) {
  const Input = globalThis.SteamClient?.Input;
  if (!Input?.RegisterForControllerAnalogInputMessages || !Input?.SetKeyboardActionset)
    return () => {};
  const wanted = ANALOG_TYPE[opts.pad];
  const stepper = makeStepper(opts);
  const detents = opts.onDetent && opts.detentDegrees ? makeStepper({ ...opts, stepDegrees: opts.detentDegrees, onStep: () => opts.onDetent() }) : null;
  let last = null;
  let lastTime = 0;
  let reg;
  try {
    reg = Input.RegisterForControllerAnalogInputMessages((_idx, type, _p, x, y) => {
      if (type !== wanted)
        return;
      const now = Date.now();
      if (now - lastTime > ANALOG_GESTURE_GAP_MS) {
        last = null;
        stepper.reset();
        detents?.reset();
      }
      lastTime = now;
      if (Math.hypot(x, y) < ANALOG_DEADZONE)
        return;
      const a = Math.atan2(y, x);
      if (last !== null) {
        const d = wrap(a - last);
        if (Math.abs(d) <= MAX_TURN_PER_MESSAGE) {
          stepper.add(-d);
          detents?.add(-d);
          opts.onTurn?.(-d);
        }
      }
      last = a;
    });
    Input.EnableControllerAnalogInputMessages?.(true);
    Input.SetKeyboardActionset(true, false);
  } catch {}
  const keep = setInterval(() => {
    try {
      Input.SetKeyboardActionset(true, false);
    } catch {}
  }, 1000);
  const stop = () => {
    clearInterval(keep);
    try {
      Input.SetKeyboardActionset(false, false);
      Input.EnableControllerAnalogInputMessages?.(false);
    } catch {}
    reg?.unregister?.();
  };
  const unregister = onTeardown(stop);
  return () => {
    unregister();
    stop();
  };
}
function subscribeCursorWheel(el, opts) {
  if (opts.pad !== "right")
    return () => {};
  const stepper = makeStepper(opts);
  let lastDir = null;
  let lastTime = 0;
  const MIN_MOVE = 2;
  const onMove = (e) => {
    const dx = e.movementX;
    const dy = e.movementY;
    if (Math.hypot(dx, dy) < MIN_MOVE)
      return;
    const now = Date.now();
    if (now - lastTime > 200) {
      lastDir = null;
      stepper.reset();
    }
    lastTime = now;
    const dir = Math.atan2(dy, dx);
    if (lastDir !== null) {
      const turn = wrap(dir - lastDir);
      if (Math.abs(turn) < Math.PI * 0.6)
        stepper.add(turn);
    }
    lastDir = dir;
  };
  el.addEventListener("mousemove", onMove);
  return () => el.removeEventListener("mousemove", onMove);
}
function subscribeScrollWheel(el, opts) {
  const stepPx = 60 * (opts.stepDegrees / 30);
  let acc = 0;
  let lastTime = 0;
  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTime > 300)
      acc = 0;
    lastTime = now;
    acc += e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
    while (acc >= stepPx) {
      opts.onStep(1);
      acc -= stepPx;
    }
    while (acc <= -stepPx) {
      opts.onStep(-1);
      acc += stepPx;
    }
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}

// src/odometer.ts
var ODOMETER_MILESTONES = [25, 100, 500, 1000, 2500, 5000, 1e4, 25000, 50000, 1e5];
function crossedMilestone(before, after) {
  let hit = null;
  for (const m of ODOMETER_MILESTONES)
    if (before < m && after >= m)
      hit = m;
  return hit;
}

// src/sound.ts
var BASE = "https://steamloopback.host/sounds/";
var SOUNDS = {
  step: "deck_ui_navigation.wav",
  launch: "deck_ui_launch_game.wav",
  detail: "deck_ui_into_game_detail.wav",
  screen: "deck_ui_tab_transition_01.wav"
};
function steamAudio() {
  try {
    return globalThis.SteamUIStore?.m_GamepadUIAudioStore;
  } catch {
    return;
  }
}
function playUiSound(kind) {
  const url = BASE + SOUNDS[kind];
  const store = steamAudio();
  if (store?.PlayAudioURL) {
    try {
      Promise.resolve(store.PlayAudioURL(url)).catch((e) => debug("sound", "Steam playback failed", e));
      return;
    } catch (e) {
      debug("sound", "Steam playback failed", e);
    }
  }
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch((e) => debug("sound", "HTML playback failed", e));
  } catch (e) {
    debug("sound", "no audio", e);
  }
}

// src/webpack.ts
var req;
function getRequire() {
  if (req)
    return req;
  try {
    const chunk = globalThis.webpackChunksteamui;
    chunk?.push([[Math.random()], {}, (r) => req = r]);
  } catch {}
  return req;
}
function findModuleExports(...needles) {
  const r = getRequire();
  if (!r?.m)
    return null;
  for (const id of Object.keys(r.m)) {
    try {
      const src = String(r.m[id]);
      if (needles.every((n) => src.includes(n)))
        return r(id) ?? null;
    } catch {}
  }
  return null;
}

// src/nativeMenu.ts
var cached;
function findAppMenu() {
  if (cached !== undefined)
    return cached;
  cached = null;
  try {
    const mod = findModuleExports("ContextMenuAction", "launchSource", "LibraryContextMenu");
    let Menu, options;
    for (const v of Object.values(mod ?? {})) {
      if (typeof v !== "function")
        continue;
      const t = String(v);
      if (t.includes("navigator:") && t.includes("instance:"))
        Menu = v;
      if (t.includes("bFitToWindow") && t.includes("LibraryContextMenu"))
        options = v;
    }
    if (Menu)
      return cached = { Menu, options };
    debug("menu", "library context menu not found");
  } catch (e) {
    debug("menu", "search failed", e);
  }
  return cached;
}
var LAUNCH_SOURCE_LIBRARY = 100;
function openNativeGameMenu(appid, overview, anchor, ownerWindow) {
  const found = findAppMenu();
  if (!found || !overview) {
    debug("menu", "falling back to the game page", { found: !!found, overview: !!overview });
    Navigation.Navigate(`/library/app/${appid}`);
    return;
  }
  try {
    const el = createElement(found.Menu, {
      overview,
      client: "mostavailable",
      launchSource: LAUNCH_SOURCE_LIBRARY,
      bInGamepadUI: true,
      ownerWindow
    });
    showContextMenu(el, anchor, found.options ? found.options() : undefined);
  } catch (e) {
    debug("menu", "open failed", e);
    Navigation.Navigate(`/library/app/${appid}`);
  }
}

// src/haptics.ts
var HAPTIC_LOCATION = { left: 2, right: 1 };
var HAPTIC_LOCATION_KEYBOARD = { left: 0, right: 1 };
var service;
var broken = false;
function findService() {
  if (service !== undefined)
    return service;
  service = null;
  try {
    const mod = findModuleExports("PlaySteamDeckHaptic", "Playing legacy haptics");
    for (const v of Object.values(mod ?? {})) {
      if (v && typeof v.PlaySteamDeckHaptic === "function")
        return service = v;
    }
    debug("haptic", "haptic service not found");
  } catch (e) {
    debug("haptic", "search failed", e);
  }
  return service;
}
var levelToDb = (level) => -24 + (Math.max(1, Math.min(9, Math.round(level))) - 1) * 3;
var TICK = 1;
function wheelTick(pad, keyboardMode = false, level = 5) {
  if (broken)
    return;
  const s = findService();
  if (!s)
    return;
  try {
    const loc = keyboardMode ? HAPTIC_LOCATION_KEYBOARD[pad] : HAPTIC_LOCATION[pad];
    s.PlaySteamDeckHaptic(loc, TICK, 1, levelToDb(level));
  } catch (e) {
    broken = true;
    debug("haptic", "disabled after error", e);
  }
}

// src/steamDom.ts
var cachedSearch;
function findHeaderSearch(doc) {
  if (!doc)
    return;
  if (cachedSearch?.isConnected && cachedSearch.ownerDocument === doc) {
    const r = cachedSearch.getBoundingClientRect();
    if (r.height > 0 && r.top >= 0 && r.top < 60)
      return cachedSearch;
  }
  cachedSearch = Array.from(doc.querySelectorAll("input")).find((i) => {
    const r = i.getBoundingClientRect();
    return r.height > 0 && r.height < 80 && r.top >= 0 && r.top < 60;
  });
  return cachedSearch;
}
var lastTopBar = 0;
function topBarBottom(doc) {
  const bar = strips.doc === doc ? strips.els.filter((e) => e.isConnected).sort((a, b) => b.offsetHeight - a.offsetHeight)[0] : undefined;
  if (bar)
    return lastTopBar = Math.round(bar.getBoundingClientRect().bottom);
  const input = findHeaderSearch(doc);
  if (input)
    lastTopBar = Math.round(input.getBoundingClientRect().bottom + 2);
  return lastTopBar || 48;
}
var FOCUSABLE = "[tabindex], button, a, input";
function focusFirstIn(box) {
  box?.querySelector(FOCUSABLE)?.focus?.();
}
function focusablesIn(box) {
  return Array.from(box.querySelectorAll(FOCUSABLE));
}
var none = (v) => !v || v === "none" || v === "rgba(0, 0, 0, 0)" || v === "transparent";
function isPainted(view, el) {
  return [view.getComputedStyle(el), view.getComputedStyle(el, "::before"), view.getComputedStyle(el, "::after")].some((cs) => !none(cs.backgroundColor) || !none(cs.backgroundImage) || !none(cs.backdropFilter));
}
var strips = { els: [], at: 0, doc: null };
function headerStrips(doc, maxAgeMs) {
  const fresh = strips.doc === doc && Date.now() - strips.at < maxAgeMs && strips.els.every((e) => e.isConnected);
  if (fresh)
    return strips.els;
  const view = doc.defaultView;
  const W = view.innerWidth || 1280;
  const out = [];
  for (const el of Array.from(doc.querySelectorAll("body *"))) {
    if (el.closest("[data-spindeck-root]"))
      continue;
    const r = el.getBoundingClientRect();
    if (r.top > 2 || r.bottom < 20 || r.height > 140 || r.width < W * 0.8)
      continue;
    if (el.classList.contains(CLEAR_CLASS) || isPainted(view, el))
      out.push(el);
  }
  strips = { els: out, at: Date.now(), doc };
  return out;
}
var CLEAR_CLASS = "spindeck-clear-header";
var CLEAR_STYLE_ID = "spindeck-clear-header-style";
function removeInjectedStyles(doc) {
  doc?.getElementById(CLEAR_STYLE_ID)?.remove();
}
var learned = null;
function seedBarLook(look) {
  if (!learned && look?.color)
    learned = look;
}
function learnBarLook(els) {
  if (learned)
    return null;
  const view = els[0]?.ownerDocument?.defaultView;
  if (!view)
    return null;
  for (const el of els) {
    if (el.classList.contains(CLEAR_CLASS))
      continue;
    for (const cs of [view.getComputedStyle(el), view.getComputedStyle(el, "::before"), view.getComputedStyle(el, "::after")]) {
      if (!none(cs.backgroundColor) || !none(cs.backgroundImage)) {
        learned = { color: cs.backgroundColor, image: cs.backgroundImage, backdrop: cs.backdropFilter };
        return learned;
      }
    }
  }
  return null;
}
var learnedBarLook = () => learned;

class StyleKeeper {
  saved = new Map;
  classed = new Map;
  desired = new Map;
  observer = null;
  reapplying = false;
  watch(el) {
    if (!this.observer) {
      const MO = el.ownerDocument?.defaultView?.MutationObserver ?? MutationObserver;
      this.observer = new MO((records) => {
        if (this.reapplying)
          return;
        this.reapplying = true;
        try {
          for (const r of records) {
            const t = r.target;
            const d = this.desired.get(t);
            if (d)
              this.apply(t, d.props, d.cls);
          }
        } finally {
          this.reapplying = false;
        }
      });
    }
    this.observer.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
  }
  set(el, props, cls) {
    const isNew = !this.desired.has(el);
    this.desired.set(el, { props, cls });
    this.apply(el, props, cls);
    if (isNew)
      this.watch(el);
  }
  apply(el, props, cls) {
    let m = this.saved.get(el);
    if (!m)
      this.saved.set(el, m = new Map);
    for (const [p, v] of Object.entries(props)) {
      if (!m.has(p))
        m.set(p, [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]);
      if (el.style.getPropertyValue(p) !== v || el.style.getPropertyPriority(p) !== "important")
        el.style.setProperty(p, v, "important");
    }
    for (const [p, orig] of [...m]) {
      if (p in props)
        continue;
      this.restoreProp(el, p, orig);
      m.delete(p);
    }
    const had = this.classed.get(el);
    if (had && had !== cls) {
      el.classList.remove(had);
      this.classed.delete(el);
    }
    if (cls) {
      if (!el.classList.contains(cls))
        el.classList.add(cls);
      this.classed.set(el, cls);
    }
  }
  keepOnly(keep) {
    for (const el of [...this.saved.keys()])
      if (!keep.has(el))
        this.release(el);
  }
  release(el) {
    this.desired.delete(el);
    this.reapplying = true;
    try {
      const m = this.saved.get(el);
      if (m)
        for (const [p, orig] of m)
          this.restoreProp(el, p, orig);
      this.saved.delete(el);
      const cls = this.classed.get(el);
      if (cls)
        el.classList.remove(cls);
      this.classed.delete(el);
    } finally {
      this.reapplying = false;
    }
    this.observer?.takeRecords();
    this.rewatch();
  }
  releaseAll() {
    for (const el of [...this.saved.keys()])
      this.release(el);
    this.observer?.disconnect();
    this.observer = null;
  }
  rewatch() {
    if (!this.observer)
      return;
    this.observer.disconnect();
    for (const el of this.desired.keys())
      this.observer.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
  }
  restoreProp(el, p, [v, prio]) {
    if (v)
      el.style.setProperty(p, v, prio);
    else
      el.style.removeProperty(p);
  }
}
var CLEAR_PROPS = { background: "transparent", "backdrop-filter": "none", "box-shadow": "none" };
var INJECTED_CSS = `.${CLEAR_CLASS}::before, .${CLEAR_CLASS}::after { background: transparent !important; backdrop-filter: none !important; box-shadow: none !important; }`;
function ensureClearStyle(doc) {
  let st = doc.getElementById(CLEAR_STYLE_ID);
  if (!st) {
    st = doc.createElement("style");
    st.id = CLEAR_STYLE_ID;
    doc.head.appendChild(st);
  }
  if (st.textContent !== INJECTED_CSS)
    st.textContent = INJECTED_CSS;
}
function sweepLeftovers() {
  const docs = new Set;
  try {
    for (const el of [document, ...Array.from(globalThis.g_PopupManager?.GetPopups?.() ?? []).map((p) => p?.m_popup?.document)]) {
      if (el)
        docs.add(el);
    }
  } catch {}
  if (cachedSearch?.ownerDocument)
    docs.add(cachedSearch.ownerDocument);
  if (strips.doc)
    docs.add(strips.doc);
  for (const doc of docs) {
    try {
      doc.querySelectorAll("[data-spindeck-spacer]").forEach((e) => e.remove());
      doc.querySelectorAll(`.${CLEAR_CLASS}`).forEach((e) => e.classList.remove(CLEAR_CLASS));
      removeInjectedStyles(doc);
    } catch {}
  }
}

// src/constants.ts
var SLIDE_MS = 300;
var SLIDE_SETTLED_MS = 320;
var SWITCH_COOLDOWN_MS = 700;
var HOLD_REPEAT_MS = 250;
var HOLD_GRACE_MS = 300;
var HIDDEN_ROW_GRACE_MS = 600;
var UP_FOCUS_WINDOW_MS = 500;
var ARRIVAL_IGNORE_MS = 700;
var CIRCLE_START_DELAY_MS = 500;
var WINDOW_REFOCUS_DELAY_MS = 800;
var HAPTIC_MUTE_AFTER_B_MS = 500;
var HERO_SETTLE_MS = 150;
var ACHIEVEMENTS_DELAY_MS = 200;
var WHEEL_FOLLOW_TAU_MS = 55;
var WHEEL_MAX_LAG = 2;
var SCROLL_SETTLE_MS = 140;
var HEADER_REAPPLY_MS = 1000;
var HEADER_RESCAN_MS = 5000;
var ROULETTE_MIN_STEPS = 22;
var ROULETTE_MAX_EXTRA_STEPS = 30;
var ROULETTE_STEP_MS = 35;
var ROULETTE_SLOWDOWN_MS = 320;
var ROULETTE_EASE = 2.6;
var ROULETTE_RESULT_MS = 4000;
var LETTER_POPUP_MS = 1000;
var LETTER_FAST_STEPS = 3;
var LETTER_FAST_WINDOW_MS = 600;
var ODOMETER_SAVE_MS = 3000;
var TOAST_MS = 3500;
var TOAST_TOP_PX = 84;
var VIEW_STRIP_MS = 1800;
var VIEW_STRIP_TOP_PX = 44;

// src/WheelPage.tsx
var BASE_CAPSULE_W = 80;
var BASE_CAPSULE_H = 120;
var BASE_TITLE_PX = 22;
var BASE_TITLE_PX_SIDE = 18;
var NAMES_EACH_SIDE = 3;
function FallbackImg({ srcs, style, className }) {
  const [i, setI] = useState(0);
  const key = srcs.join("|");
  useEffect(() => setI(0), [key]);
  if (i >= srcs.length)
    return /* @__PURE__ */ window.SP_REACT.createElement("div", {
      className,
      style: { ...style, background: "#1b2838" }
    });
  return /* @__PURE__ */ window.SP_REACT.createElement("img", {
    className,
    style,
    src: srcs[i],
    onError: () => setI(i + 1)
  });
}
var preloaded = new Set;
function preload(url) {
  if (!url || preloaded.has(url))
    return;
  preloaded.add(url);
  try {
    const img = new Image;
    img.src = url;
  } catch {}
}

class WheelMotion {
  target = 0;
  pos = 0;
  raf = null;
  listeners = new Set;
  view = globalThis;
  subscribe(l) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  step(dir) {
    this.target += dir;
    this.kick();
  }
  stop() {
    if (this.raf != null)
      (this.view.cancelAnimationFrame ?? clearTimeout)(this.raf);
    this.raf = null;
  }
  kick() {
    if (this.raf != null)
      return;
    const raf = (f) => this.view.requestAnimationFrame ? this.view.requestAnimationFrame(f) : setTimeout(() => f(Date.now()), 16);
    let last = 0;
    const frame = (t) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      let pos = this.pos;
      const gap = this.target - pos;
      if (Math.abs(gap) > WHEEL_MAX_LAG)
        pos = this.target - Math.sign(gap) * WHEEL_MAX_LAG;
      pos += (this.target - pos) * (1 - Math.exp(-dt / WHEEL_FOLLOW_TAU_MS));
      if (Math.abs(this.target - pos) < 0.002)
        pos = this.target;
      this.pos = pos;
      this.listeners.forEach((l) => l(pos));
      this.raf = pos !== this.target ? raf(frame) : null;
    };
    this.raf = raf(frame);
  }
}
var WheelRing = memo(function WheelRing(p) {
  const { games, sel, motion, W, H, flip } = p;
  const n = games.length;
  const [vis, setVis] = useState(motion.pos);
  useEffect(() => motion.subscribe(setVis), [motion]);
  const cx = flip ? -W * 0.02 : W * 1.02;
  const cy = H / 2;
  const R = W * (p.wheelSizePct / 100);
  const visibleHalfAngle = Math.asin(Math.min(1, H / 2 / R)) * 0.92;
  const visibleEachSide = Math.max(1, Math.floor((p.visibleCount - 1) / 2));
  const spacingRad = visibleHalfAngle / visibleEachSide;
  const capW = BASE_CAPSULE_W * p.capsuleScale;
  const capH = BASE_CAPSULE_H * p.capsuleScale;
  const span = Math.min(visibleEachSide + 1, Math.floor((n - 1) / 2));
  useEffect(() => {
    for (let off = span + 1;off <= span + 3; off++) {
      preload(games[(sel + off) % n]?.capsule[0]);
      preload(games[((sel - off) % n + n) % n]?.capsule[0]);
    }
  }, [sel, n]);
  if (!n)
    return null;
  const vRel = vis - motion.target;
  const base = Math.round(vRel);
  const frac = vRel - base;
  const items = [];
  for (let off = -span;off <= span; off++) {
    const idx = ((sel + base + off) % n + n) % n;
    const g = games[idx];
    const rel = off - frac;
    const theta = flip ? -rel * spacingRad : Math.PI + rel * spacingRad;
    const x = cx + R * Math.cos(theta);
    const y = cy - R * Math.sin(theta);
    const dist = Math.abs(rel);
    const selected = idx === sel;
    const scale = dist < 1 ? 1 - 0.23 * dist : Math.max(0.55, 0.82 - dist * 0.05);
    const shade = dist < 1 ? 1 - 0.32 * dist : Math.max(0.35, 0.8 - dist * 0.12);
    const nameFade = Math.max(0, Math.min(1, (NAMES_EACH_SIDE + 0.6 - dist) / 0.6));
    items.push(/* @__PURE__ */ window.SP_REACT.createElement("div", {
      key: g.appid,
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        transform: flip ? `translate(${x}px, ${y}px) translate(calc(-100% + ${capW / 2}px), -50%) scale(${scale})` : `translate(${x}px, ${y}px) translate(${-capW / 2}px, -50%) scale(${scale})`,
        transformOrigin: flip ? "right center" : "left center",
        flexDirection: flip ? "row-reverse" : "row",
        display: "flex",
        alignItems: "center",
        gap: selected ? 16 : 28,
        zIndex: 100 - Math.round(dist * 10),
        pointerEvents: "none"
      }
    }, /* @__PURE__ */ window.SP_REACT.createElement(FallbackImg, {
      srcs: g.capsule,
      style: {
        width: capW,
        height: capH,
        objectFit: "cover",
        borderRadius: 8,
        boxShadow: selected ? `0 0 0 3px ${p.accentColor}, 0 8px 24px #000a` : "0 6px 16px #000c",
        filter: selected ? undefined : `brightness(${shade})`
      }
    }), /* @__PURE__ */ window.SP_REACT.createElement("div", {
      style: {
        maxWidth: Math.max(200, 300 * p.textScale),
        fontSize: (selected ? BASE_TITLE_PX : BASE_TITLE_PX_SIDE) * p.textScale,
        fontWeight: selected ? 700 : 500,
        color: "#fff",
        opacity: (selected ? 1 : Math.max(0.35, shade)) * nameFade,
        textShadow: "0 2px 6px #000",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        whiteSpace: "normal",
        overflow: "hidden",
        lineHeight: 1.2,
        textAlign: flip ? "right" : "left"
      }
    }, g.name)));
  }
  return /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { position: "absolute", inset: 0 }
  }, items);
});
var Hero = memo(function Hero({ game, flip, heroScale }) {
  if (!game)
    return null;
  const srcs = [...game.hero, ...game.capsule];
  return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(FallbackImg, {
    key: `bg-${game.appid}`,
    className: "dw-hero",
    srcs,
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      filter: "blur(28px) brightness(0.42) saturate(1.2)",
      transform: "scale(1.12)"
    }
  }), /* @__PURE__ */ window.SP_REACT.createElement(FallbackImg, {
    key: `fg-${game.appid}`,
    className: "dw-hero",
    srcs,
    style: {
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      [flip ? "right" : "left"]: 0,
      width: `${heroScale}%`,
      maxHeight: "92%",
      objectFit: "contain",
      objectPosition: flip ? "right center" : "left center",
      WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, #000 30%, #000 70%, transparent 100%), linear-gradient(to ${flip ? "left" : "right"}, #000 72%, transparent 100%)`,
      WebkitMaskComposite: "source-in"
    }
  }), /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { position: "absolute", inset: 0, background: "linear-gradient(to top, #000a 0%, transparent 40%)", pointerEvents: "none" }
  }));
});
function useSettled(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
var lastPick = new Map;
var lastViewKey = null;
function WheelPage({ mode = "page", onWheelFocus, onRequestSections, active = true }) {
  const s = useSettings();
  const t = useT();
  const views = useMemo(() => {
    const lib = (scope) => ({ key: `base:${scope}`, name: scope === "installed" ? t.installed : t.all, collection: null, installedOnly: scope === "installed" });
    const base = lib(s.libraryScope);
    const colls = listCollections();
    const coll = (id) => {
      const c = colls.find((x) => x.id === id);
      return c ? { key: `coll:${c.id}`, name: c.name, collection: c.id, installedOnly: false } : null;
    };
    const left = s.favoritesOnL1 ? coll("favorite") : null;
    const right = !s.r1View ? null : s.r1View.startsWith("base:") ? lib(s.r1View.slice(5)) : coll(s.r1View);
    return [left, base, right && right.key !== base.key ? right : null].filter((v) => !!v);
  }, [s.libraryScope, s.favoritesOnL1, s.r1View, t]);
  const baseKey = `base:${s.libraryScope}`;
  const [viewKey, setViewKey] = useState(() => lastViewKey ?? baseKey);
  const view = views.find((v) => v.key === viewKey) ?? views.find((v) => v.key === baseKey) ?? views[0];
  useEffect(() => {
    lastViewKey = view.key;
  }, [view.key]);
  const games = useMemo(() => view.collection ? loadCollectionGames(view.collection, s.sortMode) : loadGames(view.installedOnly, s.sortMode), [view.key, s.sortMode]);
  const n = games.length;
  const restoreSel = (list) => {
    const id = lastPick.get(view.key);
    const i = id === undefined ? -1 : list.findIndex((g) => g.appid === id);
    return i < 0 ? 0 : i;
  };
  const [sel, setSel] = useState(() => restoreSel(games));
  const [selList, setSelList] = useState(games);
  if (selList !== games) {
    setSelList(games);
    setSel(restoreSel(games));
  }
  useEffect(() => {
    const g = games[sel];
    if (g)
      lastPick.set(view.key, g.appid);
  }, [sel, games, view.key]);
  const rootRef = useRef(null);
  const motion = useMemo(() => new WheelMotion, []);
  useEffect(() => () => motion.stop(), [motion]);
  const live = useRef({ sound: s.soundEnabled, haptic: s.hapticEnabled, pad: s.rotatePad, circleOn: false, hapticLevel: s.hapticLevel, stepDegrees: s.stepDegrees, hapticDegrees: s.hapticDegrees });
  live.current.hapticLevel = s.hapticLevel;
  live.current.sound = s.soundEnabled;
  live.current.haptic = s.hapticEnabled;
  live.current.pad = s.rotatePad;
  const hapticMuteUntil = useRef(0);
  const spinningRef = useRef(false);
  const advance = (dir, haptic) => {
    setSel((v) => (v + dir + n) % n);
    motion.step(dir);
    if (live.current.sound)
      playUiSound("step");
    if (haptic && live.current.haptic && Date.now() > hapticMuteUntil.current)
      wheelTick(live.current.pad, live.current.circleOn, live.current.hapticLevel);
  };
  const move = (dir, source) => {
    if (!n || spinningRef.current)
      return;
    advance(dir, source === "pad");
  };
  const detentTick = () => {
    if (!n || spinningRef.current || !live.current.haptic || Date.now() <= hapticMuteUntil.current)
      return;
    wheelTick(live.current.pad, live.current.circleOn, live.current.hapticLevel);
  };
  const [toast, setToast] = useState({ text: "", show: false });
  const toastTimer = useRef(null);
  const showToast = (text) => {
    setToast({ text, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((x) => ({ ...x, show: false }));
      toastTimer.current = setTimeout(() => setToast({ text: "", show: false }), 300);
    }, TOAST_MS);
  };
  const pendingTurns = useRef(0);
  const odoTimer = useRef(null);
  const flushOdometer = () => {
    clearTimeout(odoTimer.current);
    if (!pendingTurns.current || !settingsLoaded())
      return;
    const total = Math.round((getSettings().odometerTurns + pendingTurns.current) * 100) / 100;
    pendingTurns.current = 0;
    updateSettings({ odometerTurns: total });
  };
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    flushOdometer();
  }, []);
  const onFingerTurn = (d) => {
    const before = getSettings().odometerTurns + pendingTurns.current;
    pendingTurns.current += Math.abs(d) / (2 * Math.PI);
    const hit = settingsLoaded() ? crossedMilestone(before, before + Math.abs(d) / (2 * Math.PI)) : null;
    clearTimeout(odoTimer.current);
    odoTimer.current = setTimeout(flushOdometer, ODOMETER_SAVE_MS);
    if (hit !== null) {
      showToast(t.milestone(hit.toLocaleString()));
      if (live.current.sound)
        playUiSound("detail");
    }
  };
  const [strip, setStrip] = useState(false);
  const stripTimer = useRef(null);
  useEffect(() => () => clearTimeout(stripTimer.current), []);
  const switchView = (d) => {
    if (views.length < 2)
      return;
    if (spinningRef.current)
      stopSpin(false);
    const j = views.findIndex((v) => v.key === view.key) + d;
    if (j < 0 || j >= views.length)
      return;
    setViewKey(views[j].key);
    if (live.current.sound)
      playUiSound("screen");
    setStrip(true);
    clearTimeout(stripTimer.current);
    stripTimer.current = setTimeout(() => setStrip(false), VIEW_STRIP_MS);
  };
  const spinTimer = useRef(null);
  const doneTimer = useRef(null);
  const [roulette, setRoulette] = useState("idle");
  useEffect(() => () => {
    clearTimeout(spinTimer.current);
    clearTimeout(doneTimer.current);
  }, []);
  const stopSpin = (finished) => {
    clearTimeout(spinTimer.current);
    spinningRef.current = false;
    setRoulette(finished ? "done" : "idle");
    clearTimeout(doneTimer.current);
    if (finished) {
      if (live.current.sound)
        playUiSound("detail");
      doneTimer.current = setTimeout(() => setRoulette("idle"), ROULETTE_RESULT_MS);
    }
  };
  const spin = () => {
    if (n < 2 || spinningRef.current)
      return;
    spinningRef.current = true;
    setRoulette("spinning");
    const dir = live.current.pad === "right" ? -1 : 1;
    let steps;
    if (n <= ROULETTE_MAX_EXTRA_STEPS) {
      steps = ROULETTE_MIN_STEPS + Math.floor(Math.random() * n);
    } else {
      const target = Math.floor(Math.random() * n);
      steps = ROULETTE_MIN_STEPS + Math.floor(Math.random() * ROULETTE_MAX_EXTRA_STEPS);
      setSel(((target - dir * steps) % n + n) % n);
    }
    debug("roulette", "spin", { games: n, steps });
    let i = 0;
    const tick = () => {
      advance(dir, true);
      i++;
      if (i >= steps)
        return stopSpin(true);
      spinTimer.current = setTimeout(tick, ROULETTE_STEP_MS + ROULETTE_SLOWDOWN_MS * Math.pow(i / steps, ROULETTE_EASE));
    };
    tick();
  };
  const [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const el = rootRef.current;
    if (!el)
      return;
    motion.view = el.ownerDocument?.defaultView ?? globalThis;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 100 && h > 100)
        setSize((p) => p.w === w && p.h === h ? p : { w, h });
    };
    measure();
    const RO = motion.view.ResizeObserver;
    const ro = RO ? new RO(measure) : null;
    ro?.observe(el);
    const tm = setTimeout(measure, 300);
    return () => {
      ro?.disconnect();
      clearTimeout(tm);
    };
  }, []);
  const [winFocused, setWinFocused] = useState(true);
  useEffect(() => {
    const view = rootRef.current?.ownerDocument?.defaultView;
    if (!view)
      return;
    let tm;
    const on = () => {
      clearTimeout(tm);
      tm = setTimeout(() => setWinFocused(true), WINDOW_REFOCUS_DELAY_MS);
    };
    const off = () => {
      clearTimeout(tm);
      setWinFocused(false);
    };
    setWinFocused(view.document?.hasFocus?.() ?? true);
    view.addEventListener("focus", on);
    view.addEventListener("blur", off);
    return () => {
      clearTimeout(tm);
      view.removeEventListener("focus", on);
      view.removeEventListener("blur", off);
    };
  }, []);
  const [wheelFocused, setWheelFocused] = useState(true);
  const inputLive = active && winFocused && wheelFocused;
  const activeSince = useRef(Date.now());
  useEffect(() => {
    if (active)
      activeSince.current = Date.now();
  }, [active]);
  useEffect(() => {
    if (!inputLive)
      return;
    const opts = { stepDegrees: s.stepDegrees, pad: s.rotatePad, onStep: (d) => move(d, "pad") };
    let unsubAnalog = () => {};
    const startT = s.rawPadApi ? setTimeout(() => {
      unsubAnalog = subscribeKeyboardAnalogWheel({
        ...opts,
        onStep: (d) => move(d, "analog"),
        detentDegrees: s.hapticDegrees,
        onDetent: detentTick,
        onTurn: onFingerTurn
      });
      live.current.circleOn = true;
    }, CIRCLE_START_DELAY_MS) : undefined;
    const el = rootRef.current;
    const unsubCursor = el ? subscribeCursorWheel(el, opts) : () => {};
    const unsubWheel = el ? subscribeScrollWheel(el, opts) : () => {};
    return () => {
      clearTimeout(startT);
      live.current.circleOn = false;
      unsubAnalog();
      unsubCursor();
      unsubWheel();
    };
  }, [s.stepDegrees, s.hapticDegrees, s.rotatePad, s.rawPadApi, n, inputLive]);
  const current = games[sel];
  const heroSel = useSettled(sel, HERO_SETTLE_MS);
  const alpha = s.sortMode === "alpha" && !view.collection && !view.installedOnly;
  const letters = useMemo(() => games.map((g) => indexLetter(g.name)), [games]);
  const letterCounts = useMemo(() => {
    const m = new Map;
    for (const L of letters)
      m.set(L, (m.get(L) ?? 0) + 1);
    return m;
  }, [letters]);
  const [popup, setPopup] = useState({ letter: "", show: false });
  const lastLetter = useRef(null);
  const popupTimer = useRef(null);
  useEffect(() => () => clearTimeout(popupTimer.current), []);
  const recentSteps = useRef([]);
  const lettersSeen = useRef(letters);
  useEffect(() => {
    const L = letters[sel];
    if (lettersSeen.current !== letters) {
      lettersSeen.current = letters;
      lastLetter.current = L ?? null;
      return;
    }
    if (!alpha || !L)
      return;
    const prev = lastLetter.current;
    lastLetter.current = L;
    if (prev === null)
      return;
    const now = Date.now();
    const steps = recentSteps.current = [...recentSteps.current.filter((t) => now - t < LETTER_FAST_WINDOW_MS), now];
    if (prev === L && steps.length < LETTER_FAST_STEPS)
      return;
    debug("letter", "show", L, prev === L ? "(fast spin)" : "(new letter)");
    setPopup({ letter: L, show: true });
    clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup((p) => ({ ...p, show: false })), LETTER_POPUP_MS);
  }, [sel, alpha, letters]);
  const [ach, setAch] = useState(null);
  useEffect(() => {
    setAch(null);
    if (!current)
      return;
    let unsub = () => {};
    const tm = setTimeout(() => unsub = subscribeAchievements(current.appid, setAch), ACHIEVEMENTS_DELAY_MS);
    return () => {
      clearTimeout(tm);
      unsub();
    };
  }, [current?.appid]);
  const circleInputOn = s.rawPadApi && inputLive;
  const padButtons = s.rotatePad === "right" ? [GamepadButton.RPAD_TOUCH, GamepadButton.RPAD_CLICK] : [GamepadButton.LPAD_TOUCH, GamepadButton.LPAD_CLICK];
  const onPadButton = (e) => {
    if (e.detail.button === GamepadButton.CANCEL)
      hapticMuteUntil.current = Date.now() + HAPTIC_MUTE_AFTER_B_MS;
    if (circleInputOn && padButtons.includes(e.detail.button)) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
  };
  const consume = (e) => {
    e.preventDefault?.();
    e.stopPropagation?.();
  };
  const onDir = (e) => {
    const b = e.detail.button;
    if (mode === "home" && (b === GamepadButton.DIR_UP || b === GamepadButton.DIR_DOWN)) {
      if (e.detail.is_repeat || Date.now() - activeSince.current < ARRIVAL_IGNORE_MS)
        return consume(e);
      if (b === GamepadButton.DIR_UP) {
        const box = findHeaderSearch(rootRef.current?.ownerDocument);
        if (box)
          box.focus();
        else
          Navigation.Navigate("/search");
      } else
        onRequestSections?.();
      return consume(e);
    }
    const next = b === GamepadButton.DIR_RIGHT || mode === "page" && b === GamepadButton.DIR_DOWN;
    const prev = b === GamepadButton.DIR_LEFT || mode === "page" && b === GamepadButton.DIR_UP;
    if (!next && !prev)
      return;
    move(next ? 1 : -1, "dpad");
    consume(e);
  };
  const flip = s.rotatePad === "left";
  return /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    autoFocus: true,
    noFocusRing: true,
    onGamepadDirection: onDir,
    onButtonDown: (e) => {
      const b = e.detail.button;
      if ((b === GamepadButton.BUMPER_LEFT || b === GamepadButton.BUMPER_RIGHT) && views.length > 1) {
        consume(e);
        switchView(b === GamepadButton.BUMPER_LEFT ? -1 : 1);
        return;
      }
      onPadButton(e);
    },
    onButtonUp: onPadButton,
    onOKButton: () => {
      if (!current)
        return;
      if (s.soundEnabled)
        playUiSound("detail");
      openGamePage(current);
    },
    onOKActionDescription: t.gamePage,
    onOptionsButton: (e) => {
      consume(e);
      debug("roulette", "Y", { spinning: spinningRef.current, games: n });
      if (spinningRef.current)
        stopSpin(true);
      else
        spin();
    },
    onOptionsActionDescription: t.roulette,
    onMenuButton: (e) => {
      if (current)
        openNativeGameMenu(current.appid, current.overview, e?.currentTarget ?? rootRef.current ?? undefined, rootRef.current?.ownerDocument?.defaultView);
    },
    onMenuActionDescription: t.options,
    onCancelButton: mode === "page" ? () => Navigation.NavigateBack() : undefined,
    onGamepadFocus: () => {
      setWheelFocused(true);
      onWheelFocus?.();
    },
    onGamepadBlur: () => setWheelFocused(false),
    style: {
      position: mode === "home" ? "absolute" : "fixed",
      inset: 0,
      background: "#0b0f16",
      overflow: "hidden",
      zIndex: mode === "home" ? undefined : 900
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    ref: rootRef,
    style: { position: "absolute", inset: 0, overflow: "hidden" }
  }, /* @__PURE__ */ window.SP_REACT.createElement("style", null, `
          /* Opacity only: animating transform would override the art's own
             positioning (translateY(-50%)) and make it jump into place. */
          @keyframes dwFade { from { opacity: 0; } to { opacity: 1; } }
          .dw-hero { animation: dwFade 220ms ease-out; }
        `), /* @__PURE__ */ window.SP_REACT.createElement(Hero, {
    game: games[heroSel],
    flip,
    heroScale: s.heroScale
  }), /* @__PURE__ */ window.SP_REACT.createElement(WheelRing, {
    games,
    sel,
    motion,
    W: size.w,
    H: size.h,
    flip,
    wheelSizePct: s.wheelSizePct,
    visibleCount: s.visibleCount,
    capsuleScale: s.capsuleScale,
    textScale: s.textScale,
    accentColor: s.accentColor
  }), alpha && popup.letter && /* @__PURE__ */ window.SP_REACT.createElement(LetterPopup, {
    letter: popup.letter,
    count: letterCounts.get(popup.letter) ?? 0,
    show: popup.show,
    accent: s.accentColor,
    label: t.letterCount
  }), views.length > 1 && /* @__PURE__ */ window.SP_REACT.createElement(ViewStrip, {
    views,
    current: view.key,
    show: strip,
    accent: s.accentColor
  }), /* @__PURE__ */ window.SP_REACT.createElement(Toast, {
    text: toast.text,
    show: toast.show,
    accent: s.accentColor,
    side: flip ? "right" : "left"
  }), !n && /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { position: "absolute", [flip ? "left" : "right"]: 60, top: "48%", color: "#aaa", fontSize: 20 }
  }, t.noGames), /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: {
      position: "absolute",
      [flip ? "right" : "left"]: 40,
      bottom: 32,
      color: "#fff",
      textShadow: "0 2px 8px #000",
      textAlign: flip ? "right" : "left"
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement(RoulettePill, {
    state: roulette,
    accent: s.accentColor,
    label: roulette === "spinning" ? t.rouletteSpinning : roulette === "done" && current ? t.rouletteDone(current.name) : t.roulette
  }), current && /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: flip ? "flex-end" : "flex-start",
      gap: 6,
      marginBottom: 6,
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: "0.08em"
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { color: s.accentColor }
  }, current.name.toUpperCase(), " · ", t.playtime(Number(current.overview?.minutes_playtime_forever ?? 0))), ach && /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#c8d1dc" }
  }, "STEAM ACHIEVEMENTS ", ach.achieved, "/", ach.total, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { width: 80, height: 4, borderRadius: 2, background: "#ffffff33", overflow: "hidden" }
  }, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { display: "block", height: "100%", width: `${ach.achieved / ach.total * 100}%`, background: s.accentColor }
  })))), /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }
  }, s.ownerText), s.subtitleText && /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { fontSize: 16, opacity: 0.8, marginTop: 4 }
  }, s.subtitleText))));
}
var CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
function indexLetter(name) {
  const ch = (name.trim()[0] ?? "#").toUpperCase();
  const code = ch.charCodeAt(0);
  if (code >= 44032 && code <= 55203)
    return CHOSEONG[Math.floor((code - 44032) / 588)];
  if (/[A-Z]/.test(ch) || /[\u3131-\u314e]/.test(ch))
    return ch;
  if (/\p{L}/u.test(ch))
    return ch;
  return "#";
}
function LetterPopup({ letter, count, show, accent, label }) {
  return /* @__PURE__ */ window.SP_REACT.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: 200,
      height: 200,
      borderRadius: 28,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      background: "rgba(11, 15, 22, 0.88)",
      boxShadow: "0 0 36px 18px rgba(11, 15, 22, 0.7)",
      opacity: show ? 1 : 0,
      transition: show ? "opacity 80ms ease-out" : "opacity 300ms ease-in",
      pointerEvents: "none",
      zIndex: 300
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { fontSize: 120, fontWeight: 800, lineHeight: 1, color: accent }
  }, letter), /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { fontSize: 13, color: "#c8d1dc" }
  }, label.replace("{n}", String(count))));
}
function ViewStrip({ views, current, show, accent }) {
  const i = Math.max(0, views.findIndex((v) => v.key === current));
  const at = (d) => views[i + d];
  const label = (v) => (v.collection === "favorite" ? "★ " : "") + v.name;
  const side = { color: "#8b929a", fontSize: 15, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const key = { fontSize: 12, fontWeight: 800, color: "#c8d1dc", background: "rgba(255,255,255,0.14)", borderRadius: 6, padding: "2px 7px" };
  return /* @__PURE__ */ window.SP_REACT.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: VIEW_STRIP_TOP_PX,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "8px 16px",
      borderRadius: 999,
      background: "rgba(11, 15, 22, 0.85)",
      opacity: show ? 1 : 0,
      transition: show ? "opacity 120ms ease-out" : "opacity 400ms ease-in",
      pointerEvents: "none",
      zIndex: 260,
      whiteSpace: "nowrap"
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { ...key, opacity: at(-1) ? 1 : 0.3 }
  }, "L1"), at(-1) && /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: side
  }, label(at(-1))), /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { color: accent, fontSize: 18, fontWeight: 800 }
  }, label(at(0))), at(1) && /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: side
  }, label(at(1))), /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { ...key, opacity: at(1) ? 1 : 0.3 }
  }, "R1"));
}
function Toast({ text, show, accent, side }) {
  if (!text)
    return null;
  return /* @__PURE__ */ window.SP_REACT.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: TOAST_TOP_PX,
      [side]: 40,
      maxWidth: "45%",
      whiteSpace: "nowrap",
      zIndex: 250,
      padding: "6px 14px",
      borderRadius: 999,
      background: "rgba(11, 15, 22, 0.78)",
      boxShadow: `0 0 0 1px ${accent}88`,
      color: "#fff",
      fontSize: 15,
      fontWeight: 600,
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(6px)",
      transition: "opacity 250ms ease, transform 250ms ease",
      pointerEvents: "none"
    }
  }, text);
}
function RoulettePill({ state, accent, label }) {
  const idle = state === "idle";
  return /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      padding: "5px 12px 5px 6px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textShadow: "none",
      background: idle ? "#0b0f16aa" : accent,
      color: idle ? "#e6edf3" : "#0b0f16",
      boxShadow: `0 0 0 1px ${accent}88`,
      transition: "background 200ms, color 200ms"
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 10,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 900,
      background: idle ? "#e3b341" : "#0b0f16",
      color: idle ? "#0b0f16" : "#e3b341"
    }
  }, "Y"), label);
}

// src/hangul.ts
var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
var JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
var JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
var V2 = { ㅗㅏ: "ㅘ", ㅗㅐ: "ㅙ", ㅗㅣ: "ㅚ", ㅜㅓ: "ㅝ", ㅜㅔ: "ㅞ", ㅜㅣ: "ㅟ", ㅡㅣ: "ㅢ" };
var C2 = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ"
};
var C2_SPLIT = Object.fromEntries(Object.entries(C2).map(([k, v]) => [v, [k[0], k[1]]]));
var isCons = (c) => CHO.includes(c) || JONG.includes(c) && c !== " ";
var isVowel = (c) => JUNG.includes(c);
function decompose(s) {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 44032;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    const jong = code % 28;
    const jung = (code - jong) / 28 % 21;
    const cho = Math.floor(code / 588);
    out += CHO[cho] + JUNG[jung];
    if (jong)
      out += C2_SPLIT[JONG[jong]]?.join("") ?? JONG[jong];
  }
  return out;
}
function toCompat(s) {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 4352 && c <= 4370)
      out += CHO[c - 4352];
    else if (c >= 4449 && c <= 4469)
      out += JUNG[c - 4449];
    else if (c >= 4520 && c <= 4546)
      out += JONG[c - 4520 + 1];
    else
      out += ch;
  }
  return out;
}
function composeHangul(raw) {
  const input = toCompat(raw);
  if (!/[ㄱ-ㅣ]/.test(input))
    return input;
  const s = decompose(input);
  let out = "";
  let cho = "", jung = "", jong = "";
  const flush = () => {
    if (cho && jung) {
      out += String.fromCharCode(44032 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + Math.max(0, JONG.indexOf(jong || " ")));
    } else
      out += cho + jung + jong;
    cho = jung = jong = "";
  };
  for (const c of s) {
    if (isCons(c)) {
      if (cho && jung && !jong && JONG.includes(c))
        jong = c;
      else if (jong && C2[jong + c])
        jong = C2[jong + c];
      else {
        flush();
        if (CHO.includes(c))
          cho = c;
        else
          out += c;
      }
    } else if (isVowel(c)) {
      if (cho && !jung)
        jung = c;
      else if (jung && !jong && V2[jung + c])
        jung = V2[jung + c];
      else if (jong) {
        const split = C2_SPLIT[jong];
        const moved = split ? split[1] : jong;
        jong = split ? split[0] : "";
        flush();
        cho = moved;
        jung = c;
      } else {
        flush();
        out += c;
      }
    } else {
      flush();
      out += c;
    }
  }
  flush();
  return out;
}
function toJamo(s) {
  return decompose(toCompat(s));
}

// src/HangulPad.tsx
var ROWS = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"]
];
var SHIFT = { ㅂ: "ㅃ", ㅈ: "ㅉ", ㄷ: "ㄸ", ㄱ: "ㄲ", ㅅ: "ㅆ", ㅐ: "ㅒ", ㅔ: "ㅖ" };
function Pad({ title, initial, onDone, closeModal }) {
  const [buf, setBuf] = useState(() => Array.from(toJamo(initial)));
  const [shift, setShift] = useState(false);
  const text = composeHangul(buf.join(""));
  const key = (k) => {
    setBuf((b) => [...b, shift && SHIFT[k] ? SHIFT[k] : k]);
    setShift(false);
  };
  const btn = { minWidth: 0, width: 52, height: 44, padding: 0, fontSize: 20 };
  return /* @__PURE__ */ window.SP_REACT.createElement(ModalRoot, {
    closeModal,
    onCancel: closeModal
  }, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { fontSize: 14, opacity: 0.7, marginBottom: 6 }
  }, title), /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { fontSize: 26, fontWeight: 700, minHeight: 36, marginBottom: 12, borderBottom: "1px solid #ffffff33" }
  }, text || " ", /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { opacity: 0.5 }
  }, "|")), /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }
  }, ROWS.map((row, r) => /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    key: r,
    "flow-children": "row",
    style: { display: "flex", gap: 6 }
  }, row.map((k) => /* @__PURE__ */ window.SP_REACT.createElement(DialogButton, {
    key: k,
    style: btn,
    onClick: () => key(k)
  }, shift && SHIFT[k] ? SHIFT[k] : k)))), /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    "flow-children": "row",
    style: { display: "flex", gap: 6, marginTop: 4 }
  }, /* @__PURE__ */ window.SP_REACT.createElement(DialogButton, {
    style: { ...btn, width: 90, fontSize: 15, opacity: shift ? 1 : 0.7 },
    onClick: () => setShift((v) => !v)
  }, "⇧ 쌍자음"), /* @__PURE__ */ window.SP_REACT.createElement(DialogButton, {
    style: { ...btn, width: 140, fontSize: 15 },
    onClick: () => setBuf((b) => [...b, " "])
  }, "띄어쓰기"), /* @__PURE__ */ window.SP_REACT.createElement(DialogButton, {
    style: { ...btn, width: 70, fontSize: 15 },
    onClick: () => setBuf((b) => b.slice(0, -1))
  }, "⌫"), /* @__PURE__ */ window.SP_REACT.createElement(DialogButton, {
    style: { ...btn, width: 90, fontSize: 15 },
    onClick: () => {
      onDone(text);
      closeModal?.();
    }
  }, "완료"))));
}
function openHangulPad(title, initial, onDone) {
  showModal(/* @__PURE__ */ window.SP_REACT.createElement(Pad, {
    title,
    initial,
    onDone
  }));
}

// src/HomeSwitch.tsx
function HomeSwitch({ original }) {
  const s = useSettings();
  const loaded = useSettingsLoaded();
  if (!loaded || !s.homeEnabled)
    return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, original);
  return /* @__PURE__ */ window.SP_REACT.createElement(SafeBoundary, {
    fallback: original
  }, /* @__PURE__ */ window.SP_REACT.createElement(WheelHome, {
    original
  }));
}
var SPACER_ATTR = "data-spindeck-spacer";
function isScrollableY(view, el) {
  const o = view.getComputedStyle(el).overflowY;
  return (o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 40;
}
var partsCache = new WeakMap;
function homeParts(host) {
  if (!host)
    return null;
  const hit = partsCache.get(host);
  if (hit && hit.vs.isConnected && host.contains(hit.vs) && hit.vs.contains(hit.sectionsBlock))
    return hit;
  const view = host.ownerDocument?.defaultView ?? window;
  const vs = Array.from(host.querySelectorAll("div")).find((el) => isScrollableY(view, el));
  if (!vs)
    return null;
  const kids = Array.from(vs.children).filter((el) => !el.hasAttribute(SPACER_ATTR));
  if (kids.length < 2)
    return null;
  const sectionsBlock = kids[kids.length - 1];
  const parts = {
    vs,
    sectionsBlock,
    above: kids.slice(0, -1).filter((el) => el.children.length > 0),
    header: sectionsBlock.firstElementChild?.firstElementChild ?? null
  };
  partsCache.set(host, parts);
  return parts;
}
var rowExt = new WeakMap;
function sectionsOffset(p) {
  const target = p.header ?? p.sectionsBlock;
  const vsTop = p.vs.getBoundingClientRect().top;
  const inset = Math.max(0, topBarBottom(p.vs.ownerDocument) - vsTop);
  const grown = p.header ? rowExt.get(p.header)?.ext ?? 0 : 0;
  return Math.max(0, Math.round(target.getBoundingClientRect().top + grown - vsTop + p.vs.scrollTop - inset));
}
function revealSections(host, focus = true) {
  const p = homeParts(host);
  if (!p)
    return;
  p.vs.scrollTop = sectionsOffset(p);
  if (!focus)
    return;
  const tab = p.header ? currentTab(p.header) : null;
  if (tab)
    tab.focus();
  else
    focusFirstIn(p.sectionsBlock);
}
function currentTab(row) {
  const tabs = focusablesIn(row).filter((el) => el.getBoundingClientRect().width > 0);
  if (!tabs.length)
    return null;
  const marked = tabs.find((el) => el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-current") === "true" || /(^|[\s_-])(selected|active)/i.test(el.className + " " + (el.parentElement?.className ?? "")));
  if (marked)
    return marked;
  const view = row.ownerDocument.defaultView;
  const painted = tabs.filter((el) => {
    const bg = view.getComputedStyle(el).backgroundColor;
    return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
  });
  if (painted.length === 1)
    return painted[0];
  return lastTab && tabs.includes(lastTab) ? lastTab : null;
}
var lastTab = null;
function hideFirstShelf(host, mode) {
  const p = homeParts(host);
  if (!p || !p.above.length)
    return null;
  const prev = p.above.map((el) => [el.style.visibility, el.style.pointerEvents]);
  p.above.forEach((el) => {
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
  });
  const spacer = p.vs.ownerDocument.createElement("div");
  spacer.setAttribute(SPACER_ATTR, "");
  spacer.style.height = `${p.vs.clientHeight}px`;
  spacer.style.pointerEvents = "none";
  p.vs.appendChild(spacer);
  const clamp = () => {
    const m = mode();
    if (m === "top") {
      if (p.vs.scrollTop > 0)
        p.vs.scrollTop = 0;
    } else if (m === "sections") {
      const off = sectionsOffset(p);
      if (p.vs.scrollTop < off - 1)
        p.vs.scrollTop = off;
    }
  };
  let settle;
  const onScroll = () => {
    if (mode() === "top")
      return clamp();
    clearTimeout(settle);
    settle = setTimeout(clamp, SCROLL_SETTLE_MS);
  };
  p.vs.addEventListener("scroll", onScroll, { passive: true });
  clamp();
  return () => {
    clearTimeout(settle);
    p.vs.removeEventListener("scroll", onScroll);
    spacer.remove();
    p.above.forEach((el, i) => {
      el.style.visibility = prev[i][0];
      el.style.pointerEvents = prev[i][1];
    });
  };
}
function atTopOfSections(host) {
  const p = homeParts(host);
  const active = host?.ownerDocument?.activeElement;
  if (!p || !active || !p.sectionsBlock.contains(active))
    return false;
  if (p.header?.contains(active))
    return true;
  const top = active.getBoundingClientRect().top;
  return !focusablesIn(p.sectionsBlock).some((el) => {
    if (el === active || p.header?.contains(el))
      return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom <= top - 4;
  });
}
function focusInOverlay(host) {
  const p = homeParts(host);
  const active = host?.ownerDocument?.activeElement;
  return !!(p && active && host.contains(active) && !p.vs.contains(active));
}
function syncHeader(keeper, doc, screen, host) {
  const strips = headerStrips(doc, HEADER_RESCAN_MS);
  ensureClearStyle(doc);
  const releaseRow = (row) => row && rowExt.delete(row);
  const row = homeParts(host)?.header ?? null;
  if (screen === "wheel") {
    releaseRow(row);
    keeper.keepOnly(new Set(strips));
    for (const el of strips)
      keeper.set(el, CLEAR_PROPS, CLEAR_CLASS);
    return;
  }
  const rect = row?.getBoundingClientRect();
  const st = row ? rowExt.get(row) : undefined;
  const contentTop = rect ? rect.top + (st?.ext ?? 0) : -1;
  const rowVisible = !!rect && rect.bottom > 0;
  if (!learnedBarLook()) {
    releaseRow(row);
    keeper.keepOnly(new Set);
    const fresh = learnBarLook(strips);
    if (fresh)
      saveBarLook(fresh);
  }
  const look = learnedBarLook();
  if (!row || !rowVisible || !look) {
    releaseRow(row);
    keeper.keepOnly(new Set);
    return;
  }
  const bg = [look.image && look.image !== "none" ? look.image : "", look.color].filter(Boolean).join(", ");
  const blur = look.backdrop && look.backdrop !== "none" ? look.backdrop : "none";
  let base = st;
  if (!base) {
    const cs = doc.defaultView.getComputedStyle(row);
    base = { ext: 0, margin: parseFloat(cs.marginTop) || 0, pad: parseFloat(cs.paddingTop) || 0 };
  }
  const ext = Math.max(0, Math.round(contentTop));
  rowExt.set(row, { ...base, ext });
  keeper.keepOnly(new Set([row, ...strips]));
  for (const el of strips)
    keeper.set(el, CLEAR_PROPS, CLEAR_CLASS);
  keeper.set(row, {
    background: bg,
    "backdrop-filter": blur,
    "-webkit-backdrop-filter": blur,
    "box-shadow": "none",
    "margin-top": `${base.margin - ext}px`,
    "padding-top": `${base.pad + ext}px`
  });
}
function saveBarLook(look) {
  updateSettings({ barLook: look });
}
function WheelHome({ original }) {
  const [screen, setScreen] = useState("wheel");
  const screenRef = useRef("wheel");
  screenRef.current = screen;
  const root = useRef(null);
  const wheelBox = useRef(null);
  const sections = useRef(null);
  const tm = useRef({
    switchedAt: 0,
    enteredSectionsAt: 0,
    lastUpAt: 0,
    heldUpAt: 0,
    restingOnWheel: true
  });
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const switchTo = (next) => {
    const t = tm.current;
    if (screenRef.current === next || Date.now() - t.switchedAt < SWITCH_COOLDOWN_MS)
      return;
    t.switchedAt = Date.now();
    if (next === "sections") {
      t.restingOnWheel = false;
      t.enteredSectionsAt = Date.now();
      revealSections(sections.current, false);
    }
    screenRef.current = next;
    setScreen(next);
    if (getSettings().soundEnabled)
      playUiSound("screen");
    later(() => {
      if (screenRef.current !== next)
        return;
      if (next === "sections")
        revealSections(sections.current);
      else {
        focusFirstIn(wheelBox.current);
        t.restingOnWheel = true;
        const vs = homeParts(sections.current)?.vs;
        if (vs)
          vs.scrollTop = 0;
      }
    }, SLIDE_SETTLED_MS);
  };
  const toSections = () => switchTo("sections");
  const toWheel = () => switchTo("wheel");
  const onWheelGotFocus = () => {
    if (screenRef.current !== "sections")
      return;
    const back = lastSectionsFocus.current;
    if (back?.isConnected)
      back.focus();
    else
      revealSections(sections.current);
  };
  const seenUp = useRef(new WeakSet);
  const onUp = (e) => {
    if (screenRef.current !== "sections" || e?.detail?.button !== GamepadButton.DIR_UP)
      return;
    if (seenUp.current.has(e))
      return;
    seenUp.current.add(e);
    if (focusInOverlay(sections.current))
      return;
    const t = tm.current;
    if (!homeParts(sections.current)) {
      const doc = sections.current?.ownerDocument;
      const before = doc?.activeElement;
      const fresh = !e.detail.is_repeat && Date.now() - t.lastUpAt >= HOLD_REPEAT_MS;
      t.lastUpAt = Date.now();
      if (fresh)
        later(() => screenRef.current === "sections" && doc?.activeElement === before && toWheel(), 150);
      return;
    }
    const held = !!e.detail.is_repeat || Date.now() - t.lastUpAt < HOLD_REPEAT_MS;
    t.lastUpAt = Date.now();
    if (!atTopOfSections(sections.current))
      return;
    e.preventDefault?.();
    e.stopPropagation?.();
    if (held)
      t.heldUpAt = Date.now();
    else
      toWheel();
  };
  useEffect(() => {
    const el = sections.current;
    if (!el)
      return;
    el.addEventListener("vgp_onbuttondown", onUp, true);
    return () => el.removeEventListener("vgp_onbuttondown", onUp, true);
  }, []);
  const lastSectionsFocus = useRef(null);
  const onSectionsFocus = (e) => {
    const t = tm.current;
    if (screenRef.current === "sections")
      lastSectionsFocus.current = e.target;
    if (homeParts(sections.current)?.header?.contains(e.target))
      lastTab = e.target;
    const now = Date.now();
    const p = homeParts(sections.current);
    const holding = now - t.heldUpAt < HOLD_GRACE_MS;
    if (screenRef.current === "sections") {
      const inHidden = !!p?.above.some((a) => a.contains(e.target));
      if (inHidden) {
        if (holding)
          revealSections(sections.current);
        else if (now - t.enteredSectionsAt > HIDDEN_ROW_GRACE_MS)
          toWheel();
        return;
      }
      if (p?.header?.contains(e.target) && now - t.lastUpAt < UP_FOCUS_WINDOW_MS && !holding)
        toWheel();
      return;
    }
    if (now - t.switchedAt < SWITCH_COOLDOWN_MS)
      focusFirstIn(wheelBox.current);
    else
      toSections();
  };
  const onSectionsButton = (e) => {
    if (e?.detail?.button !== GamepadButton.CANCEL || screenRef.current !== "sections")
      return;
    if (focusInOverlay(sections.current))
      return;
    if (atTopOfSections(sections.current))
      return;
    e.preventDefault?.();
    e.stopPropagation?.();
    revealSections(sections.current);
  };
  useEffect(() => {
    const el = root.current;
    if (!el)
      return;
    let startY = 0;
    let startX = 0;
    let sectionsAtTop = true;
    const onStart = (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      const vs = homeParts(sections.current)?.vs;
      sectionsAtTop = !vs || vs.scrollTop <= sectionsOffset(homeParts(sections.current)) + 2;
    };
    const onEnd = (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.5)
        return;
      if (screenRef.current === "wheel" && dy < 0)
        toSections();
      else if (screenRef.current === "sections" && dy > 0 && sectionsAtTop)
        toWheel();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);
  const keeper = useMemo(() => {
    seedBarLook(getSettings().barLook);
    return new StyleKeeper;
  }, []);
  useEffect(() => {
    const doc = root.current?.ownerDocument;
    const undo = () => {
      keeper.releaseAll();
      removeInjectedStyles(doc);
    };
    const unregister = onTeardown(undo);
    return () => {
      unregister();
      undo();
    };
  }, []);
  useEffect(() => {
    const doc = root.current?.ownerDocument;
    if (!doc)
      return;
    let disposed = false;
    const sync = () => {
      if (!disposed)
        syncHeader(keeper, doc, screen, sections.current);
    };
    sync();
    const ts = [150, 400].map((ms) => setTimeout(sync, ms));
    const iv = setInterval(sync, HEADER_REAPPLY_MS);
    const vs = homeParts(sections.current)?.vs;
    let settle;
    let raf = 0;
    let rowAway = false;
    const view = doc.defaultView ?? window;
    const onScroll = () => {
      clearTimeout(settle);
      settle = setTimeout(sync, SCROLL_SETTLE_MS);
      if (screen !== "sections" || raf)
        return;
      raf = view.requestAnimationFrame(() => {
        raf = 0;
        const row = homeParts(sections.current)?.header;
        const away = !row || row.getBoundingClientRect().bottom <= 0;
        if (away !== rowAway) {
          rowAway = away;
          sync();
        }
      });
    };
    vs?.addEventListener("scroll", onScroll, { passive: true });
    const rowParent = homeParts(sections.current)?.header?.parentElement;
    const MO = doc.defaultView?.MutationObserver;
    const mo = rowParent && MO ? new MO(() => sync()) : null;
    mo?.observe(rowParent, { childList: true });
    return () => {
      disposed = true;
      ts.forEach(clearTimeout);
      clearInterval(iv);
      clearTimeout(settle);
      if (raf)
        view.cancelAnimationFrame(raf);
      mo?.disconnect();
      vs?.removeEventListener("scroll", onScroll);
    };
  }, [screen]);
  useEffect(() => {
    const host = sections.current;
    if (!host)
      return;
    let restore = null;
    const view = host.ownerDocument?.defaultView ?? window;
    const mode = () => tm.current.restingOnWheel ? "top" : screenRef.current === "sections" ? "sections" : "free";
    const tryHide = () => !!(restore ??= hideFirstShelf(host, mode));
    const mo = view.MutationObserver ? new view.MutationObserver(() => tryHide() && mo.disconnect()) : null;
    if (!tryHide())
      mo?.observe(host, { childList: true, subtree: true });
    const giveUp = setTimeout(() => {
      mo?.disconnect();
      if (!restore)
        debug("home", "recent-games row not found; leaving the home as is");
    }, 8000);
    const unregister = onTeardown(() => restore?.());
    return () => {
      unregister();
      mo?.disconnect();
      clearTimeout(giveUp);
      restore?.();
      restore = null;
    };
  }, []);
  return /* @__PURE__ */ window.SP_REACT.createElement("div", {
    ref: root,
    "data-spindeck-root": "",
    style: { position: "fixed", inset: 0, zIndex: 1, overflow: "hidden", background: "#0b0f16" }
  }, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: screen === "wheel" ? "0%" : "-100%",
      height: "200%",
      transition: `top ${SLIDE_MS}ms ease-out`
    }
  }, /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    "flow-children": "column",
    style: { height: "100%", display: "flex", flexDirection: "column" }
  }, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    ref: wheelBox,
    "data-spindeck-wheel": "",
    style: { height: "50%", position: "relative", flexShrink: 0 }
  }, /* @__PURE__ */ window.SP_REACT.createElement(WheelPage, {
    mode: "home",
    onWheelFocus: onWheelGotFocus,
    onRequestSections: toSections,
    active: screen === "wheel"
  })), /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    style: { height: "50%", flexShrink: 0, overflow: "hidden", position: "relative" },
    onButtonDown: onSectionsButton,
    onGamepadDirection: onUp
  }, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    ref: sections,
    style: { height: "100%" },
    onFocusCapture: onSectionsFocus
  }, original)))));
}

// src/links.ts
var KOFI_URL = "https://ko-fi.com/jhw0806";
var REPO_URL = "https://github.com/justinca92/spindeck";
var PLUGIN_VERSION = "1.3.0";

// src/index.tsx
var ROUTE = "/spindeck";
var WheelIcon = () => /* @__PURE__ */ window.SP_REACT.createElement("svg", {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2
}, /* @__PURE__ */ window.SP_REACT.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "9"
}), /* @__PURE__ */ window.SP_REACT.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "3"
}));
var HOME_ROUTE = "/library/home";
function DeferredTextField({ label, initial, onCommit }) {
  const [text, setText] = useState(initial);
  const latest = useRef(initial);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = () => {
    clearTimeout(timer.current);
    onCommit(latest.current);
  };
  return /* @__PURE__ */ window.SP_REACT.createElement(TextField, {
    label,
    value: text,
    onChange: (e) => {
      const v = composeHangul(e.target.value);
      latest.current = v;
      setText(v);
      clearTimeout(timer.current);
      timer.current = setTimeout(commit, 1200);
    },
    onBlur: commit
  });
}
var PRESETS = ["#66c0f4", "#a970ff", "#ff5fa2", "#ff4d4d", "#ff9f43", "#ffd166", "#3ddc84", "#2ee6c5", "#ffffff"];
function parseHex(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((c || "").trim());
  if (!m)
    return [102, 192, 244];
  const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
var toHex = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
function Swatch({ hex, name, selected, onPick }) {
  const [focused, setFocused] = useState(false);
  const light = parseHex(hex).reduce((a, v, i) => a + v * [0.299, 0.587, 0.114][i], 0) > 170;
  return /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    onActivate: onPick,
    onClick: onPick,
    onOKActionDescription: name,
    onGamepadFocus: () => setFocused(true),
    onGamepadBlur: () => setFocused(false),
    style: {
      width: 30,
      height: 30,
      borderRadius: 15,
      background: hex,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      fontWeight: 900,
      color: light ? "#111" : "#fff",
      boxShadow: selected ? "0 0 0 2px #0e141b, 0 0 0 4px #fff" : "0 0 0 1px #ffffff40",
      transform: focused ? "scale(1.18)" : "scale(1)",
      transition: "transform 120ms",
      outline: focused ? "2px solid #ffffffaa" : "none",
      outlineOffset: selected ? 5 : 2
    }
  }, selected ? "✓" : "");
}
function AccentPicker({ value, onChange, t }) {
  const rgb = parseHex(value);
  const hex = toHex(rgb);
  return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "4px 0" }
  }, /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { width: 28, height: 28, borderRadius: 8, background: hex, boxShadow: "0 0 0 2px #ffffff40" }
  }), /* @__PURE__ */ window.SP_REACT.createElement("span", null, t.accent), /* @__PURE__ */ window.SP_REACT.createElement("span", {
    style: { marginLeft: "auto", opacity: 0.6, fontFamily: "monospace" }
  }, hex.toUpperCase()))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(Focusable, {
    "flow-children": "row",
    style: { display: "flex", flexWrap: "wrap", gap: 8, padding: "6px 2px" }
  }, PRESETS.map((p, i) => /* @__PURE__ */ window.SP_REACT.createElement(Swatch, {
    key: p,
    hex: p,
    name: t.colors[i],
    selected: p === hex,
    onPick: () => onChange(p)
  })))));
}
function openExternal(url) {
  try {
    Navigation.CloseSideMenus();
    Navigation.NavigateToExternalWeb(url);
  } catch {}
}
function QuickAccessPanel() {
  const s = useSettings();
  const loaded = useSettingsLoaded();
  const [padRev, setPadRev] = useState(0);
  const t = useT();
  const korean = useLang() === "ko";
  return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, {
    label: t.homeToggle,
    description: t.homeToggleDesc,
    checked: s.homeEnabled,
    onChange: (v) => updateSettings({ homeEnabled: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, {
    layout: "below",
    onClick: () => {
      Navigation.CloseSideMenus();
      Navigation.Navigate(s.homeEnabled ? HOME_ROUTE : ROUTE);
    }
  }, t.openWheel))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, {
    title: t.personalize
  }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DropdownItem, {
    label: "언어 / Language",
    description: `${t.langAuto}: ${detected.raw} (${detected.source})`,
    rgOptions: [
      { data: "auto", label: t.langAuto },
      { data: "ko", label: "한국어" },
      { data: "en", label: "English" }
    ],
    selectedOption: s.language ?? "auto",
    onChange: (o) => updateSettings({ language: o.data })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DeferredTextField, {
    key: `${loaded}-${padRev}`,
    label: t.ownerLabel,
    initial: s.ownerText,
    onCommit: (v) => updateSettings({ ownerText: v })
  })), korean && /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, {
    layout: "below",
    description: t.hangulDesc,
    onClick: () => openHangulPad(t.ownerLabel, s.ownerText, (v) => {
      updateSettings({ ownerText: v });
      setPadRev((r) => r + 1);
    })
  }, t.hangulFor(t.ownerLabel))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DeferredTextField, {
    key: `${loaded}-${padRev}`,
    label: t.subLabel,
    initial: s.subtitleText,
    onCommit: (v) => updateSettings({ subtitleText: v })
  })), korean && /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, {
    layout: "below",
    onClick: () => openHangulPad(t.subTitle, s.subtitleText, (v) => {
      updateSettings({ subtitleText: v });
      setPadRev((r) => r + 1);
    })
  }, t.hangulFor(t.subTitle))), /* @__PURE__ */ window.SP_REACT.createElement(AccentPicker, {
    t,
    value: s.accentColor,
    onChange: (v) => updateSettings({ accentColor: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, {
    title: t.library
  }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DropdownItem, {
    label: t.view,
    rgOptions: [
      { data: "installed", label: t.installed },
      { data: "all", label: t.all }
    ],
    selectedOption: s.libraryScope,
    onChange: (o) => updateSettings({ libraryScope: o.data })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DropdownItem, {
    label: t.sort,
    rgOptions: [
      { data: "recent", label: t.recent },
      { data: "alpha", label: t.alpha }
    ],
    selectedOption: s.sortMode,
    onChange: (o) => updateSettings({ sortMode: o.data })
  })), /* @__PURE__ */ window.SP_REACT.createElement(ShelfPicker, {
    t,
    s
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, {
    title: t.display
  }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, {
    label: t.heroSize,
    description: t.pctOfWidth,
    min: 40,
    max: 150,
    step: 5,
    value: s.heroScale,
    showValue: true,
    onChange: (v) => updateSettings({ heroScale: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, {
    label: t.visible,
    min: 5,
    max: 15,
    step: 2,
    value: s.visibleCount,
    showValue: true,
    onChange: (v) => updateSettings({ visibleCount: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, {
    label: t.wheelSize,
    description: t.pctOfWidth,
    min: 30,
    max: 60,
    step: 2,
    value: s.wheelSizePct,
    showValue: true,
    onChange: (v) => updateSettings({ wheelSizePct: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, {
    label: t.capsuleSize,
    description: t.base100,
    min: 60,
    max: 160,
    step: 10,
    value: Math.round(s.capsuleScale * 100),
    showValue: true,
    onChange: (v) => updateSettings({ capsuleScale: v / 100 })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, {
    label: t.textSize,
    description: t.base100,
    min: 70,
    max: 160,
    step: 10,
    value: Math.round(s.textScale * 100),
    showValue: true,
    onChange: (v) => updateSettings({ textScale: v / 100 })
  }))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, {
    title: t.controls
  }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, {
    label: t.haptic,
    description: t.hapticDesc,
    checked: s.hapticEnabled,
    onChange: (v) => updateSettings({ hapticEnabled: v })
  })), s.hapticEnabled && /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, {
    label: t.hapticLevel,
    description: t.hapticLevelDesc(levelToDb(s.hapticLevel)),
    min: 1,
    max: 9,
    step: 1,
    value: s.hapticLevel,
    showValue: true,
    onChange: (v) => {
      updateSettings({ hapticLevel: v });
      wheelTick(s.rotatePad, false, v);
    }
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, {
    label: t.sound,
    description: t.soundDesc,
    checked: s.soundEnabled,
    onChange: (v) => updateSettings({ soundEnabled: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DropdownItem, {
    label: t.pad,
    rgOptions: [
      { data: "left", label: t.left },
      { data: "right", label: t.right }
    ],
    selectedOption: s.rotatePad,
    onChange: (o) => updateSettings({ rotatePad: o.data })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, {
    label: t.circle,
    description: t.circleDesc,
    checked: s.rawPadApi,
    onChange: (v) => updateSettings({ rawPadApi: v })
  }))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, {
    title: t.about
  }, KOFI_URL && /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, {
    layout: "below",
    description: t.supportDesc,
    onClick: () => openExternal(KOFI_URL)
  }, "☕ ", t.support)), REPO_URL && /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, {
    layout: "below",
    onClick: () => openExternal(REPO_URL)
  }, t.sourceAndUpdates)), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { fontSize: 12, color: "#8b929a" }
  }, "Spindeck v", PLUGIN_VERSION)), s.odometerTurns >= 1 && /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", {
    style: { fontSize: 12, color: "#8b929a" }
  }, t.odometer(Math.floor(s.odometerTurns).toLocaleString())))));
}
function ShelfPicker({ t, s }) {
  const all = listCollections();
  const fav = all.find((c) => c.id === "favorite");
  const other = s.libraryScope === "installed" ? "base:all" : "base:installed";
  const options = [
    { data: "", label: t.r1None },
    { data: other, label: other === "base:all" ? t.all : t.installed },
    ...all.filter((c) => c.id !== "favorite").map((c) => ({ data: c.id, label: `${c.name} (${c.count})` }))
  ];
  return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, {
    label: t.l1Favorites,
    description: fav ? t.shelfCount(fav.count) : undefined,
    checked: s.favoritesOnL1,
    onChange: (v) => updateSettings({ favoritesOnL1: v })
  })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(DropdownItem, {
    label: t.r1Pick,
    description: t.r1Desc,
    rgOptions: options,
    selectedOption: options.some((o) => o.data === s.r1View) ? s.r1View : "",
    onChange: (o) => updateSettings({ r1View: o.data })
  })));
}
var src_default = definePlugin(() => {
  initSettings();
  routerHook.addRoute(ROUTE, () => /* @__PURE__ */ window.SP_REACT.createElement(SafeBoundary, {
    fallback: /* @__PURE__ */ window.SP_REACT.createElement("div", {
      style: { padding: 48, color: "#ccc" }
    }, "Spindeck: something went wrong.")
  }, /* @__PURE__ */ window.SP_REACT.createElement(WheelPage, {
    mode: "page"
  })), { exact: true });
  const homePatch = routerHook.addPatch(HOME_ROUTE, (props) => {
    const original = props.children;
    if (original?.type !== HomeSwitch) {
      props.children = /* @__PURE__ */ window.SP_REACT.createElement(HomeSwitch, {
        original
      });
    }
    return props;
  });
  return {
    name: "Spindeck",
    titleView: /* @__PURE__ */ window.SP_REACT.createElement("div", {
      className: staticClasses.Title
    }, "Spindeck"),
    content: /* @__PURE__ */ window.SP_REACT.createElement(SafeBoundary, {
      fallback: /* @__PURE__ */ window.SP_REACT.createElement("div", {
        style: { padding: 16, color: "#ccc" }
      }, "Spindeck: settings failed to load.")
    }, /* @__PURE__ */ window.SP_REACT.createElement(QuickAccessPanel, null)),
    icon: /* @__PURE__ */ window.SP_REACT.createElement(WheelIcon, null),
    onDismount() {
      routerHook.removeRoute(ROUTE);
      routerHook.removePatch(HOME_ROUTE, homePatch);
      teardownAll();
      sweepLeftovers();
    }
  };
});
export {
  HOME_ROUTE,
  ROUTE,
  src_default as default
};
