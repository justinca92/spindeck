// Easter eggs on the dial: the odometer (total turns ever spun) and fidget
// mode (spin 10 fast turns in a row and the wheel coasts on after you let go).
// Pure logic, no React and no Steam: WheelPage wires it to input and UI.

import {
  FIDGET_COAST_MIN_DEG_S,
  FIDGET_COAST_MAX_DEG_S,
  FIDGET_COAST_STOP_DEG_S,
  FIDGET_COAST_TAU_MS,
  FIDGET_IDLE_OFF_MS,
  FIDGET_STREAK_GAP_MS,
  FIDGET_TURNS,
  FIDGET_TURNS_MAX_MS,
} from "./constants";

const TURN = 2 * Math.PI;

/** Turn counts that get a one-off celebration. */
export const ODOMETER_MILESTONES = [25, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** The highest milestone crossed when going from `before` to `after` turns, or null. */
export function crossedMilestone(before: number, after: number): number | null {
  let hit: number | null = null;
  for (const m of ODOMETER_MILESTONES) if (before < m && after >= m) hit = m;
  return hit;
}

/**
 * Fidget mode unlocks after FIDGET_TURNS full turns in one direction without
 * pausing (short lifts between rubs are fine), done within FIDGET_TURNS_MAX_MS.
 * It stays on while you keep playing with the dial and switches off after
 * FIDGET_IDLE_OFF_MS without touching it.
 */
export class FidgetTracker {
  armed = false;
  private net = 0;
  private start = 0;
  private lastInput = 0;

  /** Feed a finger movement (radians, clockwise-positive). Returns true the moment it unlocks. */
  feed(d: number, now: number): boolean {
    if (this.armed && now - this.lastInput > FIDGET_IDLE_OFF_MS) this.armed = false;
    const gap = now - this.lastInput > FIDGET_STREAK_GAP_MS;
    const reversed = this.net !== 0 && Math.sign(d) !== Math.sign(this.net) && Math.abs(d) > 0.05;
    if (gap || reversed) {
      this.net = 0;
      this.start = now;
    }
    this.lastInput = now;
    this.net += d;
    if (this.armed) return false;
    if (now - this.start > FIDGET_TURNS_MAX_MS) {
      // Too slow: keep the most recent progress only, roughly.
      this.net = d;
      this.start = now;
    }
    if (Math.abs(this.net) >= FIDGET_TURNS * TURN) {
      this.armed = true;
      return true;
    }
    return false;
  }

  /** Coast speed for a release at `radPerSec`, in deg/s, or 0 for no coasting. */
  coastSpeed(radPerSec: number, now: number): number {
    if (!this.armed) return 0;
    if (now - this.lastInput > FIDGET_IDLE_OFF_MS) {
      this.armed = false;
      return 0;
    }
    const deg = (radPerSec * 180) / Math.PI;
    if (Math.abs(deg) < FIDGET_COAST_MIN_DEG_S) return 0;
    return Math.sign(deg) * Math.min(Math.abs(deg), FIDGET_COAST_MAX_DEG_S);
  }

  /** Coasting counts as playing with the dial, so it doesn't time out mid-coast. */
  touch(now: number) {
    this.lastInput = now;
  }
}

/**
 * Free spin after release: speed decays exponentially (like a flywheel with
 * friction) and calls `onDelta(degrees)` every frame until it is slow enough.
 * Timers, not requestAnimationFrame: plugin code lives in Steam's hidden
 * window, where animation frames may be throttled.
 */
export class Coaster {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private v = 0;
  private last = 0;
  running = false;

  start(degPerSec: number, onDelta: (deg: number) => void, onEnd?: () => void) {
    this.stop();
    this.v = degPerSec;
    this.last = Date.now();
    this.running = true;
    const frame = () => {
      const now = Date.now();
      const dt = Math.min(64, now - this.last);
      this.last = now;
      // Exact travel over dt for v(t) = v0·e^(−t/τ).
      const k = Math.exp(-dt / FIDGET_COAST_TAU_MS);
      const travel = (this.v * FIDGET_COAST_TAU_MS * (1 - k)) / 1000;
      this.v *= k;
      onDelta(travel);
      if (Math.abs(this.v) < FIDGET_COAST_STOP_DEG_S) {
        this.stop();
        onEnd?.();
        return;
      }
      this.timer = setTimeout(frame, 16);
    };
    this.timer = setTimeout(frame, 16);
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.running = false;
  }
}
