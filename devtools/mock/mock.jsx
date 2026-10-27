// A stand-in for Steam's gamepad UI + Decky Loader, for running the real plugin
// in a browser. What's real: the plugin (out/plugin.js, built from ../../src with
// the production shims) and its backend (main.py, through dev-server.py). What's
// fake: everything Steam and Decky provide — @decky/ui components, the router,
// the library, controllers, haptics, sounds. Not pixel-accurate SteamUI: always
// do a final check on a Deck.
//
// Keys → Deck buttons: arrows = D-pad, Enter/A = Ⓐ, Esc/Backspace/B = Ⓑ,
// X = Ⓧ, Y = Ⓨ, M = ≡, Q/E = L1/R1, ` = Quick Access, L = event log.
// Everything the plugin asks of Steam lands in the event log (window.mock.log).
//
// URL options: ?qam ?log ?lang=<steam language>, and for regression tests
// ?sgdb=first|last (SteamGridDB's home patch loads before / after Spindeck),
// ?rival (another plugin that also keeps its patch last), ?crash (the wheel
// throws while rendering), ?flat (a Steam home layout Spindeck doesn't know).
import * as React from "react";
import { cloneElement, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

window.SP_REACT = React;
const params = new URLSearchParams(location.search);

// ───────────── Event log ─────────────
const log = [];
const logListeners = new Set();
let lastKb = null;
function record(kind, ...args) {
  log.push({ t: Math.round(performance.now()), kind, args });
  if (log.length > 500) log.shift();
  logListeners.forEach((l) => l());
}
const useLog = () => {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    logListeners.add(l);
    return () => logListeners.delete(l);
  }, []);
  return log;
};

// ───────────── Gamepad ─────────────
const NAMES = ["INVALID", "OK", "CANCEL", "SECONDARY", "OPTIONS", "BUMPER_LEFT", "BUMPER_RIGHT", "TRIGGER_LEFT", "TRIGGER_RIGHT", "DIR_UP", "DIR_DOWN", "DIR_LEFT", "DIR_RIGHT", "SELECT", "START", "LSTICK_CLICK", "RSTICK_CLICK", "LSTICK_TOUCH", "RSTICK_TOUCH", "LPAD_TOUCH", "LPAD_CLICK", "RPAD_TOUCH", "RPAD_CLICK", "REAR_LEFT_UPPER", "REAR_LEFT_LOWER", "REAR_RIGHT_UPPER", "REAR_RIGHT_LOWER", "STEAM_GUIDE", "STEAM_QUICK_MENU"];
const B = Object.fromEntries(NAMES.flatMap((n, i) => [[n, i], [i, n]]));
const KEYS = { ArrowUp: B.DIR_UP, ArrowDown: B.DIR_DOWN, ArrowLeft: B.DIR_LEFT, ArrowRight: B.DIR_RIGHT, Enter: B.OK, a: B.OK, Escape: B.CANCEL, Backspace: B.CANCEL, b: B.CANCEL, x: B.SECONDARY, y: B.OPTIONS, m: B.START, q: B.BUMPER_LEFT, e: B.BUMPER_RIGHT };
const DIRS = new Set([B.DIR_UP, B.DIR_DOWN, B.DIR_LEFT, B.DIR_RIGHT]);
const HANDLER = { [B.OK]: "onOKButton", [B.CANCEL]: "onCancelButton", [B.SECONDARY]: "onSecondaryButton", [B.OPTIONS]: "onOptionsButton", [B.START]: "onMenuButton" };

const focusProps = new WeakMap();
function Focusable(props) {
  if (params.has("crash") && props.onOptionsButton) throw new Error("simulated Steam change");
  const { children, style, className, autoFocus, onActivate, onClick, onGamepadFocus, onGamepadBlur } = props;
  const ref = React.useRef(null);
  useEffect(() => void focusProps.set(ref.current, props));
  useEffect(() => void (autoFocus && ref.current?.focus()), []);
  // Containers (flow-children) aren't stops themselves, like Steam's.
  const stop = !("flow-children" in props) && props.focusable !== false;
  return (
    <div
      ref={ref}
      tabIndex={stop ? 0 : undefined}
      data-focusable={stop ? "" : undefined}
      className={className}
      style={style}
      onFocus={(e) => e.target === ref.current && onGamepadFocus?.(e)}
      onBlur={(e) => e.target === ref.current && onGamepadBlur?.(e)}
      onClick={onClick ?? onActivate}
    >
      {children}
    </div>
  );
}

/** Steam-like spatial navigation for presses nobody handled. */
function moveFocus(button) {
  const from = document.activeElement;
  const r0 = from?.getBoundingClientRect?.();
  if (!r0) return;
  const scope = from.closest("[data-mock-layer]") ?? document.body;
  const [dx, dy] = { [B.DIR_UP]: [0, -1], [B.DIR_DOWN]: [0, 1], [B.DIR_LEFT]: [-1, 0], [B.DIR_RIGHT]: [1, 0] }[button];
  const c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let best = null;
  for (const el of scope.querySelectorAll("[data-focusable], button, input, a[href]")) {
    if (el === from || el.contains(from) || el.closest("[data-mock-nav-skip]")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) continue; // Steam only moves between what's on screen
    const vx = r.left + r.width / 2 - c0[0];
    const vy = r.top + r.height / 2 - c0[1];
    const along = vx * dx + vy * dy;
    if (along <= 4) continue;
    const score = along + Math.abs(vx * dy - vy * dx) * 2;
    if (!best || score < best.score) best = { el, score };
  }
  best?.el.focus();
}

let onUnhandledCancel = () => {};
/** One button press, the way Steam delivers it to the focused element and its Focusable ancestors. */
function press(button, repeat = false) {
  const el = document.activeElement ?? document.body;
  const detail = { button, is_repeat: repeat };
  // Steam's raw event (HomeSwitch listens for it in the capture phase).
  const raw = new CustomEvent("vgp_onbuttondown", { bubbles: true, cancelable: true, detail });
  el.dispatchEvent(raw);
  if (raw.defaultPrevented) return;
  let stopped = false;
  const ev = { detail, target: el, currentTarget: el, preventDefault() {}, stopPropagation: () => (stopped = true) };
  for (let node = el; node && node !== document; node = node.parentElement) {
    const p = focusProps.get(node);
    if (!p) continue;
    ev.currentTarget = node;
    p.onButtonDown?.(ev);
    if (stopped) return;
    if (DIRS.has(button)) {
      p.onGamepadDirection?.(ev);
      if (stopped) return;
      continue;
    }
    const h = p[HANDLER[button]] ?? (button === B.OK && node === el ? p.onActivate : undefined);
    if (h) return void h(ev);
  }
  if (DIRS.has(button)) moveFocus(button);
  else if (button === B.OK && el.matches?.("button, a")) el.click();
  else if (button === B.CANCEL) onUnhandledCancel();
}
function release(button) {
  const el = document.activeElement;
  for (let node = el; node && node !== document; node = node.parentElement) focusProps.get(node)?.onButtonUp?.({ detail: { button }, preventDefault() {}, stopPropagation() {} });
}

// ───────────── @decky/ui ─────────────
const Row = ({ icon, label, description, children }) => (
  <div className="row">
    <div>
      {label && (
        <div className="label">
          {icon && <span className="field-icon">{icon}</span>}
          {label}
        </div>
      )}
      {description && <div className="desc">{description}</div>}
    </div>
    {children}
  </div>
);
// Decky's indentLevel: an option that belongs to the one above it.
const indent = (level) => (level ? { paddingLeft: 10 + level * 18 } : undefined);
const stepDir = (e, f) => {
  const b = e.detail.button;
  if (b !== B.DIR_LEFT && b !== B.DIR_RIGHT) return;
  e.stopPropagation();
  f(b === B.DIR_RIGHT ? 1 : -1);
};
const ui = {
  Focusable,
  GamepadButton: B,
  staticClasses: { Title: "qam-title" },
  PanelSection: ({ title, children }) => (
    <section className="panel-section">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  ),
  PanelSectionRow: ({ children }) => <div className="panel-row">{children}</div>,
  ToggleField: ({ icon, label, description, checked, onChange, disabled, indentLevel }) => (
    <Focusable onActivate={() => !disabled && onChange?.(!checked)} className="field" data-label={label} style={indent(indentLevel)}>
      <Row icon={icon} label={label} description={description}>
        <span role="switch" aria-checked={!!checked} aria-label={typeof label === "string" ? label : undefined} className={"switch" + (checked ? " on" : "")} />
      </Row>
    </Focusable>
  ),
  SliderField: ({ icon, label, description, value, min = 0, max = 100, step = 1, onChange, showValue, indentLevel }) => (
    <Focusable onGamepadDirection={(e) => stepDir(e, (d) => onChange?.(Math.max(min, Math.min(max, value + d * step))))} className="field" style={indent(indentLevel)}>
      <Row icon={icon} label={label} description={description}>
        <span className="slider" role="slider" aria-valuenow={value} aria-label={typeof label === "string" ? label : undefined}>
          {showValue ? value : ""}
        </span>
      </Row>
    </Focusable>
  ),
  DropdownItem: ({ icon, label, description, rgOptions = [], selectedOption, onChange, indentLevel }) => {
    const i = Math.max(0, rgOptions.findIndex((o) => o.data === selectedOption));
    const pick = (d) => rgOptions.length && onChange?.(rgOptions[(i + d + rgOptions.length) % rgOptions.length]);
    return (
      <Focusable onActivate={() => pick(1)} onGamepadDirection={(e) => stepDir(e, pick)} className="field" style={indent(indentLevel)}>
        <Row icon={icon} label={label} description={description}>
          <span className="dropdown" aria-label={typeof label === "string" ? label : undefined}>{rgOptions[i]?.label ?? "—"} ▾</span>
        </Row>
      </Focusable>
    );
  },
  ButtonItem: ({ children, description, onClick, disabled }) => (
    <Focusable onActivate={() => !disabled && onClick?.()} className={"field button" + (disabled ? " disabled" : "")}>
      <Row description={description}>
        <span className="button-label">{children}</span>
      </Row>
    </Focusable>
  ),
  DialogButton: ({ children, onClick, style }) => (
    <Focusable onActivate={() => onClick?.()} className="dialog-button" style={style}>
      {children}
    </Focusable>
  ),
  TextField: ({ label, value, onChange, onBlur }) => (
    <label className="field text">
      <div className="label">{label}</div>
      <input value={value ?? ""} onChange={onChange} onBlur={onBlur} />
    </label>
  ),
  ModalRoot: ({ children }) => <div className="modal-root">{children}</div>,
  showModal: (el) => {
    const close = () => setLayer("modal", null);
    setLayer("modal", cloneElement(el, { closeModal: close }));
    record("showModal");
    return { Close: close, Update() {} };
  },
  showContextMenu: (el) => {
    record("showContextMenu");
    setLayer("menu", el);
  },
  Navigation: {
    Navigate: (p) => (record("navigate", p), go(p)),
    NavigateBack: () => (record("navigateBack"), back()),
    CloseSideMenus: () => (record("closeSideMenus"), setLayer("qam", false)),
    NavigateToExternalWeb: (u) => record("externalWeb", u),
  },
};
window.DFL = ui;

// ───────────── Decky Loader ─────────────
const routerState = { _routePatches: new Map(), routes: new Map(), bus: new EventTarget(), version: 0 };
const notify = () => (routerState.version++, routerState.bus.dispatchEvent(new Event("update")));
const routerHook = {
  routerState,
  addRoute: (p, c) => (routerState.routes.set(p, c), notify()),
  removeRoute: (p) => (routerState.routes.delete(p), notify()),
  addPatch(p, f) {
    if (!routerState._routePatches.has(p)) routerState._routePatches.set(p, new Set());
    routerState._routePatches.get(p).add(f);
    notify();
    return f;
  },
  removePatch: (p, f) => (routerState._routePatches.get(p)?.delete(f), notify()),
};
async function backendCall(method, ...args) {
  record("backend", method);
  const r = await fetch(`/api/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(args) });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? r.statusText);
  return body.result;
}
window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = {
  connect: () => ({ call: backendCall, routerHook, toaster: { toast: (t) => record("toast", t) } }),
};
// Decky's own backend (the in-panel updater hands it the release zip).
window.DeckyBackend = { call: async (route, ...args) => (record("decky", route, ...args), true) };

// ───────────── Steam: library ─────────────
const NAMES_LIST = ["Aether Drift", "Brass Lantern", "Cinder Vale", "Dune Courier", "Echo Harbor", "Frostline", "Glimmer Run", "Hollow Spire", "Iron Orchard", "Jade Circuit", "Kite Season", "Lumen Tide", "Moss Engine", "Nightjar", "Orbit Café", "Paper Comet", "Quartz Hollow", "Rust & Rain", "Salt Road", "Tidebound", "Umbra Lane", "Velvet Static", "Wander Deep", "Xeno Garden", "Yarrow Fields", "Zephyr Lab", "스팀 산책", "달빛 우체국"];
const GAME = 1;
const SHORTCUT = 1073741824;
const DAY = 86400;
const now = Math.floor(Date.now() / 1000);
const apps = NAMES_LIST.map((name, i) => ({
  appid: 1000 + i,
  app_type: GAME,
  display_name: name,
  installed: i % 5 !== 3, // a few aren't installed
  rt_last_time_played: i < 20 ? now - i * DAY * 2 : 0,
  minutes_playtime_forever: i < 20 ? (i * 137) % 3000 : 0,
}));
apps.push(
  { appid: 2001, app_type: SHORTCUT, display_name: "RetroArch", m_gameid: "13034167488843202560", rt_last_time_locally_played: now - DAY * 3 },
  { appid: 2002, app_type: SHORTCUT, display_name: "Heroic Launcher", m_gameid: "9211357392371032064", rt_last_time_locally_played: 0 },
  { appid: 3001, app_type: 4, display_name: "Proton 9.0 (tool, never shown)", installed: true },
);
const collections = {
  "type-games": { allApps: apps },
  favorite: { id: "favorite", displayName: "Favorites", allApps: apps.filter((a) => [1002, 1007, 1011, 2001].includes(a.appid)) },
  "uc-coop": { id: "uc-coop", displayName: "Couch co-op", allApps: apps.filter((a) => a.appid % 3 === 0) },
  hidden: { id: "hidden", displayName: "Hidden", allApps: [] },
};
window.collectionStore = {
  GetCollection: (id) => collections[id] ?? null,
  userCollections: [collections.favorite, collections["uc-coop"], collections.hidden],
};
const hue = (id) => (id * 47) % 360;
const svg = (w, h, body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
window.appStore = {
  GetCustomVerticalCapsuleURLs: (a) => [
    svg(600, 900, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue(a.appid)},60%,45%)"/><stop offset="1" stop-color="hsl(${hue(a.appid) + 40},60%,18%)"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><text x="300" y="470" font-family="sans-serif" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">${esc(a.display_name)}</text>`),
  ],
  GetCustomHeroImageURLs: (a) => [
    svg(1920, 620, `<rect width="1920" height="620" fill="hsl(${hue(a.appid)},45%,30%)"/><circle cx="1400" cy="300" r="260" fill="hsl(${hue(a.appid) + 60},60%,55%)" opacity=".5"/><text x="120" y="360" font-family="sans-serif" font-size="120" font-weight="800" fill="#fff" opacity=".85">${esc(a.display_name)}</text>`),
  ],
};
window.friendStore = { allFriends: [{ persona: { m_unGamePlayedAppID: 1000 } }, { persona: { m_unGamePlayedAppID: 1000 } }, { persona: { m_unGamePlayedAppID: 1004 } }] };

// ───────────── Steam: client APIs ─────────────
let analogCb = null;
const reg = (f) => ({ unregister: f ?? (() => {}) });
window.SteamClient = {
  Apps: {
    RunGame: (gameid, ...rest) => record("RunGame", gameid, ...rest),
    RegisterForAppDetails: (appid, cb) => {
      const t = setTimeout(() => cb({ achievements: { nTotal: appid % 4 ? 30 : 0, nAchieved: appid % 31 } }), 120);
      return reg(() => clearTimeout(t));
    },
  },
  Input: {
    RegisterForControllerAnalogInputMessages: (cb) => ((analogCb = cb), record("analog:register"), reg(() => ((analogCb = null), record("analog:unregister")))),
    EnableControllerAnalogInputMessages: (on) => record("analog:enable", on),
    SetKeyboardActionset: (on) => on !== lastKb && ((lastKb = on), record("keyboardActionset", on)),
    RegisterForControllerListChanges: (cb) => (setTimeout(() => cb([{ strName: "Steam Deck", unVendorID: 0x28de, unProductID: 0x1205, nControllerIndex: 0 }])), reg()),
    RegisterForActiveControllerChanges: () => reg(),
    RegisterForControllerInputMessages: () => reg(),
  },
  Settings: { GetCurrentLanguage: async () => params.get("lang") ?? "english" },
};
window.SteamUIStore = { m_GamepadUIAudioStore: { PlayAudioURL: (url) => record("sound", url.split("/").pop()) } };
// Steam's webpack bundle: only the haptic service is provided (the native ≡ menu
// isn't, so the plugin falls back to the game page, as on a client it can't read).
const modules = { 1: () => "PlaySteamDeckHaptic Playing legacy haptics" };
const req = (id) => (id === "1" || id === 1 ? { svc: { PlaySteamDeckHaptic: (...a) => record("haptic", ...a) } } : {});
req.m = modules;
window.webpackChunksteamui = { push: ([, , cb]) => cb(req) };

/** Rub the trackpad in a circle: `degrees` clockwise (negative = counter-clockwise). */
async function circle(degrees, pad = "left") {
  const type = pad === "left" ? 48 : 49;
  const steps = Math.ceil(Math.abs(degrees) / 6);
  for (let i = 0; i <= steps; i++) {
    const a = (-Math.sign(degrees) * i * 6 * Math.PI) / 180; // y-up: clockwise = decreasing angle
    analogCb?.(0, type, true, Math.cos(a) * 0.8, Math.sin(a) * 0.8);
    await new Promise((r) => setTimeout(r, 8));
  }
}

// ───────────── Shell ─────────────
const layers = { route: "/library/home", history: [], qam: params.has("qam"), log: params.has("log"), modal: null, menu: null };
const layerListeners = new Set();
function setLayer(k, v) {
  layers[k] = v;
  layerListeners.forEach((l) => l());
}
function go(p) {
  if (p === layers.route) return;
  layers.history.push(layers.route);
  setLayer("route", p);
}
function back() {
  setLayer("route", layers.history.pop() ?? "/library/home");
}
onUnhandledCancel = () => {
  if (layers.menu) return setLayer("menu", null);
  if (layers.modal) return setLayer("modal", null);
  if (layers.qam) return setLayer("qam", false);
  if (layers.route !== "/library/home") return back();
  record("steamMenu");
};
const useLayers = () => {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    layerListeners.add(l);
    return () => layerListeners.delete(l);
  }, []);
  return layers;
};
// Like Decky's router state provider, which is subscribed long before any plugin
// loads: never miss an update (a plugin moving its patch right after loading).
const useRouter = () => {
  const [, bump] = useState(0);
  const seen = routerState.version;
  React.useLayoutEffect(() => {
    const l = () => bump((n) => n + 1);
    routerState.bus.addEventListener("update", l);
    if (routerState.version !== seen) l();
    return () => routerState.bus.removeEventListener("update", l);
  }, []);
};

/** Steam's own home, as laid out on device: scroller › [spacer, recent games panel, sections › tab row …]. */
const Recents = React.memo(function Recents() {
  return apps.slice(0, 6).map((a) => <button key={a.appid}>{a.display_name}</button>);
});
let homeRev = 0; // bumped by mock.rerenderHome(): Steam replacing its home's elements
const SteamHome = React.memo(function SteamHome() {
  if (params.has("flat"))
    return (
      <div className="steam-home-flat">
        unrecognised home layout <button>only</button>
      </div>
    );
  return (
    <div className="steam-home">
      <div style={{ position: "absolute", height: 0 }} />
      <div className="recent-row">
        <Recents autoFocus showBackground />
      </div>
      <div>
        <div>
          <div className="tab-row">
            <button>What's New</button>
            <button>Friends</button>
            <button>Recommended</button>
          </div>
          <div className="section-body">
            <button>Event: Summer update</button>
            <button>Event: Patch notes</button>
            <div style={{ height: 600 }} />
            <button>Recommended: Something new</button>
          </div>
        </div>
      </div>
    </div>
  );
});

/** Decky's route patching: every patch gets the previous one's output, in registration order. */
const IS_PATCHED = Symbol("isPatched");
function PatchedRoute({ path, children }) {
  useRouter();
  let child = children;
  for (const patch of routerState._routePatches.get(path) ?? []) {
    const oType = child.type;
    const next = patch({ path, children: { ...React.cloneElement(child), type: child[IS_PATCHED] ? oType : (props) => React.createElement(oType, props) } }).children;
    next[IS_PATCHED] = true;
    child = next;
  }
  return child;
}

// ───────────── Other plugins patching the home (regression tests) ─────────────
// SteamGridDB 1.7.x's home patch, its first levels as in src/patches/homePatch.tsx:
// Decky's afterPatch on the element's type, wrapReactType (`{ ...type }`) on its
// output, then the recents row — unguarded, so it throws if the row isn't there (#2).
const WRAPPED = Symbol("wrapped");
const wrapReactType = (node) => (node.type?.[WRAPPED] ? node.type : (node.type = { ...node.type, [WRAPPED]: true }));
const afterPatch = (obj, prop, handler) => {
  const orig = obj[prop];
  obj[prop] = Object.assign(function (...a) {
    const ret = orig.apply(this, a);
    return handler(a, ret) ?? ret;
  }, orig);
};
const findInTree = (node, filter) => {
  if (!node || typeof node !== "object") return undefined;
  if (filter(node)) return node;
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findInTree(x, filter);
      if (r) return r;
    }
    return null;
  }
  for (const k of ["props", "children", "child", "sibling"]) {
    const r = findInTree(node[k], filter);
    if (r) return r;
  }
  return undefined;
};
function steamGridDbPatch(props) {
  afterPatch(props.children, "type", (_, ret) => {
    let cache = null;
    wrapReactType(ret);
    afterPatch(ret.type, "type", (_, ret2) => {
      if (cache) return cache;
      const recents = findInTree(ret2, (x) => x?.props && "autoFocus" in x.props && "showBackground" in x.props);
      wrapReactType(recents);
      afterPatch(recents.type, "type", (_, ret3) => {
        cache = ret2;
        window.mock.sgdbHits++;
        return ret3;
      });
      return ret2;
    });
    return ret;
  });
  return props;
}
// A rival that also always moves its patch last: Spindeck must give up, not swap forever.
function rivalPatch(props) {
  let last;
  routerState._routePatches.get("/library/home")?.forEach((x) => (last = x));
  if (last !== rivalPatch)
    setTimeout(() => {
      window.mock.rivalMoves++;
      routerHook.removePatch("/library/home", rivalPatch);
      routerHook.addPatch("/library/home", rivalPatch);
    }, 0);
  return props;
}

function GamePage({ appid }) {
  const app = apps.find((a) => a.appid === appid);
  return (
    <div className="game-page" data-mock-layer="">
      <h1>{app?.display_name ?? `App ${appid}`}</h1>
      <p>Steam's game page (stand-in). Ⓑ goes back.</p>
      <ui.Focusable autoFocus onActivate={() => record("RunGame", String(appid), "game page")} className="dialog-button">
        {app && !app.installed && app.app_type === GAME ? "Install" : "Play"}
      </ui.Focusable>
    </div>
  );
}

function Route({ path }) {
  useRouter();
  if (path === "/library/home") return <PatchedRoute path={path}>{<SteamHome key={homeRev} />}</PatchedRoute>;
  const m = /^\/library\/app\/(\d+)/.exec(path);
  if (m) return <GamePage appid={Number(m[1])} />;
  const C = routerState.routes.get(path);
  if (C) return <C />;
  return (
    <div className="game-page" data-mock-layer="">
      <h1>{path}</h1>
      <ui.Focusable autoFocus onActivate={back} className="dialog-button">
        Back
      </ui.Focusable>
    </div>
  );
}

function EventLog() {
  const entries = useLog();
  return (
    <div className="event-log" aria-label="Event log">
      {entries.slice(-40).map((e, i) => (
        <div key={i}>
          <b>{e.kind}</b> {e.args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}
        </div>
      ))}
    </div>
  );
}

function Shell({ plugin }) {
  const l = useLayers();
  useEffect(() => {
    if (l.qam) setTimeout(() => document.querySelector(".qam [data-focusable], .qam input")?.focus(), 0);
  }, [l.qam]);
  return (
    <>
      <Route key={l.route} path={l.route} />
      <header className="steam-header" data-mock-nav-skip="">
        <input className="steam-search" placeholder="Search" aria-label="Search" />
        <nav className="dev-nav">
          <button onClick={() => (layers.history.length = 0, setLayer("route", "/library/home"))}>Home</button>
          <button onClick={() => go("/spindeck")}>Wheel page</button>
          <button onClick={() => setLayer("qam", !layers.qam)}>Quick Access</button>
          <button onClick={() => setLayer("log", !layers.log)}>Log</button>
          <button onClick={() => fetch("/dev/reset", { method: "POST" }).then(() => location.reload())}>Reset settings</button>
        </nav>
      </header>
      {l.qam && (
        <aside className="qam" data-mock-layer="" aria-label="Quick Access">
          <div className="qam-head">{plugin.titleView}</div>
          {plugin.content}
        </aside>
      )}
      {l.modal && (
        <div className="modal" data-mock-layer="">
          {l.modal}
        </div>
      )}
      {l.menu && (
        <div className="modal" data-mock-layer="">
          {l.menu}
        </div>
      )}
      {l.log && <EventLog />}
    </>
  );
}

document.addEventListener("keydown", (e) => {
  if (e.key === "`") return e.preventDefault(), setLayer("qam", !layers.qam);
  const typing = e.target instanceof HTMLInputElement;
  if (e.key.toLowerCase() === "l" && !typing) return setLayer("log", !layers.log);
  const b = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
  if (b === undefined || (typing && e.key.length === 1) || (typing && e.key === "Backspace")) return;
  e.preventDefault();
  press(b, e.repeat);
});
document.addEventListener("keyup", (e) => {
  const b = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
  if (b !== undefined) release(b);
});

// For tests and the console.
window.mock = {
  log,
  record,
  clear: () => (log.length = 0),
  events: (kind) => log.filter((e) => e.kind === kind).map((e) => e.args),
  press: (name, repeat) => press(B[name], repeat),
  circle,
  go,
  back,
  qam: (open = true) => setLayer("qam", open),
  apps,
  /** Whether the controller's keyboard action set (the trackpad circle input) is on right now. */
  keyboardActionset: () => lastKb === true,
  sgdbHits: 0,
  rivalMoves: 0,
  /** Steam re-rendering its home: every element of it is replaced. */
  rerenderHome: () => (homeRev++, notify()),
  /** Decky unloading the plugin: onDismount only, React is NOT unmounted (Decky doesn't guarantee it). */
  unload: () => plugin.onDismount(),
};

// Plugins load in either order; Decky re-renders the router when patches change.
const sgdb = params.get("sgdb");
if (sgdb === "first") routerHook.addPatch("/library/home", steamGridDbPatch);
const plugin = (await import("./plugin.js")).default();
if (sgdb === "last") routerHook.addPatch("/library/home", steamGridDbPatch);
if (params.has("rival")) routerHook.addPatch("/library/home", rivalPatch);
createRoot(document.getElementById("root")).render(<Shell plugin={plugin} />);
window.mock.ready = true;
