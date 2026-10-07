# Release notes

## 1.4.1

### What's new in 1.4.1

**Fixed**
- 🧩 **"An error occurred while rendering this content" on the home screen with SteamGridDB installed.** With SteamGridDB's featured-capsule option on, the home screen could show Decky's error page instead of the wheel, depending on which plugin loaded first. Both plugins now work together in any order, with no setting to change. Thanks to Kida-Tech for the detailed report (#2).

**Install:** Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.4.1/spindeck-1.4.1.zip

New here? See the [README](https://github.com/justinca92/spindeck#readme) for the full feature list.

---
Tested on Steam Deck OLED in game mode. Bugs and ideas: [Issues](https://github.com/justinca92/spindeck/issues)
Free and open source. If you enjoy it: [Ko-fi](https://ko-fi.com/jhw0806) ☕
Built with AI assistance (Claude); designed, tested and tuned on-device by justinca92.

## 1.4.0

### What's new in 1.4.0

**New**
- 🎡 **Bottom layout.** A second wheel position: the wheel rises from the bottom corner on your rotating trackpad's side, the selected game sits at the top of the arc with its name and game info just above it, and the hero art spans the full width across the top of the screen. Switch in the panel: Display → Wheel position. The side layout stays the default.

**Changed**
- ⚡ **Game info shows instantly**, together with the game's name, instead of fading in after you stop.
- 📌 **The game title and the Ⓨ "Today's game?" button stay in place.** The info line now has its own space under the title, so they no longer jump up and down as you spin and stop.
- ✂️ **Long game names stay on one line**, ending with "…" instead of wrapping.
- 🏆 **Achievements show up much faster.** They're now taken from Steam's own achievement cache first, so they appear together with the playtime instead of a moment later.

**Fixed**
- 📑 **The What's New / Friends / Recommended bar no longer stacks onto Steam's top bar** (battery, Wi-Fi, profile) when you go between the wheel and those pages.
- 🎯 **A game could briefly show the previous game's achievements** if you moved on before Steam answered.

**Install:** Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.4.0/spindeck-1.4.0.zip

New here? See the [README](https://github.com/justinca92/spindeck#readme) for the full feature list.

---
Tested on Steam Deck OLED in game mode. Bugs and ideas: [Issues](https://github.com/justinca92/spindeck/issues)
Free and open source. If you enjoy it: [Ko-fi](https://ko-fi.com/jhw0806) ☕
Built with AI assistance (Claude); designed, tested and tuned on-device by justinca92.

## 1.3.1

### What's new in 1.3.1

**New**
- ℹ️ **Game info at a glance.** Stop on a game and one line fades in under its name: ⏱ total playtime · 🕒 when you last played · 🏆 achievements with a progress bar · 👥 how many friends are playing it right now (only shows when someone is).

**Changed**
- 🔠 **Bigger game title**, so the selected game reads at a glance.
- 🖼️ **Hero art sits a little higher and further from the wheel.** It's no longer dead centre, it's slightly smaller so less of it is cut off at the screen edge, and it fades out before the wheel, so the inside of the wheel stays clear. (If you changed Hero art size yourself, your setting is kept.)
- 🌑 **Darker around the wheel.** The background fades toward black on the wheel's side, so the capsules stand out.
- 🌒 **Darker fade along the bottom**, so the game info, "Today's game?" and your corner text stay easy to read, even on bright art.

**Fixed**
- 🕹️ **Non-Steam games showed "Not played yet"** on the wheel even though their game page shows playtime.
- 🌫️ **The blurred background now lines up with the hero art**, so the art melts into it instead of meeting a separately zoomed copy.
- ✨ **A thin light line could show around some games' hero art**, between the art and the blurred background.

**Install:** Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.3.1/spindeck-1.3.1.zip

New here? See the [README](https://github.com/justinca92/spindeck#readme) for the full feature list.

---
Tested on Steam Deck OLED in game mode. Bugs and ideas: [Issues](https://github.com/justinca92/spindeck/issues)
Free and open source. If you enjoy it: [Ko-fi](https://ko-fi.com/jhw0806) ☕
Built with AI assistance (Claude); designed, tested and tuned on-device by justinca92.

## 1.3.0

### What's new in 1.3.0

**New**
- 🎮 **Haptics only when you're on the Deck.** If you play with another controller (Deck docked to a TV with a DualSense, Xbox pad…), the Deck itself no longer vibrates; pick the Deck back up and it does again. On by default, can be turned off in the panel (Controls).

**Changed**
- 🧈 **Smoother wheel.** Spinning does much less redraw work per frame, so it should feel lighter, especially with big capsule art.
- ⚡ **Faster art after a reboot.** Game art now comes from Steam's own library cache on the Deck first, instead of being downloaded again.

**Fixed**
- 🕹️ **Controls went to the hidden Steam home** after coming back from a running game with the STEAM button: the wheel was shown, but ◀/▶ moved things you couldn't see ([#1](https://github.com/justinca92/spindeck/issues/1), thanks @Shenishio).
- 🔁 **◀/▶ and the left stick didn't turn the wheel right after a reboot** (only a sound) until you went up or down and back.

**Install:** Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.3.0/spindeck-1.3.0.zip

New here? See the [README](https://github.com/justinca92/spindeck#readme) for the full feature list.

---
Tested on Steam Deck OLED in game mode. Bugs and ideas: [Issues](https://github.com/justinca92/spindeck/issues)
Free and open source. If you enjoy it: [Ko-fi](https://ko-fi.com/jhw0806) ☕
Built with AI assistance (Claude); designed, tested and tuned on-device by justinca92.

## 1.2.0

### What's new in 1.2.0

**New**
- 🎛️ **Pick what each wheel shows.** The main wheel, L1 and R1 can each show Installed games, your whole library, ★ Favorites or any of your Steam collections, each with its own sort. Set them in the panel's Library section (main wheel: Installed games by default; L1 and R1 start off).
- ⏱️ **New sort: Most played.** Sort any wheel by total playtime, next to Recently played and A–Z.
- ↻ **Reload the wheel** button in the panel's About section, for when the screen gets stuck. Settings are kept.
- ⏮️ **L1 / R1 on the wheel** jump to those views and back, with a quick strip at the top showing where you are.
- 🔫 **Revolver swap.** Switching with L1/R1, the wheel turns out like a revolver cylinder and the next one clicks into place, with a short rumble on both trackpads. Can be turned off in the panel.

**Changed**
- 🔤 **Alphabet popup** is now a small, see-through square, and only shows while browsing the whole library A–Z.

**Fixed**
- 🎯 **Ⓐ could keep opening the same game**, and L1/R1 could ignore a view you had just set, until the wheel was reopened. The wheel's buttons now always act on what's on screen.
- 📍 **The wheel remembers your spot.** Coming back from a game page used to jump to the first game; now you're on the same game again, in every view.

**Install:** Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.2.0/spindeck-1.2.0.zip

New here? See the [README](https://github.com/justinca92/spindeck#readme) for the full feature list.

---
Tested on Steam Deck OLED in game mode. Bugs and ideas: [Issues](https://github.com/justinca92/spindeck/issues)
Free and open source. If you enjoy it: [Ko-fi](https://ko-fi.com/jhw0806) ☕
Built with AI assistance (Claude); designed, tested and tuned on-device by justinca92.

## 1.1.2

- **Ⓨ roulette works with the whole library too**, and always lands within a few seconds, even with 1000+ games.
- **Alphabet popup fixed on the Deck** (A–Z sort), with a softer, borderless look and a shorter 1 s display. It now shows only for the whole library (A–Z), not the short installed list.
- **Milestone toast no longer flickers** while you spin. It sits in a fixed spot at the top, on the side opposite the wheel.

Install: Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.1.2/spindeck-1.1.2.zip

## 1.1.1

- **Fidget mode removed.** The wheel no longer coasts after you let go. The dial odometer and everything else are unchanged.

Install: Decky → Developer → Install Plugin from URL →
https://github.com/justinca92/spindeck/releases/download/v1.1.1/spindeck-1.1.1.zip

## 1.1.0 — first public release

**Spindeck** turns the Steam Deck home screen into a rotary dial for your games: rub the trackpad in a circle and feel every game click by.

### The wheel
- Rub the trackpad in a circle to spin your library (left pad by default, or right). The wheel sits on either screen edge, with the selected game's hero art on the other side.
- Steam's own haptic tick clicks every 5° of motion, and a game advances every 40°. Strength is adjustable.
- D-pad ◀ ▶ steps through games, Ⓐ opens the game page, ≡ opens Steam's game menu.
- Shows playtime and achievement progress for the selected game.

### Library
- Installed games or your whole library, sorted by recently played or A–Z.
- **Alphabet popup.** In A–Z sort, a big letter shows when the first letter changes, and also while you spin fast, so you always know where you are.

### Fun stuff
- 🎲 **"Today's game?" roulette.** Press Ⓨ to spin and land on a random installed game. Ⓨ again stops it.
- 🌀 **Fidget mode.** Spin 10 full turns without stopping, then let go: the wheel keeps coasting, clicking slower and slower until it stops. Touch the pad to catch it.
- 📟 **Dial odometer.** Spindeck counts every turn you spin. Check your total in the panel's About section, and watch for milestone celebrations.

### Make it yours
- Corner text and an optional subtitle, with preset accent colours.
- English / Korean UI following Steam's language, plus a built-in Hangul keypad for the panel's text fields.

### Steam's home is still there
- Press ▼ for What's New / Friends / Recommended, which behave like the stock page (L1/R1 tabs, Ⓑ to the top, Ⓑ again for the Steam menu, event popups).

### Leaves nothing behind
No Steam settings, controller layouts or files are changed. Turning it off, disabling or uninstalling restores Steam immediately, and uninstalling deletes the plugin's settings. If a Steam update breaks something it relies on, Steam's original home is shown instead of an error.

### Install
Decky → ⚙️ → General → enable **Developer mode** → Developer tab → **Install Plugin from URL**:
https://github.com/justinca92/spindeck/releases/download/v1.1.0/spindeck-1.1.0.zip

Tested on Steam Deck OLED in game mode. Bugs and ideas: [Issues](https://github.com/justinca92/spindeck/issues)
Free and open source. If you enjoy it: [Ko-fi](https://ko-fi.com/jhw0806) ☕

Built with AI assistance (Claude); designed, tested and tuned on-device by justinca92.

Development history: see [CHANGELOG.md](CHANGELOG.md).
