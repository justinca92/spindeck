import { Focusable, GamepadButton } from "@decky/ui";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { WheelPage } from "./WheelPage";
import { useWheelGeneration } from "./reset";
import { getSettings, updateSettings, useSettings, useSettingsLoaded } from "./settings";
import { playUiSound } from "./sound";
import { onTeardown, SafeBoundary } from "./safety";
import { debug } from "./log";
import { BarLook, CLEAR_CLASS, CLEAR_PROPS, ensureClearStyle, focusablesIn, focusFirstIn, headerStrips, learnBarLook, learnedBarLook, removeInjectedStyles, seedBarLook, StyleKeeper, topBarBottom } from "./steamDom";
import {
  HEADER_REAPPLY_MS,
  HEADER_RESCAN_MS,
  HIDDEN_ROW_GRACE_MS,
  HOLD_GRACE_MS,
  HOLD_REPEAT_MS,
  SCROLL_SETTLE_MS,
  SLIDE_MS,
  SLIDE_SETTLED_MS,
  SWITCH_COOLDOWN_MS,
  UP_FOCUS_WINDOW_MS,
} from "./constants";

/**
 * Rendered in place of Steam's home route.
 * - toggle off (or settings not loaded yet) → Steam's original home, untouched
 * - toggle on → two screens stacked vertically, switched by the plugin itself:
 *     "wheel":    the wheel (replaces the original recent-games area)
 *     "sections": the original home's lower sections (What's New, Friends, Recommended…)
 *   wheel    → ▼ (WheelPage) or swipe up                          → sections
 *   sections → ▲ from the top row, or swipe down at the top         → wheel
 *   sections → Ⓑ: to the top of the sections; at the top, Steam's own Ⓑ (Steam menu)
 */
export function HomeSwitch({ original }: { original: ReactNode }) {
  const s = useSettings();
  const loaded = useSettingsLoaded();
  if (!loaded || !s.homeEnabled) return <>{original}</>;
  // Anything going wrong inside → Steam's original home, untouched.
  return (
    <SafeBoundary fallback={original}>
      <WheelHome original={original} />
    </SafeBoundary>
  );
}

// ───────────────────────── Steam home layout ─────────────────────────
/**
 * Confirmed on device (SteamOS 3.8, Steam 2026-09):
 *   <vertical scroller>
 *     ├─ empty spacer (absolute, h=0)
 *     ├─ Panel — recent games / library area (h≈561)
 *     └─ sections container (h=0; its content is positioned relative to the
 *        panel above: tab header h=58 + panel h=494)
 * Removing the panel (display:none) collapses the scroller → black screen, so it
 * is kept in the layout but invisible, and the scroller is scrolled to the sections.
 */
const SPACER_ATTR = "data-spindeck-spacer";
type Parts = { vs: HTMLElement; sectionsBlock: HTMLElement; above: HTMLElement[]; header: HTMLElement | null };

function isScrollableY(view: any, el: HTMLElement) {
  const o = view.getComputedStyle(el).overflowY;
  return (o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 40;
}

/** Cached per host; re-found only when Steam re-renders the home. */
const partsCache = new WeakMap<HTMLElement, Parts>();
function homeParts(host: HTMLElement | null): Parts | null {
  if (!host) return null;
  const hit = partsCache.get(host);
  if (hit && hit.vs.isConnected && host.contains(hit.vs) && hit.vs.contains(hit.sectionsBlock)) return hit;
  const view: any = host.ownerDocument?.defaultView ?? window;
  const vs = Array.from(host.querySelectorAll<HTMLElement>("div")).find((el) => isScrollableY(view, el));
  if (!vs) return null;
  const kids = (Array.from(vs.children) as HTMLElement[]).filter((el) => !el.hasAttribute(SPACER_ATTR));
  if (kids.length < 2) return null;
  const sectionsBlock = kids[kids.length - 1];
  const parts: Parts = {
    vs,
    sectionsBlock,
    above: kids.slice(0, -1).filter((el) => el.children.length > 0),
    // Tab row (L1 · What's New · Friends · Recommended · R1) = first block of the sections content.
    header: (sectionsBlock.firstElementChild?.firstElementChild as HTMLElement | null) ?? null,
  };
  partsCache.set(host, parts);
  return parts;
}

/** How far we've grown the tab row upward (and its original margin/padding). */
const rowExt = new WeakMap<HTMLElement, { ext: number; margin: number; pad: number }>();

/** scrollTop that puts the sections' tab row just below Steam's top bar. */
function sectionsOffset(p: Parts) {
  const target = p.header ?? p.sectionsBlock;
  const vsTop = p.vs.getBoundingClientRect().top;
  const inset = Math.max(0, topBarBottom(p.vs.ownerDocument) - vsTop);
  // The tab row may be grown upward by us (see syncHeader): measure where its content starts.
  const grown = p.header ? rowExt.get(p.header)?.ext ?? 0 : 0;
  return Math.max(0, Math.round(target.getBoundingClientRect().top + grown - vsTop + p.vs.scrollTop - inset));
}

/** Scroll home so the sections are in view, and optionally focus their first item. */
function revealSections(host: HTMLElement | null, focus = true) {
  const p = homeParts(host);
  if (!p) return;
  p.vs.scrollTop = sectionsOffset(p);
  if (!focus) return;
  // Focus the CURRENT tab (What's New / Friends / Recommended), like the stock
  // page. Focusing a tab selects it, so focusing the first one always jumped
  // back to What's New (e.g. Ⓑ on Friends).
  const tab = p.header ? currentTab(p.header) : null;
  if (tab) tab.focus();
  else focusFirstIn(p.sectionsBlock);
}

/** The selected tab in the tab row: aria state, a "selected/active" class, or the one painted differently. */
function currentTab(row: HTMLElement): HTMLElement | null {
  const tabs = focusablesIn(row).filter((el) => el.getBoundingClientRect().width > 0);
  if (!tabs.length) return null;
  const marked = tabs.find(
    (el) =>
      el.getAttribute("aria-selected") === "true" ||
      el.getAttribute("aria-current") === "true" ||
      /(^|[\s_-])(selected|active)/i.test(el.className + " " + (el.parentElement?.className ?? "")),
  );
  if (marked) return marked;
  // The selected tab is drawn as a pill: the only one with its own background.
  const view: any = row.ownerDocument.defaultView;
  const painted = tabs.filter((el) => {
    const bg = view.getComputedStyle(el).backgroundColor;
    return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
  });
  if (painted.length === 1) return painted[0];
  return lastTab && tabs.includes(lastTab) ? lastTab : null;
}

/** Last tab that had focus (fallback when the selected tab can't be recognised). */
let lastTab: HTMLElement | null = null;

/**
 * Hide the original recent-games row (it stays in the layout, invisible).
 * A trailing spacer of ours extends the scroll range so the tab row can always
 * reach the top. Scrolling is clamped: pinned to 0 while resting on the wheel
 * (an un-scrolled home keeps Steam's header transparent), and never above the
 * tab row on the sections (no black gap).
 */
function hideFirstShelf(host: HTMLElement, mode: () => "top" | "sections" | "free"): (() => void) | null {
  const p = homeParts(host);
  if (!p || !p.above.length) return null;
  const prev = p.above.map((el) => [el.style.visibility, el.style.pointerEvents] as const);
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
      if (p.vs.scrollTop > 0) p.vs.scrollTop = 0;
    } else if (m === "sections") {
      const off = sectionsOffset(p);
      if (p.vs.scrollTop < off - 1) p.vs.scrollTop = off;
    }
  };
  // Wheel: pin immediately (invisible). Sections: only once scrolling has
  // settled, so the clamp never fights Steam's smooth scroll to a focused item.
  let settle: any;
  const onScroll = () => {
    if (mode() === "top") return clamp();
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

/**
 * True if ▲ from the current focus should leave for the wheel: focus is on the
 * tab row, or in the top content row (nothing focusable above it but the tab
 * row — tabs switch with L1/R1, so the tab row isn't a stop on the way up).
 */
function atTopOfSections(host: HTMLElement | null) {
  const p = homeParts(host);
  const active = host?.ownerDocument?.activeElement as HTMLElement | null;
  if (!p || !active || !p.sectionsBlock.contains(active)) return false;
  if (p.header?.contains(active)) return true;
  const top = active.getBoundingClientRect().top;
  return !focusablesIn(p.sectionsBlock).some((el) => {
    if (el === active || p.header?.contains(el)) return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom <= top - 4;
  });
}

/**
 * Focus is in an overlay Steam opened inside the home (What's New event
 * details etc.): inside our sections box but outside the home's scroller.
 * While one is open, the plugin leaves every input to Steam.
 */
function focusInOverlay(host: HTMLElement | null) {
  const p = homeParts(host);
  const active = host?.ownerDocument?.activeElement as HTMLElement | null;
  return !!(p && active && host!.contains(active) && !p.vs.contains(active));
}

// ───────────────────────── Header bar ─────────────────────────
/**
 * Wheel: Steam's top bar is see-through.
 * Sections: Steam's top bar keeps its own opaque look, and the tab row right
 * below it (L1 · What's New · Friends · Recommended · R1) gets exactly the same
 * look, learned from Steam's bar whenever Steam paints it, so the two read as
 * one bar like the stock page. When Steam isn't painting its bar at that
 * moment, the tab row's colour is extended up behind it with a shadow.
 * Synced idempotently: nothing is rewritten unless it changes.
 */
function syncHeader(keeper: StyleKeeper, doc: Document, screen: Screen, host: HTMLElement | null) {
  const strips = headerStrips(doc, HEADER_RESCAN_MS);
  ensureClearStyle(doc);
  const releaseRow = (row: HTMLElement | null) => row && rowExt.delete(row);
  const row = homeParts(host)?.header ?? null;
  if (screen === "wheel") {
    releaseRow(row);
    keeper.keepOnly(new Set(strips));
    for (const el of strips) keeper.set(el, CLEAR_PROPS, CLEAR_CLASS);
    return;
  }
  const rect = row?.getBoundingClientRect();
  const st = row ? rowExt.get(row) : undefined;
  const contentTop = rect ? rect.top + (st?.ext ?? 0) : -1; // where the row's own content starts
  const rowVisible = !!rect && rect.bottom > 0;
  // Learn Steam's opaque look once, from its own (uncleared) bar on the scrolled home.
  if (!learnedBarLook()) {
    releaseRow(row);
    keeper.keepOnly(new Set());
    const fresh = learnBarLook(strips);
    if (fresh) saveBarLook(fresh);
  }
  const look = learnedBarLook();
  if (!row || !rowVisible || !look) {
    releaseRow(row);
    keeper.keepOnly(new Set()); // tab row scrolled away / look not known yet: Steam's own bar
    return;
  }
  // ONE element carries the band: the tab row, grown upward to the top of
  // the screen (negative margin + equal extra padding, so its content and the
  // layout around it don't move), with Steam's look — rgba(0,0,0,0.5) +
  // blur(100px), confirmed on device. Steam's bar is cleared on top of it.
  // Two separately blurred elements always showed a seam: each blurs a
  // different backdrop (dark above, banner art below).
  const bg = [look.image && look.image !== "none" ? look.image : "", look.color].filter(Boolean).join(", ");
  const blur = look.backdrop && look.backdrop !== "none" ? look.backdrop : "none";
  let base = st;
  if (!base) {
    const cs = doc.defaultView!.getComputedStyle(row);
    base = { ext: 0, margin: parseFloat(cs.marginTop) || 0, pad: parseFloat(cs.paddingTop) || 0 };
  }
  const ext = Math.max(0, Math.round(contentTop));
  rowExt.set(row, { ...base, ext });
  keeper.keepOnly(new Set([row, ...strips]));
  for (const el of strips) keeper.set(el, CLEAR_PROPS, CLEAR_CLASS);
  keeper.set(row, {
    background: bg,
    "backdrop-filter": blur,
    "-webkit-backdrop-filter": blur,
    "box-shadow": "none",
    "margin-top": `${base.margin - ext}px`,
    "padding-top": `${base.pad + ext}px`,
  });
}



/** Persist the learned look so the band is right from the first frame next time. */
function saveBarLook(look: BarLook) {
  updateSettings({ barLook: look });
}

// ───────────────────────── Component ─────────────────────────
type Screen = "wheel" | "sections";

function WheelHome({ original }: { original: ReactNode }) {
  const wheelGen = useWheelGeneration();
  const [screen, setScreen] = useState<Screen>("wheel");
  const screenRef = useRef<Screen>("wheel");
  screenRef.current = screen;
  const root = useRef<HTMLDivElement>(null);
  const wheelBox = useRef<HTMLDivElement>(null);
  const sections = useRef<HTMLDivElement>(null);

  // Timing state shared by the switch guards.
  const tm = useRef({
    switchedAt: 0, // last wheel ⇄ sections switch (cooldown, no ping-pong)
    enteredSectionsAt: 0,
    lastUpAt: 0, // last ▲ seen on the sections
    heldUpAt: 0, // last ▲ that was part of a hold (auto-repeat)
    restingOnWheel: true, // home scroller pinned to 0
  });
  const timers = useRef<any[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** The single place screens change. */
  const switchTo = (next: Screen) => {
    const t = tm.current;
    if (screenRef.current === next || Date.now() - t.switchedAt < SWITCH_COOLDOWN_MS) return;
    t.switchedAt = Date.now();
    if (next === "sections") {
      t.restingOnWheel = false;
      t.enteredSectionsAt = Date.now();
      revealSections(sections.current, false); // position before the slide → no black flash
    }
    screenRef.current = next;
    setScreen(next);
    if (getSettings().soundEnabled) playUiSound("screen");
    later(() => {
      if (screenRef.current !== next) return;
      if (next === "sections") revealSections(sections.current);
      else {
        focusFirstIn(wheelBox.current);
        t.restingOnWheel = true;
        const vs = homeParts(sections.current)?.vs;
        if (vs) vs.scrollTop = 0;
      }
    }, SLIDE_SETTLED_MS);
  };
  const toSections = () => switchTo("sections");
  const toWheel = () => switchTo("wheel");

  /**
   * Steam moved gamepad focus onto the wheel. On the wheel screen that's
   * normal. On the sections screen it's Steam's own navigation walking out of
   * what's shown (e.g. ▲ past the top of a What's New popup) — leaving for the
   * wheel there made the popup vanish. Leaving is decided by our ▲ handling
   * only, so focus is put back where it was.
   */
  const onWheelGotFocus = () => {
    if (screenRef.current !== "sections") return;
    const back = lastSectionsFocus.current;
    if (back?.isConnected) back.focus();
    else revealSections(sections.current);
  };

  /**
   * ▲ on the sections. Called from both the capture-phase listener (so Steam's
   * lists don't move focus to the tab row first) and the Focusable's direction
   * handler; the same press is only handled once.
   */
  const seenUp = useRef(new WeakSet<object>());
  const onUp = (e: any) => {
    if (screenRef.current !== "sections" || e?.detail?.button !== GamepadButton.DIR_UP) return;
    if (seenUp.current.has(e)) return;
    seenUp.current.add(e);
    if (focusInOverlay(sections.current)) return; // popup open: Steam's navigation
    const t = tm.current;
    if (!homeParts(sections.current)) {
      // Unrecognised home layout (Steam update?): we can't tell where the top
      // is, so let Steam move focus — if it couldn't (focus unchanged), we were
      // at the top: back to the wheel.
      const doc = sections.current?.ownerDocument;
      const before = doc?.activeElement;
      const fresh = !e.detail.is_repeat && Date.now() - t.lastUpAt >= HOLD_REPEAT_MS;
      t.lastUpAt = Date.now();
      if (fresh) later(() => screenRef.current === "sections" && doc?.activeElement === before && toWheel(), 150);
      return;
    }
    const held = !!e.detail.is_repeat || Date.now() - t.lastUpAt < HOLD_REPEAT_MS;
    t.lastUpAt = Date.now();
    if (!atTopOfSections(sections.current)) return; // Steam moves focus up normally
    e.preventDefault?.();
    e.stopPropagation?.();
    // Holding ▲ from far down stops at the top; leaving needs a fresh press.
    if (held) t.heldUpAt = Date.now();
    else toWheel();
  };
  useEffect(() => {
    const el = sections.current;
    if (!el) return;
    el.addEventListener("vgp_onbuttondown", onUp, true);
    return () => el.removeEventListener("vgp_onbuttondown", onUp, true);
  }, []);

  /** Focus moving inside the home: catches ▲ that Steam handled itself. */
  const lastSectionsFocus = useRef<HTMLElement | null>(null);
  const onSectionsFocus = (e: any) => {
    const t = tm.current;
    if (screenRef.current === "sections") lastSectionsFocus.current = e.target as HTMLElement;
    if (homeParts(sections.current)?.header?.contains(e.target)) lastTab = e.target as HTMLElement;
    const now = Date.now();
    const p = homeParts(sections.current);
    const holding = now - t.heldUpAt < HOLD_GRACE_MS;
    if (screenRef.current === "sections") {
      // Steam can still focus the hidden recent row: that's where a ▲ from the tab row goes.
      const inHidden = !!p?.above.some((a) => a.contains(e.target));
      if (inHidden) {
        if (holding) revealSections(sections.current); // held ▲: stay, back to the top
        else if (now - t.enteredSectionsAt > HIDDEN_ROW_GRACE_MS) toWheel();
        return;
      }
      if (p?.header?.contains(e.target) && now - t.lastUpAt < UP_FOCUS_WINDOW_MS && !holding) toWheel();
      return;
    }
    // On the wheel: focus drifting into the sections right after a switch (held
    // ▲/▼) keeps the wheel; otherwise focus moving down there means "go down".
    if (now - t.switchedAt < SWITCH_COOLDOWN_MS) focusFirstIn(wheelBox.current);
    else toSections();
  };

  /** Ⓑ like the stock home: first to the top of the sections, then Steam's own Ⓑ. */
  const onSectionsButton = (e: any) => {
    if (e?.detail?.button !== GamepadButton.CANCEL || screenRef.current !== "sections") return;
    if (focusInOverlay(sections.current)) return; // popup open: Ⓑ closes it (Steam)
    if (atTopOfSections(sections.current)) return; // at the top: Steam's turn (Steam menu)
    e.preventDefault?.();
    e.stopPropagation?.();
    revealSections(sections.current);
  };

  // Touch swipes (the container itself never scrolls).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let startY = 0;
    let startX = 0;
    let sectionsAtTop = true;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      const vs = homeParts(sections.current)?.vs;
      sectionsAtTop = !vs || vs.scrollTop <= sectionsOffset(homeParts(sections.current)!) + 2;
    };
    const onEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.5) return; // not a vertical swipe
      if (screenRef.current === "wheel" && dy < 0) toSections();
      else if (screenRef.current === "sections" && dy > 0 && sectionsAtTop) toWheel();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  // Header bar: synced on screen change, every second, and once scrolling
  // settles (never per scroll frame — that fought Steam's smooth scrolling).
  const keeper = useMemo(() => {
    seedBarLook(getSettings().barLook);
    return new StyleKeeper();
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
    if (!doc) return;
    let disposed = false;
    const sync = () => {
      if (!disposed) syncHeader(keeper, doc, screen, sections.current);
    };
    sync();
    const ts = [150, 400].map((ms) => setTimeout(sync, ms));
    const iv = setInterval(sync, HEADER_REAPPLY_MS);
    const vs = homeParts(sections.current)?.vs;
    let settle: any;
    let raf = 0;
    let rowAway = false;
    const view: any = doc.defaultView ?? window;
    const onScroll = () => {
      clearTimeout(settle);
      settle = setTimeout(sync, SCROLL_SETTLE_MS);
      // Only react mid-scroll when the tab row crosses the top edge (band on/off),
      // so the bar never shows a gap while the row scrolls away or back.
      if (screen !== "sections" || raf) return;
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
    // Steam can replace the tab row element itself (tab switch, re-render):
    // re-sync right away instead of waiting for the next tick.
    const rowParent = homeParts(sections.current)?.header?.parentElement;
    const MO = (doc.defaultView as any)?.MutationObserver;
    const mo = rowParent && MO ? new MO(() => sync()) : null;
    mo?.observe(rowParent, { childList: true });
    return () => {
      disposed = true;
      ts.forEach(clearTimeout);
      clearInterval(iv);
      clearTimeout(settle);
      if (raf) view.cancelAnimationFrame(raf);
      mo?.disconnect();
      vs?.removeEventListener("scroll", onScroll);
    };
  }, [screen]);

  // Hide the original recent-games row once Steam has rendered it.
  useEffect(() => {
    const host = sections.current;
    if (!host) return;
    let restore: (() => void) | null = null;
    const view: any = host.ownerDocument?.defaultView ?? window;
    const mode = () => (tm.current.restingOnWheel ? "top" : screenRef.current === "sections" ? "sections" : "free");
    const tryHide = () => !!(restore ??= hideFirstShelf(host, mode));
    const mo = view.MutationObserver ? new view.MutationObserver(() => tryHide() && mo.disconnect()) : null;
    if (!tryHide()) mo?.observe(host, { childList: true, subtree: true });
    const giveUp = setTimeout(() => {
      mo?.disconnect();
      // Unrecognised home layout (Steam update?): the sections simply show
      // Steam's home as is; nothing else depends on this.
      if (!restore) debug("home", "recent-games row not found; leaving the home as is");
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

  return (
    // zIndex 1, not higher: Steam's popups opened from the home (What's New
    // event details, z-index 2 in the same layer — confirmed on device) must
    // paint above us. 900 covered them.
    <div ref={root} data-spindeck-root="" style={{ position: "fixed", inset: 0, zIndex: 1, overflow: "hidden", background: "#0b0f16" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          // Slide with `top`, not `transform`: a transformed ancestor becomes the
          // containing block for position:fixed children, which trapped Steam's
          // own popups (What's New event details) off-screen inside this box.
          top: screen === "wheel" ? "0%" : "-100%",
          height: "200%",
          transition: `top ${SLIDE_MS}ms ease-out`,
        }}
      >
        <Focusable flow-children="column" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div ref={wheelBox} data-spindeck-wheel="" style={{ height: "50%", position: "relative", flexShrink: 0 }}>
            <WheelPage key={wheelGen} mode="home" onWheelFocus={onWheelGotFocus} onRequestSections={toSections} active={screen === "wheel"} />
          </div>
          {/* position:relative: overlays Steam opens inside the home with
              position:absolute (e.g. What's New event details) are placed
              against this screen-sized box, not the 200%-tall slider above
              (whose top half is the wheel, off-screen on this screen). */}
          <Focusable
            style={{ height: "50%", flexShrink: 0, overflow: "hidden", position: "relative" }}
            onButtonDown={onSectionsButton}
            onGamepadDirection={onUp}
          >
            <div ref={sections} style={{ height: "100%" }} onFocusCapture={onSectionsFocus}>
              {original}
            </div>
          </Focusable>
        </Focusable>
      </div>
    </div>
  );
}
