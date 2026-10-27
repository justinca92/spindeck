# AGENTS.md

Notes for coding agents working on Spindeck, a [Decky Loader](https://decky.xyz) plugin that replaces the Steam Deck home screen with a rotary-wheel game launcher. User-facing docs: [README.md](README.md).

## Layout

- `src/` — frontend (TypeScript + React, runs inside Steam's gamepad UI)
  - `index.tsx` plugin entry: routes, home patch, Quick Access panel (all settings UI)
  - `WheelPage.tsx` the wheel: input, roulette, L1/R1 views, hero art
  - `HomeSwitch.tsx` / `homePatch.tsx` wheel vs Steam's original home; patch must stay last on the route
  - `settings.ts` settings model, defaults, migrations (`settingsVersion`)
  - `lang/*.ts` one file per language (`ko.ts` is the source type), `i18n.ts` puts them together, `locale.ts` maps Steam's language names to them (`LANGS`)
  - `games.ts` library reads from Steam's internal stores (`appStore`, `collectionStore`, `SteamClient`)
  - `updater.ts` in-panel update via GitHub releases + Decky's installer
- `main.py` — Python backend: settings file, update marker, uninstall cleanup
- `dist/index.js` — built bundle, **not committed** (`.gitignore`): `bun build/build.ts` locally, and the release workflow builds it for the zip
- `typecheck/` — offline type stubs for Decky/React
- `tests/unit/` — unit tests on `src/*.ts` (`node --test`, no dependencies); `tests/py/` — backend tests ([tests/README.md](tests/README.md))
- `devtools/mock/` — the plugin + real `main.py` in a browser stand-in for Steam / Decky, and the Playwright smoke + E2E tests ([its README](devtools/mock/README.md))
- `build/` — offline bun build with shims (no `npm install` needed)
- `.github/workflows/` — `ci.yml` (every push / PR), `release.yml` (`v*` tags)

## Commands

```bash
npm run typecheck      # strict TS check against typecheck/ stubs — run after every change
npm run test:unit      # unit tests (Node 24+, no install)
npm run test:backend   # backend tests (main.py)
npm run test:e2e       # smoke + E2E in the browser mock (first: npm install + npx playwright install chromium in devtools/mock)
npm run mock           # the mock at http://localhost:5190, for trying UI changes without a Deck
bun build/build.ts     # → dist/index.js
./scripts/package.sh   # → release/spindeck-<version>.zip
```

CI runs the typecheck, the unit and backend tests, the build and the E2E suite on every push and PR.

## Rules

- Steam's UI internals are not a public API. Wrap every access in try/catch and fall back to Steam's own behaviour; never let the home screen crash.
- Anything that changes Steam's DOM, input or styles must be undone on unload: register it with `onTeardown()`.
- New setting: add it to `WheelSettings` + `DEFAULTS` in `settings.ts`, a panel control in `index.tsx`, and its strings in every language (`src/lang/*.ts`). If an existing default changes, add a `settingsVersion` migration.
- Button handlers on the wheel go through the `latest`/`call` trampolines in `WheelPage.tsx` (Steam's `Focusable` keeps stale handlers otherwise). On the Deck: Ⓨ = `Options`, Ⓧ = `Secondary`, ≡ = `Menu`.
- Keep `README.md` and `README.ko.md` in sync (controls table, features).
- Match the existing code: comments explain *why* (often what was seen on device), constants live in `src/constants.ts`.

### Steam Deck UI

- Clickable non-button elements need both `onActivate` (Ⓐ) and `onClick` (touchscreen), like `Swatch` in `index.tsx`.
- Steam only scrolls to follow focus: text above a panel's first focusable control is unreachable by controller. Wrap it in `<Focusable onActivate={() => {}}>` so D-pad up can land on it.
- Every new user-facing string goes in all 10 languages in `src/lang/*.ts`: add it to `ko.ts` first (its type is `Strings`, so `tsc` then fails on every file still missing the key). Reuse an existing string when the text already exists; keep the info-line strings uppercase where the script has case.
- Type-only imports say so (`import { type Lang } …`, `import type …`): the unit tests load `src/*.ts` through Node's type stripping, which can't tell a type from a value.
- Check UI changes on real Steam Deck hardware before a release; the browser tests stub Steam.

### Decky Loader

- Check route names and behaviour in decky-loader's `backend/decky_loader/utilities.py` and `browser.py` before relying on them (that's where its install hash check lives).
- `utilities/install_plugin` shows Decky's own confirm dialog. With an empty hash it installs **without** verifying the zip.

### Security

- Download only release assets of `justinca92/spindeck`, and keep the SHA-256 check for self-updates (`startUpdate` in `updater.ts` refuses without one).
- The only network call is the GitHub releases API, made only when the user presses "Check for updates". Don't add background requests (unauthenticated GitHub allows 60 requests/hour per IP).
- Workflow actions are pinned to commit SHAs with a `# vX.Y.Z` comment; only `publish` in `release.yml` gets `contents: write`. Keep both when editing workflows.

### Dependencies

- The [update-dependencies skill](.claude/skills/update-dependencies/SKILL.md) updates `package.json` and the pinned Actions together; Dependabot opens weekly PRs for both.

### Tests

Every test must be able to fail when the behaviour it names breaks. Delete fake and redundant tests rather than keeping them for the count.

- Fake: only asserts what a stub was set up to return, prints instead of asserting, or passes with the code under test removed.
- Redundant: same behaviour and branch as another test with no new input or edge case; keep the cheaper or more specific one.
- To check a test is real, break the code it covers, confirm it fails, then revert.
- Unit tests import `src/*.ts` through `tests/unit/register.mjs` (stubs for `react` / `@decky/*`); a module whose state matters is imported fresh per case (`?case=N`). Only `.ts` files load this way, so logic worth testing doesn't belong in a `.tsx` file.
- Browser tests: assert on what the plugin asked of Steam / Decky through the mock's event log (`mock.events(kind)`), not on internals; stub GitHub with `page.route`. A bug that only shows with another plugin, a Steam re-render or an unload gets a regression in `devtools/mock/e2e/regressions.spec.ts` (the mock has URL options and `mock.*` hooks for those). Time things with a `MutationObserver`, not `setTimeout` polling (background timers are throttled to ~1 s).

### Release

- Release only when the plugin zip changes (`src/` → `dist/`, `main.py`, `plugin.json`, `package.json`). Docs-only changes don't need one: every release pings users who check for updates.
- Bump `package.json` (the build injects it as `PLUGIN_VERSION`), add `## X.Y.Z` to `RELEASE_NOTES.md` and `CHANGELOG.md`, then push tag `vX.Y.Z` only after CI passes.
- If the release workflow fails after the tag is pushed, fix it and release the next version; never move a published tag.
- Release notes (`RELEASE_NOTES.md`, used as the release body): cover everything since the previous tag as it ends up, grouped under **New**, **Changed** and **Fixed** (omit empty groups), in plain language a Steam Deck user understands. Keep internal-only work to an optional short **Under the hood** list, and end with **Try it on your Deck** when the release touches UI, controls or installing.
