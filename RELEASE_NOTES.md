# Release notes

## 1.0.1

- **No roulette in "Whole library".** With 1000+ games it spun for minutes; Ⓨ roulette now works only with "Installed games".
- **Stronger default haptics** (level 7, was 5).
- **Alphabet popup** now also appears while you spin fast inside a big letter group, not only when the letter changes.

## 1.0.0 — first public release

**Spindeck** replaces the Steam Deck home screen with a rotary-wheel game launcher.

- **The wheel.**
  - Spin your library with a circle on the trackpad (left by default, or right). The wheel can sit on either edge, with the selected game's hero art on the other side.
  - Steam's own haptic tick clicks every 5° of trackpad motion, and a game advances every 40°. Strength is adjustable.
  - D-pad ◀ ▶ steps through games. Ⓐ opens the game page, ≡ opens Steam's game menu.
- **Alphabet popup.** In A–Z sort, a big letter shows for about 1.5 s whenever the first letter changes, so you know where you are when spinning fast.
- **Ⓨ "Today's game?" roulette.** It spins and lands on a random game. Ⓨ again stops it.
- **Personal touch.** Corner text and an optional subtitle, with preset accent colours. Each game shows its playtime and achievement progress.
- **Steam's home underneath.** ▼ opens What's New / Friends / Recommended:
  - L1/R1 switch tabs, Ⓑ jumps to the top, and Ⓑ again opens the Steam menu, as on the stock page.
  - Steam's popups (event details) open as usual.
  - The top bar and tab row share Steam's blurred bar look.
- **English / Korean UI** following Steam's language (or set manually), plus a Hangul keypad for the panel's text fields.
- **Leaves nothing behind.** No Steam settings, layouts or files are changed. Turning it off, disabling or uninstalling restores Steam immediately, and uninstalling deletes the plugin's settings. If a Steam update breaks something it relies on, Steam's original home is shown instead of an error.

Development history (0.1 – 0.9): see [CHANGELOG.md](CHANGELOG.md).
