---
name: update-dependencies
description: Bring every Spindeck dependency up to date in one change - the npm dev tools in package.json and the SHA-pinned GitHub Actions in .github/workflows. Use when asked to update, upgrade or bump packages or dependencies, when a Dependabot PR needs folding in or fails CI, or to check nothing is behind.
---

# Keeping Spindeck's dependencies current

Three places pin versions. Update them together so a release never ships half-updated:

| Where | Check | Update |
| --- | --- | --- |
| `package.json` (`devDependencies`; no lockfile, CI fetches `typescript` at this range with `npx -p`) | `npm outdated` or `npm view <pkg> version` | edit the range, keep the `^x.y.z` style |
| `devtools/mock/package.json` + `package-lock.json` (the mock and Playwright) | `npm outdated --prefix devtools/mock` | `npm install <pkg>@latest --prefix devtools/mock`; `react` and `react-dom` on the exact same version |
| `.github/workflows/*.yml` (commit SHA plus a `# vX.Y.Z` comment) | `gh api repos/<owner>/<action>/releases/latest --jq .tag_name` per action | replace both the SHA and the comment |

Dependabot (`.github/dependabot.yml`) opens weekly PRs for all three. When one is open, fold its bump into this run and close it rather than merging it separately.

## Steps

1. Work on a topic branch, never on `main`.
2. Run both checks. If nothing is outdated, stop and say so.
3. Update. Rules:
   - Latest stable only: no beta / rc / dev / nightly.
   - For an Action, pin the commit the release tag points at, never a branch: `gh api repos/<owner>/<action>/git/ref/tags/<tag> --jq '.object.type+" "+.object.sha'`; if the type is `tag` (annotated), follow it with `gh api repos/<owner>/<action>/git/tags/<sha> --jq .object.sha`. Update the same action everywhere it's used.
   - A **major** bump: read the release notes for every major in between before running anything (`gh api repos/<o>/<r>/releases/tags/vN.0.0 --jq .body`), grep the repo for any removed or renamed API / input, and say what changed and why the code still fits.
   - If one update breaks something you can't fix cleanly, leave that one on its last working version, finish the rest, and report it as held back with the reason.
4. Verify - the commands in [AGENTS.md](../../../AGENTS.md#commands) must pass:
   - `npm run typecheck`, `npm run test:unit`, `npm run test:backend`
   - `bun build/build.ts`
   - `npm run test:e2e` (after a Playwright update: `npx playwright install chromium` in `devtools/mock` first)
5. Version: `typescript` and the mock's packages never reach the zip, so a dev-tool or Actions-only update doesn't change `dist/` and needs no version bump or release.
6. Report each package / action with its old and new version, majors marked, plus anything held back. Commit only when asked, e.g. `Build: TypeScript 5.6 → 7.0` and `Release workflow: checkout v4 → v7 (Node 24)`.
