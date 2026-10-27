# Spindeck mock

A browser preview of Spindeck for working on `src/` without a Steam Deck, and the home of the smoke and E2E tests.

**What's real:** the plugin, built from `../../src` with the same shims and build-time values as `build/build.ts`, and its backend: every `callable` goes through `dev-server.py` to the actual `Plugin` class in `../../main.py`.

**What's fake:** everything Steam and Decky provide ([mock.jsx](mock.jsx)). That covers the `@decky/ui` components, Decky's route patching, Steam's home layout, the game library (with art, playtime and achievements), controllers, the trackpad, haptics, UI sounds and friends. The screen is 1280×800 like Gaming Mode. It's a behavioural stand-in, not pixel-accurate SteamUI, so do a final check on a Deck before shipping a UI change.

## Run it

```bash
npm install            # first time only
npm run build          # out/plugin.js + out/mock.js (npm run dev rebuilds on every change)
npm run serve          # http://localhost:5190
```

From the repo root, `npm run mock` builds and serves in one go.

| Key | Deck button |
| --- | --- |
| ←↑→↓ | D-pad |
| Enter / A | Ⓐ |
| Esc / Backspace / B | Ⓑ |
| X / Y | Ⓧ / Ⓨ |
| M | ≡ (menu) |
| Q / E | L1 / R1 |
| `` ` `` | Quick Access (…) |
| L | event log |

The header's buttons switch between the home, the `/spindeck` page and Quick Access, show the event log, and reset the saved settings. URL options:
- `?qam` opens Quick Access, `?log` shows the log, `?lang=koreana` makes Steam report Korean.
- For regression tests:
  - `?sgdb=first|last`: SteamGridDB's home patch loads before or after Spindeck.
  - `?rival`: another plugin also keeps its patch last.
  - `?crash`: the wheel throws while rendering.
  - `?flat`: Steam's home has a layout Spindeck doesn't know.

Decky's route patching is reproduced as Decky does it: each patch gets a fresh clone of the route's element, wrapped the first time. React is the production build, like Steam's.

The **event log** lists everything the plugin asks of Steam and Decky: `navigate`, `RunGame`, `haptic`, `sound`, `keyboardActionset`, `decky` (installer calls) and `backend` calls. In the browser console, `mock.events("RunGame")` returns those entries and `await mock.circle(360)` rubs the trackpad once around. `mock.rerenderHome()` replaces every element of Steam's home, and `mock.unload()` unloads the plugin the way Decky does.

## Tests

```bash
npx playwright install chromium   # first time only
npm run test:e2e
```

Playwright builds the mock and starts the server on port 5191 with its own settings folder (`.dev-data/e2e`). Each test resets the settings through the real backend first.

- [e2e/smoke.spec.ts](e2e/smoke.spec.ts): every entry point loads without errors (home, Quick Access, `/spindeck`, wheel off, Korean), and the backend round-trip works.
- [e2e/regressions.spec.ts](e2e/regressions.spec.ts): bugs that once broke on a Deck. SteamGridDB's patch in either order (#2), a rival plugin that also keeps its patch last, unloading without React unmounting, a crash falling back to Steam's home, and an unknown home layout.
- [e2e/home.spec.ts](e2e/home.spec.ts): the wheel ⇄ sections switch (▼ / ▲, Ⓑ, held ▲, ▲ to search) and the top band. It covers the band after Steam rewrites the tab row or re-renders its whole home, and checks that smooth scrolling isn't fought.
- [e2e/wheel.spec.ts](e2e/wheel.spec.ts): controller flows. Covers the D-pad, Ⓐ / Ⓧ with and without "Ⓐ launches the game", games that aren't installed, the Ⓨ roulette, the trackpad circle with haptics, L1 / R1, settings surviving a reload, and the in-panel update (it installs with GitHub's sha256 and refuses without one).

## Limitations

- The native ≡ game menu isn't provided, so ≡ falls back to the game page, as on a client the plugin can't read.
- Quick Access sits in the same window as the wheel. On a Deck it's a separate window, and the wheel pauses while it has focus.
- The backend only answers requests from this server's own page (`http://localhost:5190` or `http://127.0.0.1:5190`), so other sites open in your browser can't drive it.
- This folder is standalone tooling with its own `package.json`. It isn't part of the plugin build and isn't shipped in releases.
