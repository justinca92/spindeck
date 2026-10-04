import { Focusable, GamepadButton, GamepadEvent, Navigation } from "@decky/ui";
import { CSSProperties, memo, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "./i18n";
import { debug } from "./log";
import { AchievementProgress, GameEntry, listCollections, loadCollectionGames, loadGames, openGamePage, subscribeAchievements } from "./games";
import { subscribeCursorWheel, subscribeKeyboardAnalogWheel, subscribeScrollWheel } from "./padInput";
import { getSettings, settingsLoaded, updateSettings, useSettings } from "./settings";
import { crossedMilestone } from "./odometer";
import { playUiSound } from "./sound";
import { openNativeGameMenu } from "./nativeMenu";
import { wheelTick } from "./haptics";
import { findHeaderSearch } from "./steamDom";
import {
  ACHIEVEMENTS_DELAY_MS,
  ARRIVAL_IGNORE_MS,
  CIRCLE_START_DELAY_MS,
  HAPTIC_MUTE_AFTER_B_MS,
  HERO_SETTLE_MS,
  LETTER_FAST_STEPS,
  VIEW_STRIP_MS,
  VIEW_STRIP_TOP_PX,
  ODOMETER_SAVE_MS,
  TOAST_MS,
  TOAST_TOP_PX,
  LETTER_FAST_WINDOW_MS,
  LETTER_POPUP_MS,
  ROULETTE_EASE,
  ROULETTE_MAX_EXTRA_STEPS,
  ROULETTE_MIN_STEPS,
  ROULETTE_RESULT_MS,
  ROULETTE_SLOWDOWN_MS,
  ROULETTE_STEP_MS,
  WHEEL_FOLLOW_TAU_MS,
  WHEEL_MAX_LAG,
  WINDOW_REFOCUS_DELAY_MS,
} from "./constants";

const BASE_CAPSULE_W = 80;
const BASE_CAPSULE_H = 120;
const BASE_TITLE_PX = 22;
const BASE_TITLE_PX_SIDE = 18;
const NAMES_EACH_SIDE = 3; // game names shown for the selection ± this many

/** <img> that walks through candidate URLs until one loads. */
function FallbackImg({ srcs, style, className }: { srcs: string[]; style?: CSSProperties; className?: string }) {
  const [i, setI] = useState(0);
  const key = srcs.join("|");
  useEffect(() => setI(0), [key]);
  if (i >= srcs.length) return <div className={className} style={{ ...style, background: "#1b2838" }} />;
  return <img className={className} style={style} src={srcs[i]} onError={() => setI(i + 1)} />;
}

/** Warm the browser cache for capsules about to come into view. */
const preloaded = new Set<string>();
function preload(url: string | undefined) {
  if (!url || preloaded.has(url)) return;
  preloaded.add(url);
  try {
    const img = new Image();
    img.src = url;
  } catch {
    /* ignore */
  }
}

/**
 * Smooth rotation state, kept outside React state so only the ring re-renders
 * per frame. `pos` chases the unwrapped `target` (exponential follow, never
 * more than WHEEL_MAX_LAG behind) and every capsule is placed on the circle
 * from it — capsules always sit exactly on the arc, however fast it spins.
 */
class WheelMotion {
  target = 0;
  pos = 0;
  private raf: any = null;
  private listeners = new Set<(pos: number) => void>();
  view: any = globalThis;

  subscribe(l: (pos: number) => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  step(dir: number) {
    this.target += dir;
    this.kick();
  }
  stop() {
    if (this.raf != null) (this.view.cancelAnimationFrame ?? clearTimeout)(this.raf);
    this.raf = null;
  }
  private kick() {
    if (this.raf != null) return;
    const raf = (f: (t: number) => void) =>
      this.view.requestAnimationFrame ? this.view.requestAnimationFrame(f) : setTimeout(() => f(Date.now()), 16);
    let last = 0;
    const frame = (t: number) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      let pos = this.pos;
      const gap = this.target - pos;
      if (Math.abs(gap) > WHEEL_MAX_LAG) pos = this.target - Math.sign(gap) * WHEEL_MAX_LAG;
      pos += (this.target - pos) * (1 - Math.exp(-dt / WHEEL_FOLLOW_TAU_MS));
      if (Math.abs(this.target - pos) < 0.002) pos = this.target;
      this.pos = pos;
      this.listeners.forEach((l) => l(pos));
      this.raf = pos !== this.target ? raf(frame) : null;
    };
    this.raf = raf(frame);
  }
}

interface RingProps {
  games: GameEntry[];
  sel: number;
  motion: WheelMotion;
  W: number;
  H: number;
  flip: boolean;
  wheelSizePct: number;
  visibleCount: number;
  capsuleScale: number;
  textScale: number;
  accentColor: string;
}

/** The capsule ring — the only part that re-renders every animation frame. */
const WheelRing = memo(function WheelRing(p: RingProps) {
  const { games, sel, motion, W, H, flip } = p;
  const n = games.length;
  const [vis, setVis] = useState(motion.pos);
  useEffect(() => motion.subscribe(setVis), [motion]);

  const cx = flip ? -W * 0.02 : W * 1.02;
  const cy = H / 2;
  const R = W * (p.wheelSizePct / 100);
  // Spread `visibleCount` games over the part of the arc that fits on screen.
  const visibleHalfAngle = Math.asin(Math.min(1, H / 2 / R)) * 0.92;
  const visibleEachSide = Math.max(1, Math.floor((p.visibleCount - 1) / 2));
  const spacingRad = visibleHalfAngle / visibleEachSide;
  const capW = BASE_CAPSULE_W * p.capsuleScale;
  const capH = BASE_CAPSULE_H * p.capsuleScale;
  // One extra on each side so games slide in from off-screen.
  const span = Math.min(visibleEachSide + 1, Math.floor((n - 1) / 2));

  // Preload what's just beyond the edges whenever the selection moves.
  useEffect(() => {
    for (let off = span + 1; off <= span + 3; off++) {
      preload(games[(sel + off) % n]?.capsule[0]);
      preload(games[(((sel - off) % n) + n) % n]?.capsule[0]);
    }
  }, [sel, n]);

  if (!n) return null;
  // Integer part picks the games, fraction slides them.
  const vRel = vis - motion.target; // ≤ 0 while catching up forward
  const base = Math.round(vRel);
  const frac = vRel - base;
  const items = [];
  for (let off = -span; off <= span; off++) {
    const idx = (((sel + base + off) % n) + n) % n;
    const g = games[idx];
    const rel = off - frac; // continuous distance from the pointer
    // Right wheel: π = pointing left at the art. Left wheel: 0 = pointing right.
    const theta = flip ? -rel * spacingRad : Math.PI + rel * spacingRad;
    const x = cx + R * Math.cos(theta);
    const y = cy - R * Math.sin(theta);
    const dist = Math.abs(rel);
    const selected = idx === sel;
    const scale = dist < 1 ? 1 - 0.23 * dist : Math.max(0.55, 0.82 - dist * 0.05);
    // Capsules stay opaque so overlaps read as a stack; distance darkens instead.
    const shade = dist < 1 ? 1 - 0.32 * dist : Math.max(0.35, 0.8 - dist * 0.12);
    const nameFade = Math.max(0, Math.min(1, (NAMES_EACH_SIDE + 0.6 - dist) / 0.6));
    items.push(
      <div
        key={g.appid}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          // Anchor the capsule's centre on the arc; the title extends away from the art.
          transform: flip
            ? `translate(${x}px, ${y}px) translate(calc(-100% + ${capW / 2}px), -50%) scale(${scale})`
            : `translate(${x}px, ${y}px) translate(${-capW / 2}px, -50%) scale(${scale})`,
          transformOrigin: flip ? "right center" : "left center",
          flexDirection: flip ? "row-reverse" : "row",
          display: "flex",
          alignItems: "center",
          // Title ↔ capsule spacing: a bit more for the games around the selection
          // (they're scaled down, which also shrinks the gap).
          gap: selected ? 16 : 28,
          zIndex: 100 - Math.round(dist * 10),
          pointerEvents: "none",
        }}
      >
        <FallbackImg
          srcs={g.capsule}
          style={{
            width: capW,
            height: capH,
            objectFit: "cover",
            borderRadius: 8,
            boxShadow: selected ? `0 0 0 3px ${p.accentColor}, 0 8px 24px #000a` : "0 6px 16px #000c",
            filter: selected ? undefined : `brightness(${shade})`,
          }}
        />
        {/* Always rendered (opacity only) — mounting/unmounting names at the
            edge while spinning cost extra layout. */}
          <div
            style={{
              maxWidth: Math.max(200, 300 * p.textScale),
              fontSize: (selected ? BASE_TITLE_PX : BASE_TITLE_PX_SIDE) * p.textScale,
              fontWeight: selected ? 700 : 500,
              color: "#fff",
              opacity: (selected ? 1 : Math.max(0.35, shade)) * nameFade,
              textShadow: "0 2px 6px #000",
              // Long names wrap to two lines, then end with an ellipsis.
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              whiteSpace: "normal",
              overflow: "hidden",
              lineHeight: 1.2,
              textAlign: flip ? "right" : "left",
            }}
          >
            {g.name}
          </div>
      </div>,
    );
  }
  return <div style={{ position: "absolute", inset: 0 }}>{items}</div>;
});

/** Selected game's art, blurred background + sharp foreground. Changes only once the wheel rests. */
const Hero = memo(function Hero({ game, flip, heroScale }: { game: GameEntry | undefined; flip: boolean; heroScale: number }) {
  if (!game) return null;
  const srcs = [...game.hero, ...game.capsule];
  return (
    <>
      <FallbackImg
        key={`bg-${game.appid}`}
        className="dw-hero"
        srcs={srcs}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(28px) brightness(0.42) saturate(1.2)",
          transform: "scale(1.12)",
        }}
      />
      <FallbackImg
        key={`fg-${game.appid}`}
        className="dw-hero"
        srcs={srcs}
        style={{
          // Vertically centred on the screen, anchored to the art side.
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          [flip ? "right" : "left"]: 0,
          width: `${heroScale}%`,
          maxHeight: "92%",
          objectFit: "contain",
          objectPosition: flip ? "right center" : "left center",
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, #000 30%, #000 70%, transparent 100%), linear-gradient(to ${flip ? "left" : "right"}, #000 72%, transparent 100%)`,
          WebkitMaskComposite: "source-in",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #000a 0%, transparent 40%)", pointerEvents: "none" }} />
    </>
  );
});

/** `value`, but only after it has stopped changing for `ms`. */
function useSettled<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Runtime only (never saved): the last game picked in each view, and the last
// view. The wheel unmounts while a game page is open; this brings you back to
// the same game instead of the first one. Looked up by appid, so a re-sorted
// list (a game you just played moving to the top) still lands on it.
const lastPick = new Map<string, number>();
let lastViewKey: string | null = null;

interface WheelView {
  key: string;
  name: string;
  collection: string | null; // null = a library view (installed / whole library)
  installedOnly: boolean;    // library views only
  sort: "recent" | "alpha" | "playtime";
}

interface WheelPageProps {
  mode?: "home" | "page";
  onWheelFocus?: () => void;      // home: focus came back to the wheel
  active?: boolean;               // home: false while the sections screen is shown
  onRequestSections?: () => void; // home: D-pad ▼ → Steam's sections below
}

export function WheelPage({ mode = "page", onWheelFocus, onRequestSections, active = true }: WheelPageProps) {
  const s = useSettings();
  const t = useT();
  // Three slots in a row: [L1 pick] — base view — [R1 pick], each with its own sort.
  // L1/R1 move one step left/right (no wrap-around).
  const views = useMemo<WheelView[]>(() => {
    const colls = listCollections();
    const make = (id: string, slot: string, sort: "recent" | "alpha" | "playtime"): WheelView | null => {
      if (!id) return null;
      if (id.startsWith("base:")) {
        const scope = id.slice(5);
        return { key: `${slot}:base:${scope}`, name: scope === "installed" ? t.installed : t.all, collection: null, installedOnly: scope === "installed", sort };
      }
      const c = colls.find((x) => x.id === id);
      return c ? { key: `${slot}:coll:${c.id}`, name: c.name, collection: c.id, installedOnly: false, sort } : null;
    };
    // The main view can't be empty: a deleted collection falls back to installed games.
    const base = make(s.baseView, "base", s.sortMode) ?? make("base:installed", "base", s.sortMode)!;
    return [make(s.l1View, "l1", s.l1Sort), base, make(s.r1View, "r1", s.r1Sort)].filter((v): v is WheelView => !!v);
  }, [s.baseView, s.sortMode, s.l1View, s.l1Sort, s.r1View, s.r1Sort, t]);
  const baseKey = views.find((v) => v.key.startsWith("base:"))!.key;
  const [viewKey, setViewKey] = useState<string>(() => lastViewKey ?? baseKey);
  const view = views.find((v) => v.key === viewKey) ?? views.find((v) => v.key === baseKey) ?? views[0];
  useEffect(() => {
    lastViewKey = view.key;
  }, [view.key]);
  const games = useMemo<GameEntry[]>(
    () => (view.collection ? loadCollectionGames(view.collection, view.sort) : loadGames(view.installedOnly, view.sort)),
    [view.key, view.sort],
  );
  const n = games.length;
  const restoreSel = (list: GameEntry[]) => {
    const id = lastPick.get(view.key);
    const i = id === undefined ? -1 : list.findIndex((g) => g.appid === id);
    return i < 0 ? 0 : i;
  };
  const [sel, setSel] = useState(() => restoreSel(games));
  // New list (view switched, re-sorted): jump to that view's last game right away.
  const [selList, setSelList] = useState(games);
  if (selList !== games) {
    setSelList(games);
    setSel(restoreSel(games));
  }
  useEffect(() => {
    const g = games[sel];
    if (g) lastPick.set(view.key, g.appid);
  }, [sel, games, view.key]);
  const rootRef = useRef<HTMLDivElement>(null);
  const motion = useMemo(() => new WheelMotion(), []);
  useEffect(() => () => motion.stop(), [motion]);

  // Latest values for callbacks registered once.
  const live = useRef({ sound: s.soundEnabled, haptic: s.hapticEnabled, pad: s.rotatePad, circleOn: false, hapticLevel: s.hapticLevel, stepDegrees: s.stepDegrees, hapticDegrees: s.hapticDegrees });
  live.current.hapticLevel = s.hapticLevel;
  live.current.sound = s.soundEnabled;
  live.current.haptic = s.hapticEnabled;
  live.current.pad = s.rotatePad;
  const hapticMuteUntil = useRef(0);
  const spinningRef = useRef(false);

  const advance = (dir: 1 | -1, haptic: boolean) => {
    setSel((v) => (v + dir + n) % n);
    motion.step(dir);
    if (live.current.sound) playUiSound("step");
    if (haptic && live.current.haptic && Date.now() > hapticMuteUntil.current) wheelTick(live.current.pad, live.current.circleOn, live.current.hapticLevel);
  };
  // "pad" = trackpad circle (haptic tick on that pad); "dpad" = no haptic;
  // "analog" = circle input with separate haptic detents (ticks come from onDetent).
  const move = (dir: 1 | -1, source: "pad" | "dpad" | "analog") => {
    if (!n || spinningRef.current) return;
    advance(dir, source === "pad");
  };
  const detentTick = () => {
    if (!n || spinningRef.current || !live.current.haptic || Date.now() <= hapticMuteUntil.current) return;
    wheelTick(live.current.pad, live.current.circleOn, live.current.hapticLevel);
  };

  // Easter egg: the odometer (turns ever spun), with milestone toasts.
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: "", show: false });
  const toastTimer = useRef<any>(null);
  const showToast = (text: string) => {
    setToast({ text, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((x) => ({ ...x, show: false }));
      // Then drop it from the layout so it doesn't keep its space.
      toastTimer.current = setTimeout(() => setToast({ text: "", show: false }), 300);
    }, TOAST_MS);
  };
  const pendingTurns = useRef(0);
  const odoTimer = useRef<any>(null);
  const flushOdometer = () => {
    clearTimeout(odoTimer.current);
    // Never save before the file was read: that would overwrite it with defaults.
    if (!pendingTurns.current || !settingsLoaded()) return;
    const total = Math.round((getSettings().odometerTurns + pendingTurns.current) * 100) / 100;
    pendingTurns.current = 0;
    updateSettings({ odometerTurns: total });
  };
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      flushOdometer();
    },
    [],
  );
  const onFingerTurn = (d: number) => {
    const before = getSettings().odometerTurns + pendingTurns.current;
    pendingTurns.current += Math.abs(d) / (2 * Math.PI);
    const hit = settingsLoaded() ? crossedMilestone(before, before + Math.abs(d) / (2 * Math.PI)) : null;
    clearTimeout(odoTimer.current);
    odoTimer.current = setTimeout(flushOdometer, ODOMETER_SAVE_MS);
    if (hit !== null) {
      showToast(t.milestone(hit.toLocaleString()));
      if (live.current.sound) playUiSound("detail");
    }
  };
  // L1/R1: previous / next view. A strip at the top shows where you are for a moment.
  const [strip, setStrip] = useState(false);
  const stripTimer = useRef<any>(null);
  useEffect(() => () => clearTimeout(stripTimer.current), []);
  const switchView = (d: 1 | -1) => {
    if (views.length < 2) return;
    if (spinningRef.current) stopSpin(false);
    const j = views.findIndex((v) => v.key === view.key) + d;
    if (j < 0 || j >= views.length) return; // end of the row: stay
    setViewKey(views[j].key);
    if (live.current.sound) playUiSound("screen");
    setStrip(true);
    clearTimeout(stripTimer.current);
    stripTimer.current = setTimeout(() => setStrip(false), VIEW_STRIP_MS);
  };

  // Ⓨ roulette: spins forward, slowing down, and lands on a random game.
  // User rotation is ignored while it spins; Ⓨ again stops it on the spot.
  const spinTimer = useRef<any>(null);
  const doneTimer = useRef<any>(null);
  const [roulette, setRoulette] = useState<"idle" | "spinning" | "done">("idle");
  useEffect(
    () => () => {
      clearTimeout(spinTimer.current);
      clearTimeout(doneTimer.current);
    },
    [],
  );
  const stopSpin = (finished: boolean) => {
    clearTimeout(spinTimer.current);
    spinningRef.current = false;
    setRoulette(finished ? "done" : "idle");
    clearTimeout(doneTimer.current);
    if (finished) {
      if (live.current.sound) playUiSound("detail");
      doneTimer.current = setTimeout(() => setRoulette("idle"), ROULETTE_RESULT_MS);
    }
  };
  const spin = () => {
    if (n < 2 || spinningRef.current) return;
    spinningRef.current = true;
    setRoulette("spinning");
    // Right wheel spins the other way round (counter-clockwise on screen);
    // the left wheel keeps its direction.
    const dir: 1 | -1 = live.current.pad === "right" ? -1 : 1;
    // Small libraries: spin from where you are, MIN + 0…n-1 steps (uniform landing spot).
    // Big ones (1000+ games would take minutes): pick the winner first, jump to
    // a spot a short spin before it, and spin from there, so it always takes a few seconds.
    let steps: number;
    if (n <= ROULETTE_MAX_EXTRA_STEPS) {
      steps = ROULETTE_MIN_STEPS + Math.floor(Math.random() * n);
    } else {
      const target = Math.floor(Math.random() * n);
      steps = ROULETTE_MIN_STEPS + Math.floor(Math.random() * ROULETTE_MAX_EXTRA_STEPS);
      setSel((((target - dir * steps) % n) + n) % n);
    }
    debug("roulette", "spin", { games: n, steps });
    let i = 0;
    const tick = () => {
      advance(dir, true);
      i++;
      if (i >= steps) return stopSpin(true);
      spinTimer.current = setTimeout(tick, ROULETTE_STEP_MS + ROULETTE_SLOWDOWN_MS * Math.pow(i / steps, ROULETTE_EASE));
    };
    tick();
  };

  // Plugin code runs in Steam's hidden SharedJSContext window, so `window`
  // sizes are NOT the screen. Measure the element we actually render into.
  const [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    motion.view = el.ownerDocument?.defaultView ?? globalThis;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 100 && h > 100) setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const RO = (motion.view as any).ResizeObserver;
    const ro = RO ? new RO(measure) : null;
    ro?.observe(el);
    const tm = setTimeout(measure, 300); // after Steam finishes laying out the route
    return () => {
      ro?.disconnect();
      clearTimeout(tm);
    };
  }, []);

  // Quick Access, the Steam menu and overlays are separate windows: while one
  // is open the main window loses focus. The circle input (keyboard action set)
  // only runs while our window and the wheel itself are focused. Re-enable only
  // once focus has been stable: switching the action set right as the Steam menu
  // closes made Steam reopen the menu.
  const [winFocused, setWinFocused] = useState(true);
  useEffect(() => {
    const view: any = rootRef.current?.ownerDocument?.defaultView;
    if (!view) return;
    let tm: any;
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

  // On the home wheel, ▲/▼ are ignored right after arriving (held D-pad).
  const activeSince = useRef(Date.now());
  useEffect(() => {
    if (active) activeSince.current = Date.now();
  }, [active]);

  // Trackpad circular input.
  useEffect(() => {
    if (!inputLive) return;
    const opts = { stepDegrees: s.stepDegrees, pad: s.rotatePad, onStep: (d: 1 | -1) => move(d, "pad") };
    // Switching on the keyboard action set while a button is still held (B back
    // from search / game page) made Steam open the Steam menu: wait for release.
    let unsubAnalog = () => {};
    const startT = s.rawPadApi
      ? setTimeout(() => {
          unsubAnalog = subscribeKeyboardAnalogWheel({
            ...opts,
            onStep: (d: 1 | -1) => move(d, "analog"),
            detentDegrees: s.hapticDegrees,
            onDetent: detentTick,
            onTurn: onFingerTurn,
          });
          live.current.circleOn = true;
        }, CIRCLE_START_DELAY_MS)
      : undefined;
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

  // Alphabet popup: A–Z sort of the whole library only. Installed games and
  // collections are short lists you can see at a glance.
  const alpha = view.sort === "alpha" && !view.collection && !view.installedOnly;
  const letters = useMemo(() => games.map((g) => indexLetter(g.name)), [games]);
  const letterCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const L of letters) m.set(L, (m.get(L) ?? 0) + 1);
    return m;
  }, [letters]);
  const [popup, setPopup] = useState<{ letter: string; show: boolean }>({ letter: "", show: false });
  const lastLetter = useRef<string | null>(null);
  const popupTimer = useRef<any>(null);
  useEffect(() => () => clearTimeout(popupTimer.current), []);
  const recentSteps = useRef<number[]>([]);
  const lettersSeen = useRef(letters);
  useEffect(() => {
    const L = letters[sel];
    if (lettersSeen.current !== letters) {
      // Another list (L1/R1 view switch): start fresh, no popup for the jump itself.
      lettersSeen.current = letters;
      lastLetter.current = L ?? null;
      return;
    }
    if (!alpha || !L) return;
    const prev = lastLetter.current;
    lastLetter.current = L;
    if (prev === null) return; // first render: nothing
    // Big letter groups (a 1000-game library has ~50 games per letter) take
    // several full circles to leave, so also show the current letter once
    // you're spinning fast (3 games within 600 ms), not only on a change.
    const now = Date.now();
    const steps = (recentSteps.current = [...recentSteps.current.filter((t) => now - t < LETTER_FAST_WINDOW_MS), now]);
    if (prev === L && steps.length < LETTER_FAST_STEPS) return;
    debug("letter", "show", L, prev === L ? "(fast spin)" : "(new letter)");
    setPopup({ letter: L, show: true });
    clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup((p) => ({ ...p, show: false })), LETTER_POPUP_MS);
  }, [sel, alpha, letters]);

  // Achievements for the resting selection only.
  const [ach, setAch] = useState<AchievementProgress | null>(null);
  useEffect(() => {
    setAch(null);
    if (!current) return;
    let unsub = () => {};
    const tm = setTimeout(() => (unsub = subscribeAchievements(current.appid, setAch)), ACHIEVEMENTS_DELAY_MS);
    return () => {
      clearTimeout(tm);
      unsub();
    };
  }, [current?.appid]);

  // While the circle input is on, Steam forwards the rotating pad's TOUCH/CLICK
  // as UI button events (LPAD_TOUCH = 38 on every finger down/up); unhandled,
  // Steam reacts to them (stray B / Steam-menu actions), so they're swallowed.
  const circleInputOn = s.rawPadApi && inputLive;
  const padButtons =
    s.rotatePad === "right" ? [GamepadButton.RPAD_TOUCH, GamepadButton.RPAD_CLICK] : [GamepadButton.LPAD_TOUCH, GamepadButton.LPAD_CLICK];
  const onPadButton = (e: GamepadEvent) => {
    // Ⓑ could produce a stray pad step → mute ticks briefly. (Only Ⓑ: Steam
    // forwards other pad-related button events while rubbing.)
    if (e.detail.button === GamepadButton.CANCEL) hapticMuteUntil.current = Date.now() + HAPTIC_MUTE_AFTER_B_MS;
    if (circleInputOn && padButtons.includes(e.detail.button)) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
  };

  const consume = (e: GamepadEvent) => {
    e.preventDefault?.();
    e.stopPropagation?.();
  };
  const onDir = (e: GamepadEvent) => {
    const b = e.detail.button;
    if (mode === "home" && (b === GamepadButton.DIR_UP || b === GamepadButton.DIR_DOWN)) {
      // Held D-pad / just arrived: don't fly on past the wheel.
      if ((e.detail as any).is_repeat || Date.now() - activeSince.current < ARRIVAL_IGNORE_MS) return consume(e);
      if (b === GamepadButton.DIR_UP) {
        // Like the stock home: ▲ focuses the search box in Steam's header bar.
        const box = findHeaderSearch(rootRef.current?.ownerDocument);
        if (box) box.focus();
        else Navigation.Navigate("/search");
      } else onRequestSections?.();
      return consume(e);
    }
    const next = b === GamepadButton.DIR_RIGHT || (mode === "page" && b === GamepadButton.DIR_DOWN);
    const prev = b === GamepadButton.DIR_LEFT || (mode === "page" && b === GamepadButton.DIR_UP);
    if (!next && !prev) return;
    move(next ? 1 : -1, "dpad");
    consume(e);
  };

  const flip = s.rotatePad === "left"; // left pad → wheel on the left edge, art on the right

  return (
    <Focusable
      // @ts-ignore autoFocus exists at runtime
      autoFocus
      noFocusRing
      onGamepadDirection={onDir}
      onButtonDown={(e: GamepadEvent) => {
        const b = e.detail.button;
        debug("buttons", "down", b, { L1: GamepadButton.BUMPER_LEFT, R1: GamepadButton.BUMPER_RIGHT, views: views.map((v) => v.key) });
        if ((b === GamepadButton.BUMPER_LEFT || b === GamepadButton.BUMPER_RIGHT) && views.length > 1) {
          consume(e);
          switchView(b === GamepadButton.BUMPER_LEFT ? -1 : 1);
          return;
        }
        onPadButton(e);
      }}
      onButtonUp={onPadButton}
      // Ⓐ opens Steam's own game page.
      onOKButton={() => {
        if (!current) return;
        if (s.soundEnabled) playUiSound("detail");
        openGamePage(current);
      }}
      onOKActionDescription={t.gamePage}
      // Confirmed on device: Ⓨ arrives as "Options", ≡ as "Menu".
      onOptionsButton={(e: any) => {
        consume(e);
        debug("roulette", "Y", { spinning: spinningRef.current, games: n });
        if (spinningRef.current) stopSpin(true);
        else spin();
      }}
      onOptionsActionDescription={t.roulette}
      onMenuButton={(e: any) => {
        if (current) openNativeGameMenu(current.appid, current.overview, e?.currentTarget ?? rootRef.current ?? undefined, rootRef.current?.ownerDocument?.defaultView);
      }}
      onMenuActionDescription={t.options}
      onCancelButton={mode === "page" ? () => Navigation.NavigateBack() : undefined}
      onGamepadFocus={() => {
        setWheelFocused(true);
        onWheelFocus?.();
      }}
      onGamepadBlur={() => setWheelFocused(false)}
      style={{
        position: mode === "home" ? "absolute" : "fixed",
        inset: 0,
        background: "#0b0f16",
        overflow: "hidden",
        zIndex: mode === "home" ? undefined : 900,
      }}
    >
      <div ref={rootRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <style>{`
          /* Opacity only: animating transform would override the art's own
             positioning (translateY(-50%)) and make it jump into place. */
          @keyframes dwFade { from { opacity: 0; } to { opacity: 1; } }
          .dw-hero { animation: dwFade 220ms ease-out; }
        `}</style>

        <Hero game={games[heroSel]} flip={flip} heroScale={s.heroScale} />

        <WheelRing
          games={games}
          sel={sel}
          motion={motion}
          W={size.w}
          H={size.h}
          flip={flip}
          wheelSizePct={s.wheelSizePct}
          visibleCount={s.visibleCount}
          capsuleScale={s.capsuleScale}
          textScale={s.textScale}
          accentColor={s.accentColor}
        />

        {alpha && popup.letter && (
          <LetterPopup letter={popup.letter} count={letterCounts.get(popup.letter) ?? 0} show={popup.show} accent={s.accentColor} label={t.letterCount} />
        )}

        {views.length > 1 && (
          <ViewStrip views={views} current={view.key} show={strip} accent={s.accentColor} />
        )}

        {/* Fixed spot on the art side, out of the corner block's flow: that block
            resizes with every game while spinning, which made the toast jump. */}
        <Toast text={toast.text} show={toast.show} accent={s.accentColor} side={flip ? "right" : "left"} />

        {!n && (
          <div style={{ position: "absolute", [flip ? "left" : "right"]: 60, top: "48%", color: "#aaa", fontSize: 20 }}>{t.noGames}</div>
        )}

        {/* Personalization: bottom corner on the artwork side */}
        <div
          style={{
            position: "absolute",
            [flip ? "right" : "left"]: 40,
            bottom: 32,
            color: "#fff",
            textShadow: "0 2px 8px #000",
            textAlign: flip ? "right" : "left",
          }}
        >
          <RoulettePill state={roulette} accent={s.accentColor} label={roulette === "spinning" ? t.rouletteSpinning : roulette === "done" && current ? t.rouletteDone(current.name) : t.roulette} />
          {current && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: flip ? "flex-end" : "flex-start",
                gap: 6,
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              <span style={{ color: s.accentColor }}>
                {current.name.toUpperCase()} · {t.playtime(Number(current.overview?.minutes_playtime_forever ?? 0))}
              </span>
              {ach && (
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#c8d1dc" }}>
                  STEAM ACHIEVEMENTS {ach.achieved}/{ach.total}
                  <span style={{ width: 80, height: 4, borderRadius: 2, background: "#ffffff33", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${(ach.achieved / ach.total) * 100}%`, background: s.accentColor }} />
                  </span>
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>{s.ownerText}</div>
          {s.subtitleText && <div style={{ fontSize: 16, opacity: 0.8, marginTop: 4 }}>{s.subtitleText}</div>}
        </div>
      </div>
    </Focusable>
  );
}

/** Index letter of a title: A–Z, a Hangul initial consonant (ㄱ…ㅎ), "#" for digits/symbols. */
const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
export function indexLetter(name: string): string {
  const ch = (name.trim()[0] ?? "#").toUpperCase();
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return CHOSEONG[Math.floor((code - 0xac00) / 588)];
  if (/[A-Z]/.test(ch) || /[\u3131-\u314e]/.test(ch)) return ch;
  if (/\p{L}/u.test(ch)) return ch;
  return "#";
}

/**
 * Alphabetical sort: when the selection moves into a new letter, a big
 * non-interactive letter popup shows in the middle of the screen for 1 s,
 * then fades. Moving into another letter meanwhile switches it at once and
 * restarts the 1 s.
 */
function LetterPopup({ letter, count, show, accent, label }: { letter: string; count: number; show: boolean; accent: string; label: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: 150,
        height: 150,
        borderRadius: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        // A rounded square with no border: its edge is feathered by a same-colour
        // shadow so it fades into the art. (No backdrop-filter — Steam's
        // compositor didn't draw it.)
        background: "rgba(11, 15, 22, 0.55)",
        boxShadow: "0 0 24px 10px rgba(11, 15, 22, 0.4)",
        opacity: show ? 1 : 0,
        transition: show ? "opacity 80ms ease-out" : "opacity 300ms ease-in",
        pointerEvents: "none",
        zIndex: 300,
      }}
    >
      <span style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, color: accent, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{letter}</span>
      <span style={{ fontSize: 12, color: "#dfe5ec", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{label.replace("{n}", String(count))}</span>
    </div>
  );
}

/**
 * L1/R1 view strip, top centre: the previous, current and next view, shown
 * for a moment after switching. Non-interactive.
 */
function ViewStrip({ views, current, show, accent }: { views: WheelView[]; current: string; show: boolean; accent: string }) {
  const i = Math.max(0, views.findIndex((v) => v.key === current));
  const at = (d: number) => views[i + d];
  const label = (v: WheelView) => (v.collection === "favorite" ? "★ " : "") + v.name;
  const side: CSSProperties = { color: "#8b929a", fontSize: 15, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const key: CSSProperties = { fontSize: 12, fontWeight: 800, color: "#c8d1dc", background: "rgba(255,255,255,0.14)", borderRadius: 6, padding: "2px 7px" };
  return (
    <div
      aria-hidden="true"
      style={{
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
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ ...key, opacity: at(-1) ? 1 : 0.3 }}>L1</span>
      {at(-1) && <span style={side}>{label(at(-1))}</span>}
      <span style={{ color: accent, fontSize: 18, fontWeight: 800 }}>{label(at(0))}</span>
      {at(1) && <span style={side}>{label(at(1))}</span>}
      <span style={{ ...key, opacity: at(1) ? 1 : 0.3 }}>R1</span>
    </div>
  );
}

/** Small pill above the roulette one for easter-egg messages; fades in and out. */
function Toast({ text, show, accent, side }: { text: string; show: boolean; accent: string; side: "left" | "right" }) {
  if (!text) return null;
  return (
    <div
      aria-hidden="true"
      style={{
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
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
}

function RoulettePill({ state, accent, label }: { state: "idle" | "spinning" | "done"; accent: string; label: string }) {
  const idle = state === "idle";
  return (
    <div
      style={{
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
        transition: "background 200ms, color 200ms",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          background: idle ? "#e3b341" : "#0b0f16",
          color: idle ? "#0b0f16" : "#e3b341",
        }}
      >
        Y
      </span>
      {label}
    </div>
  );
}
