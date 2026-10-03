# Spindeck

**A rotary-wheel game launcher that replaces the Steam Deck home screen.** Spin your library with a circle on the trackpad and feel every game click by.

[한국어 README](README.ko.md) · [Release notes](RELEASE_NOTES.md)

[![Support on Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/jhw0806)

<!-- Screenshots: add real device captures (STEAM + R1) to docs/screenshots/ -->
<!-- ![Wheel](docs/screenshots/wheel.png) ![What's New](docs/screenshots/sections.png) -->

## Features

- **Wheel home screen.** Your library sits on a dial on the screen edge, with the selected game's hero art on the other side.
- **Trackpad circle rotation.** Rub the trackpad in a circle to spin the wheel. It clicks with Steam's own haptic tick on that pad, with adjustable strength.
- **Alphabet popup.** In A–Z sort, a big letter shows when the first letter changes and while you spin fast.
- **Today's game.** Press Ⓨ to spin a roulette that lands on a random installed game. Press Ⓨ again to stop it on the spot.
- **Fidget mode.** Spin 10 full turns without stopping, then let go: the wheel coasts on, clicking slower until it stops. Touch the pad to catch it.
- **Dial odometer.** Counts every turn you've ever spun. See the total in the panel's About section, with milestone celebrations along the way.
- **Your own title.** Set a line of text in the corner (e.g. "j1's Steam Deck") and an optional subtitle, with a preset accent colour.
- **Steam's home is still there.** Press ▼ for What's New / Friends / Recommended, which behave like the stock page.
- **English and Korean**, following Steam's language. There is a built-in Hangul keypad, because Steam's keyboard can't type Korean in the Quick Access panel.

## Controls (home)

| Input | Action |
|---|---|
| Trackpad circle (left by default) | Spin the wheel |
| D-pad ◀ ▶ | Previous / next game |
| Ⓐ | Open the game's page |
| ≡ | Steam's game menu (Play, Properties, …) |
| Ⓨ | Roulette: "Today's game?" (Ⓨ again stops it; installed games only) |
| D-pad ▲ | Search, like the stock home |
| D-pad ▼ | What's New / Friends / Recommended |
| ▲ from the top there | Back to the wheel |
| Ⓑ there | Jump to the top; Ⓑ again opens the Steam menu |

Settings live in Quick Access (…) → Spindeck: home toggle, text and colour, library filter and sort, sizes, haptics, sound, which trackpad, and language.

## Install (Decky developer mode)

Spindeck isn't in the Decky store. It installs from this repository's releases.

1. Install [Decky Loader](https://decky.xyz) if you haven't.
2. In game mode, open Quick Access (…) → Decky → ⚙️ settings → **General**, and turn on **Developer mode**.
3. Open the **Developer** tab and choose one of:
   - **Install Plugin from URL**: paste the link to `spindeck-x.y.z.zip` from the [latest release](https://github.com/justinca92/spindeck/releases/latest).
   - **Install Plugin from ZIP**: pick the zip after downloading it on the Deck.
4. Open Quick Access → Spindeck. The wheel replaces the home screen right away.

To update, install the newer zip the same way.

## Uninstalling leaves nothing behind

Spindeck never changes Steam's settings, controller layouts or files.

- **Turning "Use the wheel as Home" off** shows Steam's original home.
- **Disabling or uninstalling the plugin** restores everything immediately: the trackpad input mode, the header styling and the hidden row. Uninstalling also deletes its settings file.
- **If a Steam update breaks something it relies on**, Steam's original home is shown instead of an error.

## Known limitations

- Korean text in the panel uses the plugin's own Hangul keypad, because Steam's on-screen keyboard sends empty keys to the Quick Access panel.
- It relies on Steam's internal UI, which isn't a public API. A Steam client update can change it. The plugin then falls back to Steam's home until it's updated.
- Tested on Steam Deck (LCD/OLED) in game mode.

## Support

Spindeck is free and open source. If you enjoy it, you can [buy me a coffee on Ko-fi](https://ko-fi.com/jhw0806) ☕. There's also a button in the plugin's About section.

Bug reports and ideas: [Issues](https://github.com/justinca92/spindeck/issues).

## Building

```bash
bun build/build.ts        # offline build → dist/index.js (no npm install needed)
./scripts/package.sh      # → release/spindeck-<version>.zip
npm run typecheck         # strict TypeScript check with offline stubs
```

Pushing a tag `vX.Y.Z` (matching `package.json`) builds the zip and publishes a GitHub Release via `.github/workflows/release.yml`. Dev tests are in `tests/` (see `tests/README.md`).

## How it was made

Spindeck was built with AI assistance (Claude). I designed the features, tested and tuned everything on my own Steam Deck, and decided what shipped.

## License

[BSD-3-Clause](LICENSE)
