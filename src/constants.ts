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
/** Ask Steam for the selected game's details (achievements…) once the wheel pauses this long on it. */
export const DETAILS_DELAY_MS = 60;
/** Wheel position follow: exponential time constant, and max lag in games. */
export const WHEEL_FOLLOW_TAU_MS = 55;
export const WHEEL_MAX_LAG = 2;
/** Run the next wheel frame from a timer if no animation frame came by then (boot: frames can stall). */
export const FRAME_FALLBACK_MS = 40;

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
/** L1/R1 revolver swap: how far the wheel turns out/in, and how long each half takes. */
export const VIEW_ANIM_DEG = 70;
export const VIEW_ANIM_OUT_MS = 170;
export const VIEW_ANIM_IN_MS = 300;
/** Both-pad rumble during the swap. */
export const VIEW_ANIM_RUMBLE_MS = 700;
/** Wait this long after a button before haptics, so Steam's input message (which controller) has arrived. */
export const INPUT_SETTLE_MS = 30;
/** When the wheel screen first appears, put gamepad focus on the wheel at these moments (Steam settles focus late at boot). */
export const BOOT_FOCUS_CLAIMS_MS = [150, 600, 1500, 3000];
/** While the wheel screen is shown, check this often that gamepad focus isn't lost or stuck on Steam's hidden home. */
export const FOCUS_WATCH_MS = 1000;

/** Hero art's vertical centre, % of screen height (50 = centred). */
export const HERO_CENTER_PCT = 38;
/** Dark fade along the bottom so the game info and corner text stay readable over the art. */
export const HERO_BOTTOM_VIGNETTE =
  "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 18%, rgba(0,0,0,0.35) 36%, transparent 55%)";
/** Hero art pushed this far (% of screen width) past the screen edge on the art side, away from the wheel. */
export const HERO_SHIFT_PCT = 3;
/** Hero art is clear inside the wheel's ring and fades in over this much of the screen width beyond it. */
export const HERO_FADE_WIDTH = 0.22;
/** Pixels trimmed off every edge of the sharp hero art (hides thin light borders / edge seams). */
export const HERO_EDGE_CLIP_PX = 3;
/** Far blurred backdrop = the sharp hero art's box enlarged evenly around its centre (fills the screen above it). */
export const HERO_BG_SCALE = 1.7;
/** Black vignette on the wheel side: dark up to the wheel's ring, fading out over this much of the screen width beyond it. */
export const WHEEL_VIGNETTE_WIDTH = 0.3;
/** Wheel-side vignette darkness (black alpha): at the screen edge, at the wheel's ring, halfway through the fade. */
export const WHEEL_VIGNETTE = [0.8, 0.6, 0.25] as const;
/** Height (px) always kept for the game info line under the title, so nothing above moves when it appears. */
export const INFO_ROW_HEIGHT = 18;
/** The title and the info line never grow past this share of the screen width (toward the wheel). */
export const INFO_MAX_WIDTH_PCT = 58;

// Bottom layout (Display → Layout): the wheel rises from the bottom edge.
/** Wheel centre, as a share of the screen width from the wheel's side (0.5 = bottom centre). */
export const BOTTOM_WHEEL_X = 0.3;
/** Selected game's centre, as a share of the screen height (the ring's top). */
export const BOTTOM_SELECTED_Y = 0.7;
/** Extra room (degrees) on each side of the selected game, so its neighbours don't overlap it. */
export const BOTTOM_SELECTED_GAP_DEG = 3.5;
/** Gap (px) between the selected game and its name above it. */
export const BOTTOM_TITLE_GAP_PX = 14;
/** The name above the selected game never grows past this share of the screen width. */
export const BOTTOM_TITLE_MAX_WIDTH_PCT = 44;
/** Bottom layout: line height of the selected game's name; the custom text's main line is centred on a row this tall, level with it. */
export const BOTTOM_TITLE_LINE_PX = 28;
/** Bottom layout: gap (px) between the custom text and the Ⓨ "Today's game?" pill right under it. */
export const BOTTOM_ROULETTE_GAP_PX = 12;
/** Bottom layout: the custom text block (with the Ⓨ pill) is centred at this height: the middle of the screen's lower third. */
export const BOTTOM_OWNER_CENTER_PCT = 83.3;
/** Bottom layout: the custom text (lower third, away from the wheel) stays within this share of the width, clear of the selected game's name. */
export const BOTTOM_OWNER_MAX_WIDTH_PCT = 40;
/** Bottom layout: dark fade rising from the bottom, where the wheel sits (over the blurred backdrop, under the art). */
export const BOTTOM_LAYOUT_WHEEL_VIGNETTE =
  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.35) 48%, transparent 66%)";
