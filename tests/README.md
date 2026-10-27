# Dev tests (not shipped)

| Suite | Where | Run |
| --- | --- | --- |
| Unit: settings migrations, updater (version order, channels, digest / URL checks), library loading, trackpad circle, haptics lookup, i18n, Hangul, odometer | `tests/unit/` | `npm run test:unit` (Node 24+, nothing to install) |
| Backend: settings file, update marker, uninstall | `tests/py/t.py` | `npm run test:backend` |
| Smoke, E2E and regressions: the real plugin and `main.py` in a browser mock | `devtools/mock/e2e/` | `npm run test:e2e`, see [devtools/mock/README.md](../devtools/mock/README.md) |

CI runs all three on every push and PR.

The browser regressions in `devtools/mock/e2e/regressions.spec.ts` and `home.spec.ts` replace the old `tests/*.mjs` scripts, which only ran on one machine:
- SteamGridDB's home patch in either load order (#2), and a rival plugin that also keeps its patch last
- unloading without React unmounting
- a crash falling back to Steam's home
- an unknown home layout
- wheel ⇄ sections, Ⓑ and held ▲
- the top band, including after Steam re-renders its home
- smooth scrolling not being fought
