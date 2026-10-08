# Dev tests (not shipped)

Live tests that run the built plugin (`dist/index.js`) with real React in headless Chromium,
using stubbed Decky/Steam globals (`entry.js`).

    bun build tests/entry.js --outdir tests/out --format esm --define 'process.env.NODE_ENV="production"'
    cp dist/index.js tests/out/plugin.js   # + an index.html loading entry.js, and optional hero/cap PNGs
    node tests/flow.mjs   # screen switching, Ⓑ, held ▲, wheel ▲ → search
    node tests/stab.mjs   # unload cleanup (without React unmount), crash fallback, unknown layout
    node tests/band.mjs   # top band: Steam bar + tab row, survives React rewrites
    node tests/jank.mjs   # no scroll fighting / style churn while Steam scrolls
    python3 tests/py/t.py # backend: missing/corrupt/non-dict settings, uninstall
    node tests/sgdb.mjs   # another plugin (SteamGridDB) patching the home route first or last: no React #130
    node tests/bottomshot.mjs # bottom layout: custom text just below the hero art away from the wheel, Ⓨ pill right under it (PNG in out/)
    node tests/heropos.mjs  # side layout: hero art v1.3.0 style on/off; the switch shows only for the side layout
    node tests/perf.mjs   # 40 fast D-pad steps: CPU time, hero mounts, style writes

Paths to React/Playwright point at this dev machine's tool installs; adjust as needed.
Typecheck (offline stubs in `typecheck/`):  `npm run typecheck`
