import {
  ButtonItem,
  DropdownItem,
  Focusable,
  Navigation,
  PanelSection,
  PanelSectionRow,
  SliderField,
  TextField,
  ToggleField,
  staticClasses,
} from "@decky/ui";
import { definePlugin, routerHook } from "@decky/api";
import { WheelPage } from "./WheelPage";
import { listCollections } from "./games";
import { requestWheelReset } from "./reset";
import { composeHangul } from "./hangul";
import { openHangulPad } from "./HangulPad";
import { useLang, detected, LangSetting } from "./locale";
import { useT, Strings } from "./i18n";
import { HomeSwitch } from "./HomeSwitch";
import { KOFI_URL, PLUGIN_VERSION, REPO_URL } from "./links";
import { levelToDb, wheelTick } from "./haptics";
import { SafeBoundary, teardownAll } from "./safety";
import { sweepLeftovers } from "./steamDom";
import { useEffect, useRef, useState } from "react";
import {
  PadSide,
  SortMode,
  WheelSettings,
  initSettings,
  updateSettings,
  useSettings,
  useSettingsLoaded,
} from "./settings";

export const ROUTE = "/spindeck";

const WheelIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
// Steam Deck home route. Verify on your client version if the wheel never shows.
export const HOME_ROUTE = "/library/home";
const SPINDECK_HOME = "data-spindeck-home";

/**
 * Text field that keeps its own state while you type (so the panel doesn't
 * re-render per keystroke) and saves after a short pause or on blur.
 * Korean can't come from Steam's keyboard here (it sends empty key events to
 * this window), so there is a separate Hangul keypad; loose jamo, if any
 * arrive, are composed.
 */
function DeferredTextField({ label, initial, onCommit }: { label: string; initial: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(initial);
  const latest = useRef(initial);
  const timer = useRef<any>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = () => {
    clearTimeout(timer.current);
    onCommit(latest.current);
  };
  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => {
        const v = composeHangul(e.target.value);
        latest.current = v;
        setText(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(commit, 1200);
      }}
      onBlur={commit}
    />
  );
}

// Same order as Strings.colors.
const PRESETS = ["#66c0f4", "#a970ff", "#ff5fa2", "#ff4d4d", "#ff9f43", "#ffd166", "#3ddc84", "#2ee6c5", "#ffffff"];

function parseHex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((c || "").trim());
  if (!m) return [102, 192, 244];
  const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
const toHex = (rgb: number[]) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/**
 * One preset colour. A plain Focusable (not DialogButton, whose own styles hid
 * the selection ring): selected = white ring + ✓, focused = slightly larger.
 */
function Swatch({ hex, name, selected, onPick }: { hex: string; name: string; selected: boolean; onPick: () => void }) {
  const [focused, setFocused] = useState(false);
  const light = parseHex(hex).reduce((a, v, i) => a + v * [0.299, 0.587, 0.114][i], 0) > 170;
  return (
    <Focusable
      onActivate={onPick}
      onClick={onPick}
      onOKActionDescription={name}
      onGamepadFocus={() => setFocused(true)}
      onGamepadBlur={() => setFocused(false)}
      style={{
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
        outlineOffset: selected ? 5 : 2,
      }}
    >
      {selected ? "✓" : ""}
    </Focusable>
  );
}

/** Accent colour: preset swatches with a live preview. */
function AccentPicker({ value, onChange, t }: { value: string; onChange: (hex: string) => void; t: Strings }) {
  const rgb = parseHex(value);
  const hex = toHex(rgb);
  return (
    <>
      <PanelSectionRow>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "4px 0" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: hex, boxShadow: "0 0 0 2px #ffffff40" }} />
          <span>{t.accent}</span>
          <span style={{ marginLeft: "auto", opacity: 0.6, fontFamily: "monospace" }}>{hex.toUpperCase()}</span>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <Focusable flow-children="row" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "6px 2px" }}>
          {PRESETS.map((p, i) => (
            <Swatch key={p} hex={p} name={t.colors[i]} selected={p === hex} onPick={() => onChange(p)} />
          ))}
        </Focusable>
      </PanelSectionRow>
    </>
  );
}

/** Open a web page in Steam's browser and close the side menu. */
function openExternal(url: string) {
  try {
    Navigation.CloseSideMenus();
    Navigation.NavigateToExternalWeb(url);
  } catch {
    /* ignore */
  }
}

function QuickAccessPanel() {
  const s = useSettings();
  const loaded = useSettingsLoaded(); // remount the fields once saved values arrive
  const [padRev, setPadRev] = useState(0); // …and after the Hangul keypad edits them
  const t = useT();
  const korean = useLang() === "ko"; // Hangul keypad buttons only for a Korean Steam UI
  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ToggleField
            label={t.homeToggle}
            description={t.homeToggleDesc}
            checked={s.homeEnabled}
            onChange={(v) => updateSettings({ homeEnabled: v })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => {
              Navigation.CloseSideMenus();
              Navigation.Navigate(s.homeEnabled ? HOME_ROUTE : ROUTE);
            }}
          >
            {t.openWheel}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.personalize}>
        <PanelSectionRow>
          <DropdownItem
            label="언어 / Language"
            description={`${t.langAuto}: ${detected.raw} (${detected.source})`}
            rgOptions={[
              { data: "auto", label: t.langAuto },
              { data: "ko", label: "한국어" },
              { data: "en", label: "English" },
            ]}
            selectedOption={s.language ?? "auto"}
            onChange={(o) => updateSettings({ language: o.data as LangSetting })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DeferredTextField key={`${loaded}-${padRev}`} label={t.ownerLabel} initial={s.ownerText} onCommit={(v) => updateSettings({ ownerText: v })} />
        </PanelSectionRow>
        {korean && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              description={t.hangulDesc}
              onClick={() => openHangulPad(t.ownerLabel, s.ownerText, (v) => { updateSettings({ ownerText: v }); setPadRev((r) => r + 1); })}
            >
              {t.hangulFor(t.ownerLabel)}
            </ButtonItem>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <DeferredTextField key={`${loaded}-${padRev}`} label={t.subLabel} initial={s.subtitleText} onCommit={(v) => updateSettings({ subtitleText: v })} />
        </PanelSectionRow>
        {korean && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => openHangulPad(t.subTitle, s.subtitleText, (v) => { updateSettings({ subtitleText: v }); setPadRev((r) => r + 1); })}
            >
              {t.hangulFor(t.subTitle)}
            </ButtonItem>
          </PanelSectionRow>
        )}
        <AccentPicker t={t} value={s.accentColor} onChange={(v) => updateSettings({ accentColor: v })} />
      </PanelSection>

      <PanelSection title={t.library}>
        <PanelSectionRow>
          <DropdownItem
            label={t.view}
            bottomSeparator="none"
            rgOptions={viewOptions(t, false)}
            selectedOption={viewOptions(t, false).some((o) => o.data === s.baseView) ? s.baseView : "base:installed"}
            onChange={(o) => updateSettings({ baseView: o.data as string })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t.sort}
            indentLevel={1}
            rgOptions={[
              { data: "recent", label: t.recent },
              { data: "alpha", label: t.alpha },
              { data: "playtime", label: t.byPlaytime },
            ]}
            selectedOption={s.sortMode}
            onChange={(o) => updateSettings({ sortMode: o.data as SortMode })}
          />
        </PanelSectionRow>
        <ShelfPicker t={t} s={s} />
      </PanelSection>

      <PanelSection title={t.display}>
        <PanelSectionRow>
          <DropdownItem
            label={t.layout}
            description={t.layoutDesc}
            rgOptions={[
              { data: "side", label: t.layoutSide },
              { data: "bottom", label: t.layoutBottom },
            ]}
            selectedOption={s.layout === "bottom" ? "bottom" : "side"}
            onChange={(o) => updateSettings({ layout: o.data as "side" | "bottom" })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.heroSize}
            description={t.pctOfWidth}
            min={40}
            max={150}
            step={5}
            value={s.heroScale}
            showValue
            onChange={(v) => updateSettings({ heroScale: v })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.visible}
            min={5}
            max={15}
            step={2}
            value={s.visibleCount}
            showValue
            onChange={(v) => updateSettings({ visibleCount: v })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.wheelSize}
            description={t.pctOfWidth}
            min={30}
            max={60}
            step={2}
            value={s.wheelSizePct}
            showValue
            onChange={(v) => updateSettings({ wheelSizePct: v })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.capsuleSize}
            description={t.base100}
            min={60}
            max={160}
            step={10}
            value={Math.round(s.capsuleScale * 100)}
            showValue
            onChange={(v) => updateSettings({ capsuleScale: v / 100 })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.textSize}
            description={t.base100}
            min={70}
            max={160}
            step={10}
            value={Math.round(s.textScale * 100)}
            showValue
            onChange={(v) => updateSettings({ textScale: v / 100 })}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.controls}>
        <PanelSectionRow>
          <ToggleField
            label={t.haptic}
            description={t.hapticDesc}
            checked={s.hapticEnabled}
            onChange={(v) => updateSettings({ hapticEnabled: v })}
          />
        </PanelSectionRow>
        {s.hapticEnabled && (
          <PanelSectionRow>
            <SliderField
              label={t.hapticLevel}
              description={t.hapticLevelDesc(levelToDb(s.hapticLevel))}
              min={1}
              max={9}
              step={1}
              value={s.hapticLevel}
              showValue
              onChange={(v) => {
                updateSettings({ hapticLevel: v });
                wheelTick(s.rotatePad, false, v); // feel it right away
              }}
            />
          </PanelSectionRow>
        )}
        {s.hapticEnabled && (
          <PanelSectionRow>
            <ToggleField
              label={t.deckOnlyHaptics}
              description={t.deckOnlyHapticsDesc}
              checked={s.deckOnlyHaptics}
              onChange={(v) => updateSettings({ deckOnlyHaptics: v })}
            />
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <ToggleField
            label={t.sound}
            description={t.soundDesc}
            checked={s.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t.pad}
            rgOptions={[
              { data: "left", label: t.left },
              { data: "right", label: t.right },
            ]}
            selectedOption={s.rotatePad}
            onChange={(o) => updateSettings({ rotatePad: o.data as PadSide })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.circle}
            description={t.circleDesc}
            checked={s.rawPadApi}
            onChange={(v) => updateSettings({ rawPadApi: v })}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title={t.about}>
        {KOFI_URL && (
          <PanelSectionRow>
            <ButtonItem layout="below" description={t.supportDesc} onClick={() => openExternal(KOFI_URL)}>
              ☕ {t.support}
            </ButtonItem>
          </PanelSectionRow>
        )}
        {REPO_URL && (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => openExternal(REPO_URL)}>
              {t.sourceAndUpdates}
            </ButtonItem>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <ButtonItem layout="below" description={t.reloadDesc} onClick={() => requestWheelReset()}>
            ↻ {t.reload}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ fontSize: 12, color: "#8b929a" }}>Spindeck v{PLUGIN_VERSION}</div>
        </PanelSectionRow>
        {s.odometerTurns >= 1 && (
          <PanelSectionRow>
            <div style={{ fontSize: 12, color: "#8b929a" }}>{t.odometer(Math.floor(s.odometerTurns).toLocaleString())}</div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
}

/** Views a wheel slot can show: installed games, whole library, ★ Favorites and every Steam collection. */
function viewOptions(t: Strings, withNone: boolean) {
  return [
    ...(withNone ? [{ data: "", label: t.slotNone }] : []),
    { data: "base:installed", label: t.installed },
    { data: "base:all", label: t.all },
    ...listCollections().map((c) => ({ data: c.id, label: `${c.id === "favorite" ? "★ " : ""}${c.name} (${c.count})` })),
  ];
}

/** L1 / R1: each opens one view the user picks (a collection or a library view), with its own sort. */
function ShelfPicker({ t, s }: { t: Strings; s: WheelSettings }) {
  const options = viewOptions(t, true);
  const sorts = [
    { data: "recent", label: t.recent },
    { data: "alpha", label: t.alpha },
    { data: "playtime", label: t.byPlaytime },
  ];
  const slot = (label: string, view: string, sort: SortMode, set: (p: Partial<WheelSettings>) => void, viewKey: "l1View" | "r1View", sortKey: "l1Sort" | "r1Sort") => (
    <>
      <PanelSectionRow>
        <DropdownItem
          label={label}
          bottomSeparator={view ? "none" : "standard"}
          rgOptions={options}
          selectedOption={options.some((o) => o.data === view) ? view : ""}
          onChange={(o) => set({ [viewKey]: o.data as string })}
        />
      </PanelSectionRow>
      {view && (
        <PanelSectionRow>
          <DropdownItem label={t.sort} indentLevel={1} rgOptions={sorts} selectedOption={sort} onChange={(o) => set({ [sortKey]: o.data as SortMode })} />
        </PanelSectionRow>
      )}
    </>
  );
  return (
    <>
      {slot("L1", s.l1View, s.l1Sort, updateSettings, "l1View", "l1Sort")}
      {slot("R1", s.r1View, s.r1Sort, updateSettings, "r1View", "r1Sort")}
      {(s.l1View || s.r1View) && (
        <PanelSectionRow>
          <ToggleField label={t.viewAnim} description={t.viewAnimDesc} checked={s.viewAnim} onChange={(v) => updateSettings({ viewAnim: v })} />
        </PanelSectionRow>
      )}
    </>
  );
}

export default definePlugin(() => {
  initSettings();
  routerHook.addRoute(
    ROUTE,
    () => (
      <SafeBoundary fallback={<div style={{ padding: 48, color: "#ccc" }}>Spindeck: something went wrong.</div>}>
        <WheelPage mode="page" />
      </SafeBoundary>
    ),
    { exact: true },
  );

  // Wrap Steam's home route. HomeSwitch decides at render time whether to show
  // the wheel or the original home, so the toggle works without a restart.
  const homePatch = routerHook.addPatch(HOME_ROUTE, (props: any) => {
    const original = props.children;
    // Marked by a prop, not by `type`: other plugins' patches may replace the
    // element's type with a wrapper, and we must still never wrap ourselves twice.
    if (original?.type !== HomeSwitch && !original?.props?.[SPINDECK_HOME]) {
      props.children = <HomeSwitch original={original} {...{ [SPINDECK_HOME]: true }} />;
    }
    return props;
  });
  return {
    name: "Spindeck",
    titleView: <div className={staticClasses.Title}>Spindeck</div>,
    content: (
      <SafeBoundary fallback={<div style={{ padding: 16, color: "#ccc" }}>Spindeck: settings failed to load.</div>}>
        <QuickAccessPanel />
      </SafeBoundary>
    ),
    icon: <WheelIcon />,
    onDismount() {
      routerHook.removeRoute(ROUTE);
      routerHook.removePatch(HOME_ROUTE, homePatch);
      // Don't rely on React running every cleanup: undo everything now
      // (keyboard action set, bar styles, hidden row) and sweep any leftovers.
      teardownAll();
      sweepLeftovers();
    },
  };
});
