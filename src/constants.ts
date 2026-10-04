// Tuning values in one place (all in ms unless noted). Most were tuned on device.

/** Wheel ⇄ sections slide duration, and when to act once it has settled. */
export const SLIDE_MS = 300;
export const SLIDE_SETTLED_MS = 320;
/** Ignore another wheel ⇄ sections switch this soon after one (no ping-pong). */
export const SWITCH_COOLDOWN_MS = 700;
/** ▲ presses closer together than this count as "held" (auto-repeat). */
export const HOLD_REPEAT_MS = 250;
/** After a held ▲ was seen, focus side-effects are treated as part of the hold. */
export const HOLD_GRACE_MS = 300;
/** Focus entering the hidden recent row this soon after arriving is not "▲". */
export const HIDDEN_ROW_GRACE_MS = 600;
/** Focus landing on the tab row within this window after ▲ = leave to the wheel. */
export const UP_FOCUS_WINDOW_MS = 500;
/** On the wheel, ▲/▼ are ignored this long after arriving. */
export const ARRIVAL_IGNORE_MS = 700;

/** Keyboard-action-set circle input: wait for a button press to be released. */
export const CIRCLE_START_DELAY_MS = 500;
/** …and after Quick Access / the Steam menu closes (window refocus). */
export const WINDOW_REFOCUS_DELAY_MS = 800;
/** No wheel haptics this long after Ⓑ (a stray pad step could tick). */
export const HAPTIC_MUTE_AFTER_B_MS = 500;

/** Hero art follows the selection once it has rested this long. */
export const HERO_SETTLE_MS = 150;
/** Achievements are fetched once the selection has rested this long. */
export const ACHIEVEMENTS_DELAY_MS = 200;
/** Wheel position follow: exponential time constant, and max lag in games. */
export const WHEEL_FOLLOW_TAU_MS = 55;
export const WHEEL_MAX_LAG = 2;

/** Scroll is considered settled after this long without scroll events. */
export const SCROLL_SETTLE_MS = 140;
/** Header bar re-apply interval while home is shown, and full re-scan interval. */
export const HEADER_REAPPLY_MS = 1000;
export const HEADER_RESCAN_MS = 5000;

/** Roulette: minimum steps, start/extra delay per step, ease exponent, result display. */
export const ROULETTE_MIN_STEPS = 22;
/** Most extra steps on top of MIN; bigger libraries jump close to the winner first. */
export const ROULETTE_MAX_EXTRA_STEPS = 30;
export const ROULETTE_STEP_MS = 35;
export const ROULETTE_SLOWDOWN_MS = 320;
export const ROULETTE_EASE = 2.6;
export const ROULETTE_RESULT_MS = 4000;

/** Alphabetical sort: the big letter popup stays this long after the letter changes. */
export const LETTER_POPUP_MS = 1000;
/** Also show the letter while spinning fast inside one letter: N games within this window. */
export const LETTER_FAST_STEPS = 3;
export const LETTER_FAST_WINDOW_MS = 600;

/** Odometer: save this long after the dial stops; toasts show this long. */
export const ODOMETER_SAVE_MS = 3000;
export const TOAST_MS = 3500;
/** Toast position: below Steam's top bar, on the art side (opposite the wheel). */
export const TOAST_TOP_PX = 84;

/** L1/R1 view strip: how long it stays after switching, and its distance from the top. */
export const VIEW_STRIP_MS = 1800;
export const VIEW_STRIP_TOP_PX = 44;
