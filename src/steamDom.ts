// Small helpers for Steam's own UI DOM (not a public API — kept in one place).

/** Steam's header search box (absolute, top 0, h≈40 — confirmed on device). */
let cachedSearch: HTMLInputElement | undefined;
export function findHeaderSearch(doc: Document | null | undefined): HTMLInputElement | undefined {
  if (!doc) return undefined;
  if (cachedSearch?.isConnected && cachedSearch.ownerDocument === doc) {
    const r = cachedSearch.getBoundingClientRect();
    if (r.height > 0 && r.top >= 0 && r.top < 60) return cachedSearch;
  }
  cachedSearch = Array.from(doc.querySelectorAll<HTMLInputElement>("input")).find((i) => {
    const r = i.getBoundingClientRect();
    return r.height > 0 && r.height < 80 && r.top >= 0 && r.top < 60;
  });
  return cachedSearch;
}

/** Bottom edge (px from the top of the screen) of Steam's top bar, plus a small gap. */
let lastTopBar = 0;
export function topBarBottom(doc: Document): number {
  // The bar strip itself (h=40 on device), so the tab row sits flush under it.
  const bar = strips.doc === doc ? strips.els.filter((e) => e.isConnected).sort((a, b) => b.offsetHeight - a.offsetHeight)[0] : undefined;
  if (bar) return (lastTopBar = Math.round(bar.getBoundingClientRect().bottom));
  const input = findHeaderSearch(doc);
  if (input) lastTopBar = Math.round(input.getBoundingClientRect().bottom + 2);
  return lastTopBar || 48;
}

const FOCUSABLE = "[tabindex], button, a, input";
export function focusFirstIn(box: Element | null | undefined) {
  box?.querySelector<HTMLElement>(FOCUSABLE)?.focus?.();
}
export function focusablesIn(box: Element): HTMLElement[] {
  return Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));
}

const none = (v: string) => !v || v === "none" || v === "rgba(0, 0, 0, 0)" || v === "transparent";
/** Has its own background (incl. ::before/::after) or a backdrop filter. */
export function isPainted(view: any, el: Element) {
  return [view.getComputedStyle(el), view.getComputedStyle(el, "::before"), view.getComputedStyle(el, "::after")].some(
    (cs: CSSStyleDeclaration) => !none(cs.backgroundColor) || !none(cs.backgroundImage) || !none(cs.backdropFilter),
  );
}


/**
 * Full-width strips painted at the very top of the screen (Steam's header bar
 * and its backdrop). The paint may sit in ::before/::after. Scanning the whole
 * document is costly, so results are cached and only re-scanned when stale or
 * when a cached element left the DOM.
 */
let strips: { els: HTMLElement[]; at: number; doc: Document | null } = { els: [], at: 0, doc: null };
export function headerStrips(doc: Document, maxAgeMs: number): HTMLElement[] {
  const fresh = strips.doc === doc && Date.now() - strips.at < maxAgeMs && strips.els.every((e) => e.isConnected);
  if (fresh) return strips.els; // also caches "none found" until the next re-scan
  const view = doc.defaultView!;
  const W = view.innerWidth || 1280;
  const out: HTMLElement[] = [];
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>("body *"))) {
    if (el.closest("[data-spindeck-root]")) continue; // our own layer (tab row is probed separately)
    const r = el.getBoundingClientRect();
    if (r.top > 2 || r.bottom < 20 || r.height > 140 || r.width < W * 0.8) continue;
    if (el.classList.contains(CLEAR_CLASS) || isPainted(view, el)) out.push(el); // ours = Steam-painted underneath
  }
  strips = { els: out, at: Date.now(), doc };
  return out;
}

export const CLEAR_CLASS = "spindeck-clear-header";
const CLEAR_STYLE_ID = "spindeck-clear-header-style";

/** Remove the injected stylesheet (plugin unload). */
export function removeInjectedStyles(doc: Document | null | undefined) {
  doc?.getElementById(CLEAR_STYLE_ID)?.remove();
}

/**
 * The look of Steam's own top bar in its opaque state (what Steam paints on a
 * scrolled home), learned once from the live bar and then frozen, so the tab
 * row's matching background never flips between looks. Can be seeded from a
 * previously saved value.
 */
export type BarLook = { color: string; image: string; backdrop: string };
let learned: BarLook | null = null;
export function seedBarLook(look: BarLook | null | undefined) {
  if (!learned && look?.color) learned = look;
}
/** Returns a newly learned look (to persist), or null if nothing new. */
export function learnBarLook(els: HTMLElement[]): BarLook | null {
  if (learned) return null;
  const view: any = els[0]?.ownerDocument?.defaultView;
  if (!view) return null;
  for (const el of els) {
    if (el.classList.contains(CLEAR_CLASS)) continue;
    for (const cs of [view.getComputedStyle(el), view.getComputedStyle(el, "::before"), view.getComputedStyle(el, "::after")] as CSSStyleDeclaration[]) {
      if (!none(cs.backgroundColor) || !none(cs.backgroundImage)) {
        learned = { color: cs.backgroundColor, image: cs.backgroundImage, backdrop: cs.backdropFilter };
        return learned;
      }
    }
  }
  return null;
}
export const learnedBarLook = () => learned;

/**
 * Inline style overrides on Steam's elements, applied idempotently (only
 * written when different, so periodic re-syncs don't churn styles) and
 * restored exactly (original inline values put back) when released.
 */
export class StyleKeeper {
  private saved = new Map<HTMLElement, Map<string, [string, string]>>();
  private classed = new Map<HTMLElement, string>();
  private desired = new Map<HTMLElement, { props: Record<string, string>; cls?: string }>();
  private observer: MutationObserver | null = null;
  private reapplying = false;

  /**
   * Steam's UI is React: when it re-renders one of these elements (e.g. focus
   * moving within the tab row toggles its classes) it rewrites `class` /
   * `style` and our overrides vanish until the next sync — the bars "split".
   * Watching the kept elements puts them back before the next paint.
   */
  private watch(el: HTMLElement) {
    if (!this.observer) {
      const MO = (el.ownerDocument?.defaultView as any)?.MutationObserver ?? MutationObserver;
      this.observer = new MO((records: MutationRecord[]) => {
        if (this.reapplying) return;
        this.reapplying = true;
        try {
          for (const r of records) {
            const t = r.target as HTMLElement;
            const d = this.desired.get(t);
            if (d) this.apply(t, d.props, d.cls);
          }
        } finally {
          this.reapplying = false;
        }
      });
    }
    this.observer!.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
  }

  set(el: HTMLElement, props: Record<string, string>, cls?: string) {
    const isNew = !this.desired.has(el);
    this.desired.set(el, { props, cls });
    this.apply(el, props, cls);
    if (isNew) this.watch(el);
  }

  private apply(el: HTMLElement, props: Record<string, string>, cls?: string) {
    let m = this.saved.get(el);
    if (!m) this.saved.set(el, (m = new Map()));
    for (const [p, v] of Object.entries(props)) {
      if (!m.has(p)) m.set(p, [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]);
      if (el.style.getPropertyValue(p) !== v || el.style.getPropertyPriority(p) !== "important") el.style.setProperty(p, v, "important");
    }
    for (const [p, orig] of [...m]) {
      if (p in props) continue;
      this.restoreProp(el, p, orig);
      m.delete(p);
    }
    const had = this.classed.get(el);
    if (had && had !== cls) {
      el.classList.remove(had);
      this.classed.delete(el);
    }
    if (cls) {
      if (!el.classList.contains(cls)) el.classList.add(cls);
      this.classed.set(el, cls);
    }
  }
  /** Release every element not in `keep`. */
  keepOnly(keep: Set<HTMLElement>) {
    for (const el of [...this.saved.keys()]) if (!keep.has(el)) this.release(el);
  }
  release(el: HTMLElement) {
    this.desired.delete(el);
    this.reapplying = true; // our own restore must not trigger a re-apply
    try {
      const m = this.saved.get(el);
      if (m) for (const [p, orig] of m) this.restoreProp(el, p, orig);
      this.saved.delete(el);
      const cls = this.classed.get(el);
      if (cls) el.classList.remove(cls);
      this.classed.delete(el);
    } finally {
      this.reapplying = false;
    }
    this.observer?.takeRecords();
    this.rewatch();
  }
  releaseAll() {
    for (const el of [...this.saved.keys()]) this.release(el);
    this.observer?.disconnect();
    this.observer = null;
  }
  /** MutationObserver can't unobserve one node: re-observe the remaining ones. */
  private rewatch() {
    if (!this.observer) return;
    this.observer.disconnect();
    for (const el of this.desired.keys()) this.observer.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
  }
  private restoreProp(el: HTMLElement, p: string, [v, prio]: [string, string]) {
    if (v) el.style.setProperty(p, v, prio);
    else el.style.removeProperty(p);
  }
}

export const CLEAR_PROPS = { background: "transparent", "backdrop-filter": "none", "box-shadow": "none" };
/** Make sure the stylesheet that clears ::before/::after of CLEAR_CLASS exists. */
const INJECTED_CSS = `.${CLEAR_CLASS}::before, .${CLEAR_CLASS}::after { background: transparent !important; backdrop-filter: none !important; box-shadow: none !important; }`;

/** Make sure our stylesheet exists and is current (an older plugin version may have left one). */
export function ensureClearStyle(doc: Document) {
  let st = doc.getElementById(CLEAR_STYLE_ID) as HTMLStyleElement | null;
  if (!st) {
    st = doc.createElement("style");
    st.id = CLEAR_STYLE_ID;
    doc.head.appendChild(st);
  }
  if (st.textContent !== INJECTED_CSS) st.textContent = INJECTED_CSS;
}

/**
 * Last-resort sweep on plugin unload, in whichever document holds Steam's UI:
 * remove our spacer and stylesheet, and our classes from Steam's elements.
 * (Inline overrides are undone by their owners' teardowns.)
 */
export function sweepLeftovers() {
  const docs = new Set<Document>();
  try {
    for (const el of [document, ...(Array.from((globalThis as any).g_PopupManager?.GetPopups?.() ?? []) as any[]).map((p) => p?.m_popup?.document)]) {
      if (el) docs.add(el);
    }
  } catch {
    /* ignore */
  }
  if (cachedSearch?.ownerDocument) docs.add(cachedSearch.ownerDocument);
  if (strips.doc) docs.add(strips.doc);
  for (const doc of docs) {
    try {
      doc.querySelectorAll("[data-spindeck-spacer]").forEach((e) => e.remove());
      doc.querySelectorAll(`.${CLEAR_CLASS}`).forEach((e) => e.classList.remove(CLEAR_CLASS));
      removeInjectedStyles(doc);
    } catch {
      /* ignore */
    }
  }
}
