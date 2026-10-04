# Changelog

## 1.2.0 — 2026-10-03

### Added
- **Pick what each wheel shows.** Three views in a row: [L1] — main — [R1]. In the panel, "Show" picks the main view (Installed games by default, Whole library, ★ Favorites or any Steam collection; it can't be empty), and L1 and R1 each pick one view too (or None), each with its own sort. L1 defaults to ★ Favorites, R1 to None. L1/R1 step one view left/right; a strip at the top shows where you are for a moment. Collections show all their games, installed or not; the roulette spins within the current view. Saved "Installed / Whole library" choices carry over.
- **Alphabet popup:** whole library only (A–Z), and a small, see-through borderless rounded square whose edge fades into the art.

### Fixed
- **Coming back from a game page started at the first game again.** Each view now remembers the last game you were on (by game, so a re-sorted list still lands on it) for as long as the plugin is running.

## 1.1.2 — 2026-10-03

### Fixed
- **Ⓨ roulette works in every library again, and always finishes in a few seconds.** 1.0.1 turned it off for "Whole library" because it stepped through one game at a time (minutes for 1000+ games). Now small libraries (≤ 30 games) spin from where you are as before; bigger ones pick the winner first, jump to a spot 22–51 games before it and spin from there (about 3–4 s, landing spot still uniform).
- **Alphabet popup didn't appear on the Deck.** Its backdrop blur was the one thing it did that the (visible) milestone toast doesn't, and Steam's compositor has refused our backdrop blurs before, so it now uses a solid background. Also logs `[Spindeck:letter] show …` to the console for checking.
- **Alphabet popup look:** no border; its dark background now fades out softly at the edges. It shows for 1 s (was 1.5 s), and only for the whole library: installed games are a short list.
- **Milestone toast flickered while spinning.** It sat in the corner block, which resizes with every game, so it jumped around. It now has a fixed spot at the top of the art side: right-aligned with the wheel on the left, left-aligned with the wheel on the right.

## 1.1.1 — 2026-10-03

### Removed
- **Fidget mode** (coasting after 10 fast turns). The odometer stays.

## 1.1.0 — 2026-10-03

### Added — easter eggs
- **Dial odometer.** Counts every full trackpad turn you've ever spun (finger only). Panel → About shows the total once you've done a turn, and the wheel celebrates milestones (25, 100, 500, 1,000 … 100,000 turns). Saved a few seconds after the dial stops, never before the settings file was read; deleted on uninstall like all settings.
- **Fidget mode.** Spin 10 full turns in one direction without stopping (within 15 s) and the wheel unlocks it with a toast. While it's on, letting go fast makes the wheel coast like a flywheel: it keeps stepping through games with haptic clicks that slow down until it stops. Touching the pad catches it; D-pad, Ⓨ or leaving the wheel stops it. It switches off after 6 s without touching the dial.

## 1.0.1 — 2026-10-03

### Changed
- **No roulette for the whole library.** It stepped through one game at a time, so a 1000+ game library spun for about two minutes. With "Whole library" the Ⓨ roulette and its pill are hidden; it still works with "Installed games".
- **Default haptic strength 5 → 7.** Saves still on the old default (5) move to 7 once.

### Fixed
- **Alphabet popup in big libraries.** A letter group can hold dozens of games (several full circles), so the popup rarely appeared. It now also shows the current letter while you spin fast (3 games within 0.6 s), not only when the letter changes.

## 1.0.0 — 2026-10-03

First public release (see RELEASE_NOTES.md).

### Changed
- **Renamed from "Deck Wheel" to "Spindeck"** (plugin name, package, zip, route `/spindeck`, log prefix, DOM markers). Decky keeps settings per plugin name, so settings start fresh; uninstall the old Deck Wheel plugin first.

### Added
- **Alphabet popup** while spinning in "All library" with A–Z sort: a large, non-interactive letter and game count fades in when the first letter changes, stays about 1.5 s, and switches immediately to the next letter.
- **About section in the panel**, with a Ko-fi support button and a GitHub link (opened in Steam's browser) plus the version. A button is hidden until its link is set in `src/links.ts`.
- **Release tooling:**
  - `LICENSE` (BSD-3-Clause), `README.md` / `README.ko.md` and `RELEASE_NOTES.md`.
  - `.github/FUNDING.yml` (Ko-fi "Sponsor" button on the repo page).
  - `.github/workflows/release.yml`: pushing tag `vX.Y.Z` builds the zip and publishes a GitHub Release with that version's notes.
  - `scripts/package.sh` (local zip) and `scripts/set-links.sh` (fills in the GitHub and Ko-fi usernames everywhere).
- The `npm run build` script now uses the offline Bun build.

## 0.9.19 — 2026-10-03

### Changed
- **With the wheel on the right, the Ⓨ roulette now spins the opposite way** (counter-clockwise on screen). The left wheel is unchanged.

## 0.9.18 — 2026-10-03

### Changed
- **More space between capsule art and title for the games around the selection** (28 px, was 16 px). The selected game keeps 16 px.

## 0.9.17 — 2026-10-03

### Changed
- **Tuned on device: 40° per game and a haptic click every 5°**, so a game step has 8 fine clicks. These are the new defaults and are applied to existing saves once (settings v5). In a simulated quarter circle: 2 games, 18 clicks.
- **Haptic style is Steam's Tick only.** It was compared against Click, a heavier Click and low-level pulses, and felt best. The Haptic strength slider (1–9) stays.

### Removed
- The Haptic style (testing) picker and the low-level pulse code.
- The Degrees per step and Haptic click spacing sliders.

## 0.9.16 — 2026-10-03

### Changed
- **Haptic click spacing goes up to 45° and no longer has to be finer than the game step.** Chrome's controller layout on device turned out to use the left trackpad as an 8-way directional pad (overlap 4000, deadzone 10000, outer ring 25000, haptics from the activator settings). There, circling clicks once per direction region, roughly every 45°, with a button-press haptic. Spacing can now be set to 45° to mimic that.

## 0.9.15 — 2026-10-03

### Added
- **"Haptic strength" slider (1–9)**, in 3 dB steps: 1 = -24 dB, 5 = -12 dB (Steam's radial menu, the default), 9 = 0 dB. Applies to the Steam Tick and Click styles. Moving the slider plays one click so you can feel it right away.
- **Heavier styles for a weightier click, like desktop browsing:**
  - **Steam Click (heavy):** Click with intensity 3 instead of 1. The argument is undocumented, so compare by feel.
  - **Low-level pulse (heavy):** 6 ms.
  - Picking a style also plays one click.

## 0.9.14 — 2026-10-03

### Added
- **Haptic clicks are spaced separately from game steps** ("Haptic click spacing", default 7.5°). The trackpad clicks more often than games advance, for a finer, scroll-wheel-like feel, without making the wheel faster. In a simulated quarter circle at 15° per game, there are 6 games and 12 clicks. The control is shown when wheel haptics and circle rotation are both on.

### Changed
- **Default degrees per game step is now 15°** (was 30°), and the slider goes down to 10°. Existing saved values are kept.

## 0.9.13 — 2026-10-03

### Added
- **"Haptic style (testing)" picker** under Wheel haptics, to compare styles on device against desktop mode's circular-scroll haptics:
  - **Current: Steam Tick.** Steam's radial-menu haptic, the default and unchanged.
  - **Steam Click.** The same high-level haptic, Click type.
  - **Low-level pulse, short (1.2 ms) or long (3 ms).** `SteamClient.Input.TriggerHapticPulse`, the legacy single actuator burst that Steam Input's trackpad modes build on. The current client needs 4 arguments; they're assumed as (controller 0, pad 0 = left / 1 = right, duration in µs, 0). The picker shows the last result of the chosen style (ok, or the error) so the guess can be verified on device.

## 0.9.12 — 2026-10-03

### Fixed
- **Ⓑ on Friends or Recommended jumped back to What's New.** Ⓑ moved focus to the first tab, and focusing a tab selects it. Ⓑ now focuses the currently selected tab, like the stock page, and Ⓑ again opens the Steam menu. The selected tab is recognised by its aria state, a selected/active class, or the pill background only it has, falling back to the last tab that had focus. The same applies when entering the sections from the wheel.

## 0.9.11 — 2026-10-03

Stability pass (release step 3).

### Added
- **Error boundaries.** If anything in the wheel home throws, for example after a Steam update changed something it relies on, Steam's original home is shown untouched. The `/deck-wheel` page and the Quick Access panel show a short message instead of breaking.
- **Teardown on unload that doesn't depend on React.** On plugin unload or uninstall, everything is undone right away: the keyboard action set and analog messages are turned off, the top-bar and tab-row styles are restored to their exact original inline values, and the recent row is unhidden. A final sweep removes the spacer, the plugin's classes and its stylesheet. Tested with React not unmounting anything: Steam is left exactly as before, including when unloading mid-rub on the wheel.
- **Way back from an unrecognised home layout.** If the home layout isn't recognised, ▲ still returns to the wheel once Steam can't move focus any higher.

### Changed
- **Steam internals are guarded.** Reading the library, opening a game page and searching Steam's bundle for its haptic and menu modules fail quietly: an empty wheel, the game-page fallback, no haptics. They never crash.
- **Backend hardened.** A corrupt or non-object settings file means defaults are used. Writes are atomic, failures are logged and return false, the temp file is cleaned up, and uninstall removes both files.

## 0.9.10 — 2026-10-03

### Fixed
- **Steam's bar and the tab row still showed a seam (device screenshot).** Two separately blurred elements blur different backdrops: under the bar sits the hidden recent-games area (dark), under the tab row the banner art. On the stock page, both sit over the same art. Now a single element carries the band. The tab row is grown upward to the top of the screen with a negative top margin plus equal extra top padding, so its content and the layout around it don't move. It takes Steam's look (`rgba(0,0,0,0.5)` + `blur(100px)`) and Steam's bar is cleared on top of it. The scroll position ignores the growth. Margin and padding are restored when leaving.

## 0.9.9 — 2026-10-03

### Fixed
- **The blur was missing from the top band** (0.9.8 dropped it), and on device the tab row looked different from Steam's bar. The banner art scrolling under the tab row showed through sharply. Now Steam's bar and the tab row each get Steam's exact look, `rgba(0,0,0,0.5)` + `blur(100px)`, on the element itself. Each blurs what scrolls behind it, like the stock page.
  - Only the outermost bar element is painted, so nested ones don't stack the tint. Steam's bar is painted by the plugin too, so it never depends on whether Steam is painting it at that moment.
  - The tab row now sits flush under the bar, aligned to the bar's own bottom edge rather than the search box.
  - In a test with a 20 px blur, the bar and the tab row blur seamlessly as one band. Headless Chromium doesn't render 100 px, the device does.

## 0.9.8 — 2026-10-03

### Fixed
- **Steam's bar area looked tinted, unlike the tab row, after browsing What's New.** Device output showed two problems:
  - **The upward band extension wasn't rendering at all.** A stylesheet left by an older plugin version was reused without the band rule. The stylesheet is now always refreshed to the current rules.
  - **The two halves were drawn differently.** The tab row had its own backdrop blur, and its extension was a nested blur, which Chromium can't blur through. Steam's bar look is `rgba(0,0,0,0.5)` + `blur(100px)` (confirmed on device). Now the tab row is transparent and isolated, and a single `::after` paints that colour from the top of the screen down to the row's bottom, behind the row's content: one uniform band. Blur is left out because only the plugin's flat background sits behind it.

## 0.9.7 — 2026-10-03

### Fixed
- **Steam's bar and the tab row still split apart while browsing What's New.** Steam's UI is React. When focus moves around the tab row, it re-renders those elements and rewrites their `class` and `style`, which dropped the band until the next 1-second sync. Now:
  - The plugin watches the elements it styles and puts its overrides back before the next frame. A test simulating such a rewrite shows the band intact on the very next frame.
  - If Steam replaces the tab row element itself (tab switch), the band re-syncs right away.
  - The band also switches instantly when the tab row scrolls past the top edge, with no gap mid-scroll. It stays on while any part of the row is visible.

## 0.9.6 — 2026-10-03

### Fixed
- **Navigating What's New felt stuttery and finicky.** Two sources of work ran on every scroll frame while Steam smooth-scrolled to the focused item:
  - **The scroll clamp fought Steam's scroll.** It snapped the scroller back whenever it went above the tab row, mid-animation. It now runs only once scrolling has settled (140 ms).
  - **The tab-row styling churned.** It was removed and re-applied every frame. It's now synced idempotently, writing only what changed, on screen change, every second and when scrolling settles.
  - In a smooth-scroll test, mid-scroll corrections went from 2 to 0, and tab-row style writes from 7 to 0.
- **The shared background of Steam's top bar and the tab row (with its blur) came and went.** It depended on whether Steam happened to be painting its bar, and the learned look could flip between states. Now:
  - The opaque look is learned once from Steam's own bar on the scrolled home, then frozen and saved, so it's right from the first frame next time.
  - On the sections, Steam's bar is cleared and the tab row carries that look.
  - A `::after` on the tab row reaches up behind the bar with the same background and blur (a shadow can't blur), so it is always one band.
  - Until the look has been learned once, Steam's own bar is left as is.
- **Steam's bar could briefly turn opaque on the wheel every 5 s**, when the cached scan re-ran and no longer recognised the bars the plugin had cleared.

## 0.9.5 — 2026-10-03

### Changed
- **On What's New / Friends / Recommended, the tab row now matches Steam's opaque top bar** (profile · clock · battery) instead of both being see-through. Steam's bar keeps its own look there. The tab row gets exactly the same background (colour, gradient, backdrop), learned from Steam's bar whenever Steam paints it, with a dark fallback until then. If Steam isn't painting its bar at that moment, the tab row's colour is extended up behind it so the band stays solid. The wheel keeps the see-through bar.

## 0.9.4 — 2026-10-03

### Removed
- **The "Hide the recent games row below" toggle.** The original recent-games row is now always hidden on the sections screen. With the toggle off there was no visible difference: the sections open at the tab row, and ▲ from the top goes to the wheel. Turning it off only disabled a helper that keeps Steam's top bar see-through on the wheel. The old saved value is dropped.

## 0.9.3 — 2026-10-03

### Changed
- **On What's New / Friends / Recommended, Steam's top bar and the tab row are one see-through band**, following the see-through top bar on the wheel. This replaces the dark bar from 0.8.17. The tab row's background is found by probing points in the band at the top of the screen, not by DOM structure. So whichever element paints it (or its `::before`/`::after`) is cleared, which addresses "not applied" on device.

### Fixed
- **Restoring cleared bars could wipe an element's own inline background.** Original inline values are now saved and put back exactly.
- **A late scroll frame or timer could re-apply the sections styling after leaving the sections**, leaving it stuck until the next change. Re-applies are now cancelled on cleanup.
- The full-document top-bar scan skips the plugin's own layer.

## 0.9.2 — 2026-10-03

### Fixed
- **What's New popups appeared, then vanished while navigating.** Three causes are addressed:
  - **Covered by the plugin.** The home layer used z-index 900, and Steam's popups sit at z-index 2 in the same layer (confirmed on device), so the plugin painted over them. It now uses z-index 1.
  - **Focus walking onto the wheel switched screens.** When Steam's navigation stepped out of the popup onto the wheel (e.g. ▲ past its top), the plugin slid to the wheel. Now focus is returned to where it was. Leaving the sections is decided only by the plugin's own ▲ handling.
  - **Plugin buttons interfering.** While focus is in a popup (inside the home, outside its scroller), the plugin leaves ▲ and Ⓑ to Steam, so Ⓑ closes the popup as usual.

## 0.9.1 — 2026-10-03

### Fixed
- **What's New event popups still didn't show (attempt 2).** The sections box is now `position: relative`. Overlays Steam opens inside the home with `position: absolute` are placed against this screen-sized box, instead of the 200 %-tall slider whose top half (the wheel) is off-screen on this screen.

## 0.9.0 — 2026-10-03

Optimization and cleanup pass, ahead of release. Behaviour is unchanged, checked by live tests with real React: screen switching, Ⓑ, held ▲, wheel ▲, roulette, and capsules staying on the circle while spinning.

### Performance
- **Hero art only changes once the wheel rests** (150 ms). Spinning through 40 games used to mount 80 full-screen blurred hero images, and now mounts 2. This was the main GPU cost on fast spins and the roulette.
- **Only the capsule ring re-renders per animation frame.** The wheel position moved out of React state into a small motion object the ring subscribes to. The hero, text and roulette pill no longer re-render every frame.
- **Capsules just beyond the visible edges are preloaded.**
- **Cached DOM lookups:**
  - Steam's home layout is found once per render of Steam's home, not on every scroll or tick.
  - The header search box is cached.
  - The full-document scan for the top-bar strips runs every 5 s, not every second, and "none found" is cached too.

### Cleanup
- **Removed** the dead controller-state input path and all diagnostics objects. Errors now go to Steam's console via a small `debug()` logger, never the UI.
- **Screen switching consolidated into one `switchTo()`** with the cooldown. A single ▲ handler serves both the capture listener and the Focusable, and handles each press once.
- **Shared modules:** tuning values live in `constants.ts`, Steam DOM helpers in `steamDom.ts`, webpack module lookup in `webpack.ts`.
- **Swipe-down-at-top on the sections now really checks the top of the sections.** It used to compare against 0, which never matched there.
- **Offline typecheck** (`npm run typecheck`, stubs in `typecheck/`) passes with `strict` and `noUnusedLocals`.

## 0.8.18 — 2026-10-02

### Fixed
- **Selecting a news item on What's New didn't show its popup.** Items that open the browser worked. The wheel ⇄ sections slide used `transform: translateY(-50%)`, and a transformed ancestor becomes the containing block for `position: fixed` children. So Steam's popups opened from the sections were placed inside the 200 %-tall sliding box, off-screen (a test page put them at y = -700 instead of 100). The slide now animates `top` (0 ↔ -100 %), which leaves fixed popups relative to the screen.

## 0.8.17 — 2026-10-02

### Fixed
- **The shared background behind Steam's top bar and the tab row came and went.** 0.8.15 copied Steam's bar colour, but Steam only paints the bar in some scroll states. The plugin now paints the bar itself: the tab row gets a solid dark background plus an upward shadow reaching the top of the screen. Steam's top bar is made see-through over it. It follows scrolling instantly. Once the tab row has scrolled out of view, Steam's own bar is left as is.

## 0.8.16 — 2026-10-02

### Changed
- **Ⓑ on What's New / Friends / Recommended works like the stock home.** The first press jumps to the top of that page: its tab row and first items, not the wheel or the search bar. At the top, Ⓑ is left to Steam, which opens the Steam menu. Ⓑ no longer goes back to the wheel (▲ from the top row still does).

## 0.8.15 — 2026-10-02

### Changed
- **On What's New / Friends / Recommended, Steam's top bar and the tab row read as one bar**, like the stock page. Steam's own opaque top bar is kept there, and the tab row (L1 · tabs · R1) gets the same background, copied from the bar or its `::before`, with a near-match fallback. The see-through bar stays on the wheel only.
- **The tab row sits a little higher**: 2 px below the search box instead of 10 px.

## 0.8.14 — 2026-10-02

### Changed
- **What's New / Friends / Recommended start just below Steam's top bar** instead of underneath it. The tab row is scrolled to the top bar's bottom edge plus 10 px, measured from the header search box with a 56 px fallback, so nothing is covered.

## 0.8.13 — 2026-10-02

### Fixed
- **The header bar still looked gray on What's New.** 0.8.8 only cleared ancestors of the search box. Now the whole document is scanned for full-width strips at the very top, the wheel excluded. Their own background is cleared inline, and a class plus a small injected stylesheet clears their `::before`/`::after`, which inline styles can't reach. Everything is restored on leaving home.

## 0.8.12 — 2026-10-02

### Fixed
- **Holding ▲ from the bottom of What's New made the screen flicker between the wheel and the sections.** Several guards:
  - A held ▲ (auto-repeat, or ▲s under 250 ms apart) stops at the top of the sections. Leaving for the wheel needs a fresh press.
  - Switching between the wheel and the sections has a 700 ms cooldown.
  - On the wheel, ▲/▼ ignore auto-repeat and presses in the first 700 ms after arriving.
  - If focus drifts back into the sections right after a switch, it's returned to the wheel instead of bouncing.

## 0.8.11 — 2026-10-02

### Changed
- **The header bar is see-through on the sections screen too** (What's New / Friends / Recommended), not just on the wheel. Steam re-paints it as home scrolls, so the override is re-applied every second while home is shown, and restored when leaving home or unloading the plugin.

## 0.8.10 — 2026-10-02

### Changed
- **Name first, then playtime**: "EMBER HOLLOW · PLAYTIME 12.6 HRS".

## 0.8.9 — 2026-10-02

### Fixed
- **The game name is back on the line under the roulette pill**, after the playtime: "PLAYTIME 12.6 HRS · EMBER HOLLOW".

## 0.8.8 — 2026-10-02

### Changed
- **"NOW SELECTED · NAME" becomes "PLAYTIME … · NAME"**: the label is replaced by the selected game's playtime, and the name stays, from Steam's `minutes_playtime_forever`. It reads "PLAYTIME 12.6 HRS" or "플레이 시간 12.6시간", minutes under an hour, and "not played yet" at zero. The achievements line stays below it.

### Fixed
- **The gray header bar stuck after visiting What's New.** Steam paints its top bar (search · notifications · clock) opaque once home has scrolled. While the wheel shows, the bar's painted parts are now overridden inline to be see-through, re-applied briefly in case Steam re-renders it. They are restored on the sections screen, which keeps the stock look, and on plugin unload.

## 0.8.7 — 2026-10-02

### Changed
- **Wheel haptics are back to one strength everywhere on the pad** (-12 dB, like Steam's radial menu), as before 0.7.3. The 0.8.5 fix, where only Ⓑ mutes ticks, stays.

## 0.8.6 — 2026-10-02

### Changed
- **Wheel haptics are stronger toward the pad's centre** (0 dB) and ease to -12 dB, Steam's radial-menu strength, at the rim. This reverses the 0.7.3 direction.

## 0.8.5 — 2026-10-02

### Fixed
- **Wheel haptics were barely felt while rubbing.** 0.7.2 muted ticks for 500 ms after any non-trackpad button. In keyboard mode Steam forwards other button events during rubbing, so most ticks were muted. Now only Ⓑ mutes them.

## 0.8.4 — 2026-10-02

### Changed
- **Ⓨ again stops the roulette** on the game it's passing, which becomes today's game. Ⓑ no longer does anything special on the wheel, so the home wheel never takes Ⓑ.

## 0.8.3 — 2026-10-02

### Fixed
- **Left-pad wheel haptics felt almost absent.** The edge-strength range from 0.7.3 (-18 → -6 dB) was too weak. It is now -12 dB near the centre, the same as before 0.7.3, rising to 0 dB at the rim.

## 0.8.2 — 2026-10-02

### Fixed
- **Every Ⓑ on the wheel gave a right-pad haptic** (since 0.8.0). The home wheel got an always-present B handler for stopping the roulette. It now only takes Ⓑ while the roulette is spinning, as before 0.8.

## 0.8.1 — 2026-10-02

### Fixed
- **Ⓨ still opened the game menu instead of the roulette.** On the Deck, Ⓨ arrives as the "Options" button, which was wired to the game context menu. "Secondary" is Ⓧ. Ⓨ (Options) now spins the roulette, ≡ (Menu) opens the game menu, and Ⓧ is left alone.

## 0.8.0 — 2026-10-02

### Added
- **Ⓨ "Today's game?" roulette on the wheel.** It spins forward with sound and ticks, slows down (ease-out), and lands on a random game. Ⓑ stops it early, and your own rotation is ignored while it spins. A small pill above the bottom text explains it and shows "Picking…" and then "Today's game: NAME". Ⓨ no longer opens Steam's own action on the wheel.
- **"언어 / Language" setting** (Auto / 한국어 / English). Its description shows what was detected and from where.

### Fixed
- **The panel stayed Korean on an English Steam.** Detection could fall back to the system locale. It now prefers Steam's own language setting (`SteamClient.Settings.GetCurrentLanguage`, then the localization manager), and the setting above can force either language.

## 0.7.3 — 2026-10-02

### Changed
- **Wheel haptic strength follows where the finger is on the pad.** It runs from -18 dB near the centre to -6 dB at the rim, so wide circles tick firmly and small ones softly. Before, every tick was Steam's radial-menu -12 dB, which is still used when the position isn't known.

## 0.7.2 — 2026-10-02

### Fixed
- **An occasional right-pad haptic tick when pressing B.** Two guards:
  - Circle input ignores any jump over 90° between two analog messages. A finger can't sweep that fast, so it's the pad state resetting when another button is pressed, and it produced a stray step plus a tick.
  - Wheel haptics are muted for 500 ms after any non-trackpad button press on the wheel.

## 0.7.1 — 2026-10-02

### Changed
- **Game names on the wheel only show for the selected game and 3 either side.** Names further out are hidden and fade smoothly at the edge while spinning. The capsules themselves still show.

## 0.7.0 — 2026-10-02

### Added
- **English / Korean UI that follows Steam's language.** Korean is used when Steam's UI language is `koreana`, English otherwise. This covers every panel label, description and option, the preset colour names, and the wheel's empty-library message and button hints. The default bottom text is "나의 스팀덱" or "My Steam Deck" until you set your own. The Hangul keypad buttons appear only in Korean. The wheel's NOW SELECTED / STEAM ACHIEVEMENTS labels stay English by design.

## 0.6.4 — 2026-10-02

### Changed
- **Accent colour is presets only**; the R/G/B sliders are removed.

### Fixed
- **The selected preset wasn't visibly highlighted.** Steam's DialogButton styles hid the ring. Swatches are now plain Focusables: the selected one gets a white ring and a ✓, and the focused one grows slightly with an outline.

## 0.6.3 — 2026-10-02

### Changed
- **Accent colour is picked with 9 preset swatches or R/G/B sliders**, with a live preview and its hex value, instead of typing CSS.
- **The Hangul keypad buttons only show when Steam's UI language is Korean.** The check uses `SteamClient.Settings.GetCurrentLanguage()` = `koreana`, falling back to the localization manager or the browser language.
- "왼쪽 하단 문구" is renamed "하단 문구" (the text sits on whichever side the art is).

### Removed
- **Diagnostics lines from the Quick Access panel**, and the input-event logging behind the Korean investigation.
- **The controls hint line under the subtitle on the wheel screen.**

## 0.6.2 — 2026-10-02

### Changed
- **The delay before trackpad rubbing starts after a screen change is now 500 ms**, up from 300 ms.

## 0.6.1 — 2026-10-02

### Changed
- **Trackpad rubbing responds much sooner after switching screens** (wheel ↔ search ↔ What's New). Two 800 ms waits used to stack: one for gamepad focus and one before switching on the keyboard action set, about 1.6 s in total. Now there is no focus wait and the start delay is 300 ms, just enough for a B press to be released. Closing Quick Access or the Steam menu still waits 800 ms.

## 0.6.0 — 2026-10-02

### Added
- **A Hangul keypad of our own for the panel's text fields** ("한글로 입력: …" buttons). The 0.5.19 diagnostics confirmed that Steam's on-screen keyboard sends Korean to the Quick Access panel as empty key events (key U+0000, keyCode 0), so the letters can't be recovered from it. The keypad has a 2-beolsik layout and a ⇧ toggle for tense consonants and ㅒ/ㅖ. It also has space, a jamo-by-jamo ⌫ and 완료 (done). English still types in the normal fields.

## 0.5.20 — 2026-10-02

### Fixed
- **Spinning fast made the wheel shrink or shift.** Each capsule used to CSS-transition its x/y, and an interrupted transition cuts straight across the arc instead of following it. The wheel now animates one fractional position per frame (exponential follow, about 55 ms, never more than 2 games behind), and every capsule is placed on the circle from it. Size, shading and stacking also change smoothly with the distance.

## 0.5.19 — 2026-10-02

### Changed
- **Input diagnostics show every non-printable-ASCII key as code points**, plus `keyCode` and `code` for keydowns. In 0.5.17 only single characters above U+007F were converted, and Korean keys still showed as boxes, so the key value is something else (a control character, or more than one character). The line now also shows the plugin version, to confirm the update took.

## 0.5.18 — 2026-10-02

### Fixed
- **Korean letters from the keyboard showed as boxes.** They are likely *conjoining* jamo (U+1100 block), which the UI font can't draw, rather than the usual compatibility jamo. The composer now maps conjoining jamo to compatibility jamo before joining them into syllables (ᄒ ᅡ ᆫ → 한).

## 0.5.17 — 2026-10-02

### Fixed
- **Korean couldn't be typed in the panel's text fields.** The 0.5.16 diagnostics showed that Steam's Korean keyboard only sends `keydown` (key = the Hangul letter) to the Quick Access panel, with no `input`, so nothing was ever inserted. The fields now insert such keys themselves at the caret, and loose jamo are composed into syllables (ㅎㅏㄴ → 한).

### Changed
- Diagnostics show non-ASCII keys as `U+xxxx` instead of an unrenderable box.

## 0.5.16 — 2026-10-02

### Added
- **"입력 이벤트" diagnostics line**, showing the last 6 raw key, beforeinput, input and composition events a panel text field received, with their data. 0.5.15 showed that Korean never reaches `onChange`. This shows whether it arrives at all and as what.

## 0.5.15 — 2026-10-02

### Removed
- **Full-screen text editor (0.5.14).** Korean didn't type there either.

### Changed
- **Panel text fields compose loose Hangul jamo into syllables** (스ㅌㅣㅁㄷㅔㄱ → 스팀덱). This covers the case where the on-screen keyboard delivers raw jamo.

### Added
- **"글자 입력 수신" diagnostics line**, showing the raw text a field last received and the code points of its last four characters. It tells whether Korean reaches the plugin at all.

## 0.5.14 — 2026-10-02

### Fixed
- **Gray bar was still there on first load** and only cleared after visiting What's New. Steam scrolls home on its own at load. While resting on the wheel, home's scroller is now pinned to the top, so the header bar stays transparent.

### Changed
- **Trackpad circle rubbing is on by default again**, now that it works reliably on device. Existing saves are switched on once (settings v4).

### Added
- **"문구 편집 (전체 화면)"** button in the panel, which opens a full-screen editor in Steam's main window. Korean doesn't type in the Quick Access panel's own window, but should work there like Steam's search field. English still works in the panel fields.

## 0.5.13 — 2026-10-02

### Fixed
- **Opaque gray bar across the top of the wheel.** To hide the recent row, the home scroller was clamped to the sections' tab header at all times. Steam then considered home "scrolled" and painted its top header bar opaque, over the wheel. The clamp now only applies while the sections are showing. Returning to the wheel scrolls home back to the top, so the header stays transparent.
- **Panel text fields stopped accepting Korean** after 0.5.10's uncontrolled input. They are controlled again, but by the field's own local state. Only that input re-renders per keystroke, not the whole panel, and settings save after a 1.2 s pause or on blur.
- **Bottom hint line overflowed off-screen to the left.** It is now shorter and wraps.

## 0.5.12 — 2026-10-02

### Fixed
- **▲ from What's New needed two presses (cause found).** After ▼, focus lands on the L1/R1 tab row. The original recent-games row above it is hidden with `visibility`, but Steam can still focus it, so the first ▲ went into that invisible row and only the second reached the wheel. Focus entering the hidden row while the sections are showing now returns to the wheel right away. A 0.6 s grace after entering the sections avoids false triggers, and the check is skipped when "hide recent row" is off.

## 0.5.11 — 2026-10-02

### Fixed
- **▲ from What's New still needed two presses.** The sections now catch ▲ in the capture phase (`vgp_onbuttondown`), before Steam's lists move focus to the tab row. As a fallback, if a ▲ moves focus into the tab row anyway, the sections leave to the wheel at once.

### Added
- **"섹션 ▲" diagnostics line**, showing what the last ▲ saw and decided.

## 0.5.10 — 2026-10-02

### Fixed
- **Korean typed into the panel's text fields came out as loose jamo** (스팀덱 → 스ㅌㅣㅁㄷㅔㄱ). The fields were controlled inputs re-rendered on every keystroke, which breaks the on-screen keyboard's Hangul composition. That composition inserts a jamo, then replaces the previous character. The fields are now uncontrolled (`defaultValue`) and save after a 1.2 s pause or on blur.

## 0.5.9 — 2026-10-02

### Changed
- **One D-pad ▲ from the top row of What's New / Friends / Recommended returns to the wheel.** It used to stop at the tab row first, which needed two presses. Tabs are switched with L1/R1, so the tab row isn't a stop on the way up. ▲ on the tab row still returns as well.

## 0.5.8 — 2026-10-02

### Changed
- **D-pad ▲ on the wheel now focuses the search box in Steam's header bar**, exactly like the stock home, instead of navigating to the `/search` page. The header (absolute, z=6001, top 0, h=40, confirmed on device) already sits above the wheel. This removes the extra page and the grey bar left behind after returning. If the box isn't found, the wheel falls back to `/search`.
- **Circle input (keyboard action set) is only on while the wheel itself holds gamepad focus.** It turns off immediately when focus moves to the header, and turns back on 0.8 s after focus returns.

## 0.5.7 — 2026-10-02

### Fixed
- **Steam menu opened after returning to the wheel with B** (from search, a game page or the sections) while circle input was on. The keyboard action set is now always switched on 0.8 s after the wheel becomes active, not only after a focus change.

## 0.5.6 — 2026-10-02

### Fixed
- **Circle input haptic still felt on the right (or both) pads.** In the keyboard action set the haptic locations are 0 = left, 1 = right, 2 = both, tested on device. Normal mode is 1 = right, 2 = left. The wheel now uses the correct table per mode, replacing 0.5.5's swap.

### Changed
- **No haptic for D-pad ◀/▶ browsing** (including pad clicks, which arrive as D-pad). Only trackpad circles tick.

## 0.5.5 — 2026-10-02

### Fixed
- **Wheel haptic hit the opposite pad with the experimental circle input on.** Confirmed on device: in the keyboard action set, location 2 vibrates the right pad. It is the left pad otherwise. Locations are swapped while that mode is on.
- **Closing the Steam menu with B reopened it while circle input was on.** The keyboard action set is now re-enabled only after the main window has had focus for 0.8 s, instead of the instant the menu closes.

## 0.5.4 — 2026-10-02

### Fixed
- **Wheel haptics never vibrated.** The haptic locations were guessed from code usage (3 = left, 4 = right), but values 3 and 4 produce no vibration. Each value was then tested one by one on device: 1 = right pad, 2 = left pad. The wheel now uses left = 2, right = 1.

### Known issue
- **Extra haptic on B with the experimental circle input on.** In that mode Steam treats buttons as on-screen-keyboard keys, so pressing B also gives a right-pad haptic. This is Steam's own behaviour and only happens while that toggle is on.

## 0.5.3 — 2026-10-02

### Fixed
- **Stray B / Steam-menu actions while using the circle input (experimental toggle).**
  - **Cause, confirmed on device:** in the keyboard action set, Steam forwards the trackpad's finger down/up as UI button events (`GAMEPAD_BUTTON_LPAD_TOUCH` = 38). The wheel didn't handle them, so Steam acted on them.
  - **Fix:** while the circle input is on, the wheel now consumes TOUCH/CLICK button events for the rotating pad.

## 0.5.2 — 2026-10-02

### Removed
- **The faint blue guide ring drawn behind the wheel.**

## 0.5.1 — 2026-10-02

### Changed
- **Keyboard-action-set circle input (0.5.0) is off by default again.** It is now an "실험" toggle, and existing saves are switched off once (settings v3). On the home screen, Steam treated pad rubbing in that action set as B and Steam-menu presses. The radial menu only uses that mode while the on-screen keyboard is up.

## 0.5.0 — 2026-10-02

### Fixed
- **Touch-only circles on the trackpad finally rotate the wheel** (no click needed). Haptic ticks follow.
  - **Why the old paths failed:** on the current client `SteamClient.Input.RegisterForControllerStateChanges` does not exist, so the old raw path never received data. Clicking only "worked" because a left-pad click arrives as D-pad ◀/▶.
  - **How it works now:** the wheel does what Steam's own radial menu does. It sets `SetKeyboardActionset(true, false)` and refreshes it every second, enables analog input messages, and reads trackpad positions from the analog messages. Left pad = type 48, confirmed on device; right pad = 49, assumed.
  - **When it is active:** only while the wheel screen is shown and the main Steam window has focus. Quick Access, the Steam menu and overlays are separate windows, so they turn it off.
  - **Runtime-only:** on cleanup it switches the action set and analog messages off. Nothing is saved, and removing the plugin (or restarting Steam) leaves no trace.

## 0.4.4 — 2026-10-02

### Fixed
- **Black gap glitch when switching between the wheel and the sections.** The invisible recent-games panel still occupies space, and it showed through during the slide (scrolling happened only after it) and whenever Steam scrolled up.
  - **Positioning:** the scroller is now positioned before the slide, aligning the tab header exactly at the top (computed, not "scroll to bottom").
  - **Clamping:** the scroller is clamped so it can never scroll above the tab header.
  - **Spacer:** a trailing spacer (marked `data-deck-wheel-spacer`, removed on cleanup) lets the header reach the top even when the sections are shorter than the screen.

## 0.4.3 — 2026-10-02

### Fixed
- **Circular motion only rotated the wheel while the trackpad was clicked.** On device, the documented "touch" bit only fired on click. A finger is now treated as on the pad whenever the pad coordinates are non-zero (they reset to 0 on lift), or either pad bit is set, so a plain touch circle works.

## 0.4.2 — 2026-10-02

### Fixed
- **Circular motion on the left trackpad didn't rotate the wheel**, so no haptic ticks fired either.
  - **Why:** Steam UI scrolls with the left pad internally, so no wheel events reach the page, and the cursor path only applies to the right pad. The raw controller-state API is the only path that sees the left pad, and it had been opt-in since 0.3.0.
  - **Why it's back on:** it was switched off on suspicion of breaking UI sounds, but that turned out to be a muted WirePlumber stream. It is now on by default and enabled once for existing saves (settings v2).

## 0.4.1 — 2026-10-02

### Fixed
- **Black screen after D-pad ▼ (0.3.9 regression).**
  - **Cause, confirmed on device:** Steam's home lays out the sections (h=0, content at negative offsets) against the recent-games panel. Removing that panel with `display:none` collapsed the scroller to `clientHeight=0`.
  - **Fix:** the panel now stays in the layout but is invisible (`visibility:hidden`, which also takes it out of focus navigation).
  - **On ▼:** the home scroller is scrolled to the bottom so the What's New / Friends / Recommended tabs are in view, and focus moves to the first tab.
- **D-pad ▲ on the sections' tab row returns to the wheel.** Ⓑ still works.

## 0.4.0 — 2026-10-02

### Added
- **Wheel haptics, played exactly like Steam's own radial menu.** Each step calls Steam's haptic service `PlaySteamDeckHaptic(location, Tick, 1, -12 dB)` on the pad being rotated only: left pad = 3, right pad = 4.
  - **Values confirmed on device:** haptic type `{Tick: 1, Click: 2}`; locations 2 = both, 3 = left, 4 = right.
  - **Lookup:** the service is found in Steam's bundle by content.
  - **Fail-safe:** any error disables haptics for the session.
- **"휠 햅틱" toggle** (on by default) and a haptic line in the diagnostics.

### Note
- **D-pad menu navigation in stock Steam UI has no haptics.** Steam's UI only calls its haptic service from the on-screen keyboard, radial menus and sliders, so missing vibration on D-pad navigation is expected. Trackpad click and scroll feel come from the controller itself.

## 0.3.9 — 2026-10-01

### Added
- **D-pad ▲ on the wheel home opens Steam's search** (`/search`, route confirmed on device), like the stock home.

### Fixed
- **D-pad ▼ showed the old library/recent-games area first, and a second ▼ was needed to reach the sections.** The home structure was confirmed on device: the scroller holds an empty spacer, then the recent-games panel, then the sections container. The plugin now keeps the scroller's last child (the sections) and hides every earlier block that has content. The old heuristic stopped at the empty spacer and hid nothing.

## 0.3.8 — 2026-10-01

### Changed
- **Bigger hero art:** the default is 105% of screen width, the slider maximum is 150%, and the height cap is 92%.
- **Stronger top/bottom fade on the hero art:** the art fades over 30% at each edge (was 14%).

## 0.3.7 — 2026-10-01

### Fixed
- **Hero art slid from low to the middle on every game change.** The fade animation also animated `transform`, which replaced the art's `translateY(-50%)` centring until it finished. The fade is now opacity-only, so the art appears directly at the middle.

### Changed
- **Bigger hero art:** the default size is 85% of screen width (was 70%), the slider maximum is 120%, and the height cap is 82%.

## 0.3.6 — 2026-10-01

### Fixed
- **≡ did nothing on the wheel.** The native game menu now opens from both the "Options" and the "Menu" gamepad events, since which one ≡ maps to isn't documented. The diagnostics line shows which button fired and whether the menu was found.

## 0.3.5 — 2026-10-01

### Fixed
- **Every wheel step threw `Input.TriggerHapticPulse requires 4 arguments; only 3 given`**, which Decky's ErrorBoundary caught. The current client needs 4 arguments, while the @decky/ui typings show 3. The haptic call is now removed entirely until the 4th argument is confirmed on device.

## 0.3.4 — 2026-10-01

### Added
- **≡ on the wheel opens Steam's own game context menu** (Play, Properties, Favorites, Manage…), the same one a library tile shows.
  - **How it is found:** the menu component and its options are located in Steam's webpack bundle by content, not by minified name.
  - **How it is called:** it is called exactly like the library tile does (`overview`, `client: "mostavailable"`, `launchSource`, `bInGamepadUI`, `ownerWindow`), confirmed on device.
  - **Fallback:** if the menu can't be found, ≡ opens the game page instead.
- **"≡ 메뉴" status** in the diagnostics.

## 0.3.3 — 2026-10-01

### Changed
- **Ⓐ opens Steam's own game page** (`/library/app/<appid>`) instead of launching the game straight away. It plays `deck_ui_into_game_detail.wav`.

## 0.3.2 — 2026-10-01

### Changed
- **Hero art is vertically centred on the screen** (was top-aligned). It stays anchored to the art side and now fades at both its top and bottom edges.

## 0.3.1 — 2026-10-01

### Fixed
- **No sound on the wheel.** Sounds now play through Steam's own UI audio store (`SteamUIStore.m_GamepadUIAudioStore.PlayAudioURL`), the same path Steam UI uses, instead of a plain `Audio` element. The first-choice file `deck_ui_tile_scroll.wav` does not exist on SteamOS. Files now used, all confirmed present: `deck_ui_navigation.wav` (step), `deck_ui_launch_game.wav` (launch), `deck_ui_tab_transition_01.wav` (wheel ↔ sections).

### Note
- **Earlier loss of all Steam UI sounds was not caused by the plugin.** WirePlumber had saved the `Chromium` output stream (Steam's UI process) and the Notification role as muted in `~/.local/state/wireplumber/stream-properties`. Unmuting those entries fixed it.

## 0.3.0 — 2026-10-01

### Changed
- **Input roles:** the trackpad navigates games, and the D-pad switches screens. D-pad ◀/▶ still rotate as a fallback until trackpad rotation is confirmed on device.
- **Screen switching between the wheel and Steam's sections is now handled by the plugin** instead of native page scrolling and Steam's focus navigation:
  - D-pad ▼ on the wheel or a swipe up → sections.
  - Ⓑ, ▲ past the top, or a swipe down while the sections are scrolled to the top → back to the wheel.
  - The screens slide; the container never scrolls, so the original home can't peek through.
- **Recent-row detection:** the row is now found via the first horizontal carousel, with a fallback to the first block.
- **Raw controller-state API is now opt-in** (advanced toggle, off by default).

## 0.2.4 — 2026-10-01

### Fixed
- **Navigation sound was missing on the wheel.** Steam only plays it when focus moves, and the wheel handles input itself. The wheel now plays Steam's own UI sound files (`deck_ui_tile_scroll.wav`, falling back to `deck_ui_navigation.wav`) on each step, and a launch sound on Ⓐ. Sound packs that replace those files still apply.

### Added
- **"휠 효과음" toggle** in the panel.
- **Sound status** in the diagnostics.

## 0.2.3 — 2026-10-01

### Changed
- **New defaults:** 11 games on screen, wheel size 32%, capsule size 120%, title size 70%. The rotation trackpad now defaults to **left**, so the wheel sits on the left and the art on the right.

- **Long game names** wrap to two lines on the wheel, then end with an ellipsis.

### Removed
- **"시계 방향 = 다음 게임" option.** Clockwise always means next, matching the desktop-mode scroll wheel where clockwise scrolls down.

## 0.2.2 — 2026-10-01

### Changed
- **Wheel capsules are fully opaque.** Distance from the selection is now shown by darkening instead of transparency. Nearer capsules stack on top, so overlaps show clearly which game is above or below.

## 0.2.1 — 2026-10-01

### Fixed
- **Hero art cropped to its middle, black behind the wheel.** The art now keeps its own aspect ratio. It is sized by a new "히어로 이미지 크기" setting (default 70% of screen width) and fades toward the wheel. A blurred, dimmed copy fills the whole background.
- **Scrolling below the wheel showed the full original home.** The original's top "recent games" row is now hidden, so the wheel replaces it and only the sections remain below. This can be toggled off in the panel.

### Added
- **Scroll-wheel rotation path:** Steam Input's "scroll wheel" trackpad mode turns circling into wheel events. Wheel events over the launcher no longer scroll the page.
- **More diagnostics:** the panel now shows scroll-path counters and the recent-row hide status.

### Changed
- **Games visible on screen:** the default is now 7 (was 9) so capsules don't overlap.

## 0.2.0 — 2026-10-01

### Fixed
- **Plugin failed to load ("Failed to fetch dynamically imported module").** The package now includes a built `dist/index.js`.
- **Capsules bunched in the top-left corner.** Layout now measures the real render target instead of the hidden SharedJSContext window.
- **Right trackpad did not rotate the wheel.** Added a cursor-motion fallback, because the right pad drives the cursor in Steam UI. The touch state now uses the official `ulButtons` touch bits.

### Added
- **Home screen mode:** the wheel replaces the Steam home (`/library/home`). It is a toggle in the panel, on by default, and persists across reboots.
- **Steam's original home sections** (What's New / Friends / Recommended) sit below the wheel. Reach them with D-pad ▼ or a swipe up.
- **Achievement progress** for the selected game, shown under the game name.
- **Library settings:** view (installed / whole library) and sort (recently played / A–Z).
- **Display settings:** games visible on screen, wheel size, capsule size, title size.
- **Rotation trackpad setting** (right by default). Choosing the left pad mirrors the layout.
- **Trackpad diagnostics** in the Quick Access panel.
- **Settings storage:** settings are stored in `~/homebrew/settings/deck-wheel/settings.json` and deleted on uninstall.
- **Offline build:** `bun build/build.ts` builds without npm.

### Removed
- The Ⓨ shortcut to the Steam home sections.
- The `react-icons` dependency.

## 0.1.0 — 2026-10-01
- Initial wheel launcher: right-half dial, left-half hero art, personalized bottom-left text.
