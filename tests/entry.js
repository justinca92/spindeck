import * as React from "/opt/npm-tools/node_modules/react/index.js";
import * as ReactDOMClient from "/opt/npm-tools/node_modules/react-dom/client.js";
window.SP_REACT = React;
const h = React.createElement;
const B = { OK: 1, CANCEL: 2, SECONDARY: 3, OPTIONS: 4, DIR_UP: 9, DIR_DOWN: 10, DIR_LEFT: 11, DIR_RIGHT: 12, START: 14, LPAD_TOUCH: 19, LPAD_CLICK: 20, RPAD_TOUCH: 21, RPAD_CLICK: 22 };
window.__focusables = [];
function Focusable(props) {
  if (location.hash === "#crash" && props.onOptionsButton) throw new Error("simulated Steam change");
  const { children, style, onGamepadDirection, onButtonDown, onButtonUp, onOKButton, onOptionsButton, onMenuButton, onCancelButton, onGamepadFocus, onGamepadBlur, autoFocus, noFocusRing, "flow-children": fc, ...rest } = props;
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current.__props = props; });
  return h("div", { ref, style, tabIndex: 0, "data-focusable": "", ...rest }, children);
}
const comp = (n) => (p) => h("div", { "data-c": n, "data-label": typeof p.label === "string" ? p.label : undefined, "data-desc": typeof p.description === "string" ? p.description : undefined }, p.children);
window.DFL = { Focusable, GamepadButton: B, Navigation: { Navigate: (p) => (window.__nav = p), NavigateBack() {}, CloseSideMenus() {} },
  ButtonItem: comp("ButtonItem"), DialogButton: comp("DialogButton"), DropdownItem: comp("DropdownItem"), PanelSection: comp("PanelSection"), PanelSectionRow: comp("PanelSectionRow"),
  SliderField: comp("SliderField"), TextField: comp("TextField"), ToggleField: comp("ToggleField"), ModalRoot: comp("ModalRoot"), staticClasses: {}, showContextMenu() {}, showModal() {} };
let patchFn;
window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = { connect: () => ({ call: async (m) => (m === "get_settings" ? { ...(location.hash.endsWith("-off") ? { homeEnabled: false } : {}), ...(location.hash.startsWith("#bottom") ? { layout: "bottom", subtitleText: "Steam Deck OLED · 1TB" } : {}), ...(location.hash.includes("legacy") ? { heroLegacyPos: true } : {}), ...(location.hash.includes("qam-bottom") ? { layout: "bottom" } : {}), ownerText: "j1의 스팀덱", rotatePad: location.hash.endsWith("-right") ? "right" : "left", soundEnabled: false, hapticEnabled: location.hash === "#pulse" || location.hash === "#qam", hapticMode: "pulseShort", rawPadApi: location.hash !== "#nopad" } : true), routerHook: { addRoute: (p, c) => (window.__routeComp = c), addPatch: (p, f) => (patchFn = f), removePatch() {}, removeRoute() {} } }) };
const apps = Array.from({ length: 30 }, (_, i) => ({ appid: 100 + i, app_type: 1, display_name: "Game " + i, installed: true, rt_last_time_played: 1000 - i, minutes_playtime_forever: i * 30 }));
window.collectionStore = { GetCollection: () => ({ allApps: apps }) };
window.appStore = { GetCustomHeroImageURLs: (a) => ["/hero" + (a.appid % 3) + ".png?" + a.appid], GetCustomVerticalCapsuleURLs: (a) => ["/cap" + (a.appid % 3) + ".png?" + a.appid] };
window.__ks = [];
window.__pulses = [];
const hapticModule = function () { return "PlaySteamDeckHaptic Playing legacy haptics"; };
const fakeReq = (id) => ({ svc: { PlaySteamDeckHaptic: (...a) => window.__pulses.push(a) } });
fakeReq.m = { 1: hapticModule };
window.webpackChunksteamui = { push: ([, , cb]) => cb(fakeReq) };
window.SteamClient = { Input: { TriggerHapticPulse: (...a) => window.__pulses.push(a), RegisterForControllerAnalogInputMessages: (cb) => { window.__analog = cb; return { unregister() { window.__ks.push("unreg"); } }; }, EnableControllerAnalogInputMessages: (v) => window.__ks.push("analog:" + v), SetKeyboardActionset: (a, b) => window.__ks.push("kb:" + a) }, Apps: { RegisterForAppDetails: () => ({ unregister() {} }) }, Settings: { GetCurrentLanguage: async () => "english" } };
window.__start = async () => {
  const mod = await import(/* @vite-ignore */ ["", "plugin.js"].join("/"));
  window.__plugin = mod.default();
  await new Promise((r) => setTimeout(r, 50));
  const Recents = React.memo(() => h("button", null, "recent")); // Steam's recent-games row (memo)
  const Orig = () => h("div", { style: { height: "100%", overflowY: "auto", backgroundImage: "repeating-linear-gradient(90deg, #c33 0 40px, #36c 40px 80px)", backgroundAttachment: "local" }, id: "orighome" },
    h("div", { style: { position: "absolute", height: 0 } }),
    h("div", { style: { height: 561, background: "#333" } }, h(Recents, { autoFocus: true, showBackground: true })),
    h("div", { id: "sec" }, h("div", null, h("div", { id: "tabs", style: { height: 58, background: "#2a2f38" } }, h("button", { style: { background: "transparent" } }, "tab"), h("button", { id: "friends", style: { background: "transparent" } }, "friends"), h("button", { style: { background: "transparent" } }, "recommended")), h("div", { style: { height: 1500 } }, h("button", null, "row1"), h("div", { style: { height: 300 } }), h("button", null, "row2")))));
  // Another plugin patching the same route like SteamGridDB's "uniform featured" (#2):
  // Decky's afterPatch on the element's type, then wrapReactType (`{ ...type }`) on its output.
  const WRAPPED = Symbol("wrapped");
  const wrapReactType = (node) => (node.type?.[WRAPPED] ? node.type : (node.type = { ...node.type, [WRAPPED]: true }));
  const afterPatch = (obj, prop, handler) => { const orig = obj[prop]; obj[prop] = Object.assign(function (...a) { const ret = orig.apply(this, a); return handler(a, ret) ?? ret; }, orig); };
  const sgdb = (props) => { afterPatch(props.children, "type", (_, ret) => { wrapReactType(ret); afterPatch(ret.type, "type", (_, ret2) => ret2); return ret; }); return props; };
  const OrigMemo = React.memo(Orig);
  const SteamHome = () => h(OrigMemo); // Steam's home renders a memo element, so the copy stays valid
  // Decky's real route patching (router-hook processList): every patch gets a fresh
  // clone of the route child; a child not yet patched gets a wrapper type; patches run
  // in registration order, each on the previous one's output, marked isPatched.
  const IS_PATCHED = Symbol("isPatched");
  const deckyRoute = (child, patches) => {
    for (const patch of patches) {
      const oType = child.type;
      const next = patch({ path: "/library/home", children: { ...React.cloneElement(child), type: child[IS_PATCHED] ? oType : (props) => h(oType, props) } }).children;
      next[IS_PATCHED] = true;
      child = next;
    }
    return child;
  };
  const findInTree = (node, filter) => {
    if (!node || typeof node !== "object") return null;
    if (filter(node)) return node;
    if (Array.isArray(node)) { for (const x of node) { const r = findInTree(x, filter); if (r) return r; } return null; }
    for (const k of ["props", "children", "child", "sibling"]) { const r = findInTree(node[k], filter); if (r) return r; }
    return null;
  };
  // SteamGridDB 1.7.x home patch, its first levels as in src/patches/homePatch.tsx.
  const sgdbReal = (props) => {
    afterPatch(props.children, "type", (_, ret) => {
      let cache2 = null;
      wrapReactType(ret);
      afterPatch(ret.type, "type", (_, ret2) => {
        if (cache2) return cache2;
        const recents = findInTree(ret2, (x) => x?.props && "autoFocus" in x.props && "showBackground" in x.props);
        if (recents) {
          wrapReactType(recents);
          afterPatch(recents.type, "type", (_, ret3) => { cache2 = ret2; window.__sgdbHit = (window.__sgdbHit || 0) + 1; return ret3; });
        }
        return ret2;
      });
      return ret;
    });
    return props;
  };
  // Steam's home route child: a memo component whose output holds the recents row.
  const SteamHomeRoute = React.memo(Orig);
  const deckyTree = location.hash.startsWith("#decky-spindeck-first") ? deckyRoute(h(SteamHomeRoute), [patchFn, sgdbReal]) : location.hash.startsWith("#decky-sgdb-first") ? deckyRoute(h(SteamHomeRoute), [sgdbReal, patchFn]) : null;
  const sgdbTree = deckyTree ? deckyTree : location.hash.startsWith("#sgdb-after") ? sgdb(patchFn({ children: h(SteamHome) })).children : location.hash.startsWith("#sgdb-before") ? patchFn(sgdb({ children: h(SteamHome) })).children : null;
  const Flat = () => h("div", { id: "orighome" }, "unrecognised home layout", h("button", null, "only"));
  const tree = sgdbTree ? sgdbTree : location.hash.startsWith("#qam") ? window.__plugin.content : location.hash === "#flat" ? patchFn({ children: h(Flat) }).children : location.hash === "#page" ? h(window.__routeComp) : patchFn({ children: h(Orig) }).children;
  const hdr = document.createElement("div"); hdr.id = "steamhdr"; hdr.style.cssText = "position:fixed;top:0;left:0;right:0;height:40px;background:rgba(0,0,0,0.5);backdrop-filter:blur(20px);z-index:6001"; hdr.innerHTML = '<input style="height:30px">'; document.body.appendChild(hdr);
  ReactDOMClient.createRoot(document.getElementById("root")).render(tree);
};
