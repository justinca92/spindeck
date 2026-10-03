// Trackpad "click wheel": turns circular finger motion into ±1 steps.
//
// Main path (works for touch-only circles in Steam UI): Steam's own radial
// menu puts the controller into its keyboard action set and enables analog
// input messages; the trackpads then emit analog messages with normalized x/y
// while a finger is on the pad — no click needed. Confirmed on device: left
// trackpad = message type 48, x/y in [-1, 1]. Right pad assumed 49.
//
// Fallbacks without the keyboard action set:
//  - cursor: in Steam UI the right trackpad drives the mouse cursor; circling
//    makes the cursor's direction of travel rotate, which we accumulate;
//  - scroll wheel: a pad mapped to "scroll wheel" sends wheel events.
//
// Runtime-only: nothing is saved. Cleanup turns the action set off explicitly.

import { onTeardown } from "./safety";

export interface PadWheelOptions {
  stepDegrees: number;
  pad: "left" | "right";
  onStep: (dir: 1 | -1) => void;
  /** Haptic detents, independent of game steps (analog path only): fires every `detentDegrees`. */
  detentDegrees?: number;
  onDetent?: () => void;
  /** Every accepted finger movement, radians, clockwise-positive (analog path only). */
  onTurn?: (dClockwise: number) => void;
  /** Finger lifted: angular speed over the last moments, rad/s, clockwise-positive. */
  onRelease?: (radPerSec: number) => void;
}

const wrap = (d: number) => {
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

/** Accumulates an angle and emits a step every `stepDegrees`. Positive = clockwise = next game. */
function makeStepper(opts: PadWheelOptions) {
  const step = (opts.stepDegrees * Math.PI) / 180;
  let acc = 0;
  return {
    add(dClockwise: number) {
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
    },
  };
}

export const ANALOG_TYPE = { left: 48, right: 49 } as const;
const ANALOG_DEADZONE = 0.12; // normalized radius; the centre is noisy
const ANALOG_GESTURE_GAP_MS = 150; // messages stop while not touching
const MAX_TURN_PER_MESSAGE = Math.PI / 2; // larger = a jump (e.g. pad reset on B), not rubbing
const RELEASE_VELOCITY_WINDOW_MS = 120; // speed at release = motion over this last stretch

/** Main path: keyboard-action-set analog messages. */
export function subscribeKeyboardAnalogWheel(opts: PadWheelOptions): () => void {
  const Input = (globalThis as any).SteamClient?.Input;
  if (!Input?.RegisterForControllerAnalogInputMessages || !Input?.SetKeyboardActionset) return () => {};
  const wanted = ANALOG_TYPE[opts.pad];
  const stepper = makeStepper(opts);
  // Finer haptic "clicks" than game steps: a second accumulator on the same motion.
  const detents =
    opts.onDetent && opts.detentDegrees
      ? makeStepper({ ...opts, stepDegrees: opts.detentDegrees, onStep: () => opts.onDetent!() })
      : null;
  let last: number | null = null;
  let lastTime = 0;
  let samples: { t: number; d: number }[] = [];
  let releaseT: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    const end = samples.length ? samples[samples.length - 1].t : 0;
    const recent = samples.filter((x) => end - x.t <= RELEASE_VELOCITY_WINDOW_MS);
    samples = [];
    if (recent.length < 2) return opts.onRelease?.(0);
    const span = Math.max(16, recent[recent.length - 1].t - recent[0].t);
    const sum = recent.slice(1).reduce((a, x) => a + x.d, 0);
    opts.onRelease?.((sum / span) * 1000);
  };

  let reg: any;
  try {
    reg = Input.RegisterForControllerAnalogInputMessages((_idx: number, type: number, _p: boolean, x: number, y: number) => {
      if (type !== wanted) return;
      const now = Date.now();
      if (now - lastTime > ANALOG_GESTURE_GAP_MS) {
        last = null; // finger was lifted: new gesture
        stepper.reset();
        detents?.reset();
      }
      lastTime = now;
      if (Math.hypot(x, y) < ANALOG_DEADZONE) return;
      // y is up-positive: atan2 grows counter-clockwise; negate for clockwise.
      const a = Math.atan2(y, x);
      if (last !== null) {
        const d = wrap(a - last);
        if (Math.abs(d) <= MAX_TURN_PER_MESSAGE) {
          stepper.add(-d);
          detents?.add(-d);
          if (opts.onTurn || opts.onRelease) {
            opts.onTurn?.(-d);
            samples.push({ t: now, d: -d });
            if (samples.length > 64) samples.shift();
            clearTimeout(releaseT);
            releaseT = setTimeout(release, ANALOG_GESTURE_GAP_MS);
          }
        }
      }
      last = a;
    });
    Input.EnableControllerAnalogInputMessages?.(true);
    Input.SetKeyboardActionset(true, false);
  } catch {
    /* unavailable on this client */
  }
  // Steam drops the action set unless it's refreshed, as its radial menu does.
  const keep = setInterval(() => {
    try {
      Input.SetKeyboardActionset(true, false);
    } catch {
      /* ignore */
    }
  }, 1000);

  const stop = () => {
    clearInterval(keep);
    clearTimeout(releaseT);
    try {
      Input.SetKeyboardActionset(false, false);
      Input.EnableControllerAnalogInputMessages?.(false);
    } catch {
      /* ignore */
    }
    reg?.unregister?.();
  };
  // Also undone if the plugin unloads without React running this cleanup.
  const unregister = onTeardown(stop);
  return () => {
    unregister();
    stop();
  };
}

/** Fallback: cursor movement inside `el` (right pad = Steam UI's cursor pad). */
export function subscribeCursorWheel(el: HTMLElement, opts: PadWheelOptions): () => void {
  if (opts.pad !== "right") return () => {};
  const stepper = makeStepper(opts);
  let lastDir: number | null = null;
  let lastTime = 0;
  const MIN_MOVE = 2; // px; ignore jitter

  const onMove = (e: MouseEvent) => {
    const dx = e.movementX;
    const dy = e.movementY;
    if (Math.hypot(dx, dy) < MIN_MOVE) return;
    const now = Date.now();
    if (now - lastTime > 200) {
      lastDir = null; // paused / lifted: new gesture
      stepper.reset();
    }
    lastTime = now;
    // Screen Y points down, so atan2 here already grows clockwise.
    const dir = Math.atan2(dy, dx);
    if (lastDir !== null) {
      const turn = wrap(dir - lastDir);
      if (Math.abs(turn) < Math.PI * 0.6) stepper.add(turn); // sharp reversal = jitter
    }
    lastDir = dir;
  };

  el.addEventListener("mousemove", onMove);
  return () => el.removeEventListener("mousemove", onMove);
}

/** Fallback: scroll-wheel events (also keeps the page itself from scrolling). */
export function subscribeScrollWheel(el: HTMLElement, opts: PadWheelOptions): () => void {
  const stepPx = 60 * (opts.stepDegrees / 30);
  let acc = 0;
  let lastTime = 0;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTime > 300) acc = 0;
    lastTime = now;
    acc += e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY; // lines → px
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
