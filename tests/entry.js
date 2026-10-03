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
window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = { connect: () => ({ call: async (m) => (m === "get_settings" ? { ownerText: "j1의 스팀덱", rotatePad: "left", soundEnabled: false, hapticEnabled: location.hash === "#pulse" || location.hash === "#qam", hapticMode: "pulseShort", rawPadApi: location.hash !== "#nopad" } : true), routerHook: { addRoute: (p, c) => (window.__routeComp = c), addPatch: (p, f) => (patchFn = f), removePatch() {}, removeRoute() {} } }) };
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
  const Orig = () => h("div", { style: { height: "100%", overflowY: "auto", backgroundImage: "repeating-linear-gradient(90deg, #c33 0 40px, #36c 40px 80px)", backgroundAttachment: "local" }, id: "orighome" },
    h("div", { style: { position: "absolute", height: 0 } }),
    h("div", { style: { height: 561, background: "#333" } }, h("button", null, "recent")),
    h("div", { id: "sec" }, h("div", null, h("div", { id: "tabs", style: { height: 58, background: "#2a2f38" } }, h("button", { style: { background: "transparent" } }, "tab"), h("button", { id: "friends", style: { background: "transparent" } }, "friends"), h("button", { style: { background: "transparent" } }, "recommended")), h("div", { style: { height: 1500 } }, h("button", null, "row1"), h("div", { style: { height: 300 } }), h("button", null, "row2")))));
  const Flat = () => h("div", { id: "orighome" }, "unrecognised home layout", h("button", null, "only"));
  const tree = location.hash === "#qam" ? window.__plugin.content : location.hash === "#flat" ? patchFn({ children: h(Flat) }).children : location.hash === "#page" ? h(window.__routeComp) : patchFn({ children: h(Orig) }).children;
  const hdr = document.createElement("div"); hdr.id = "steamhdr"; hdr.style.cssText = "position:fixed;top:0;left:0;right:0;height:40px;background:rgba(0,0,0,0.5);backdrop-filter:blur(20px);z-index:6001"; hdr.innerHTML = '<input style="height:30px">'; document.body.appendChild(hdr);
  ReactDOMClient.createRoot(document.getElementById("root")).render(tree);
};
