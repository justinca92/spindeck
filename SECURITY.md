# Security policy

## Supported versions

Only the [latest release](https://github.com/justinca92/spindeck/releases/latest) gets security fixes. Update from the panel (**Check for updates**) or install the newest zip. Pre-releases (`vX.Y.Z-rc.N`, offered on the panel's **Pre-release** update channel) are for testing: fixes land in the next pre-release or release.

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Report it privately through GitHub instead: [Report a vulnerability](https://github.com/justinca92/spindeck/security/advisories/new) (repository → **Security** → **Report a vulnerability**).

Include what you found, the Spindeck, SteamOS and Decky Loader versions, and the steps to reproduce it. Spindeck is maintained by one person in their spare time: you'll get a reply as soon as possible, and a fix is released as a new version, with credit in the release notes if you'd like.

## What Spindeck does, and doesn't do

These are the boundaries a report would be measured against:

- **Network:** the only request Spindeck makes is to GitHub's public releases API, and only when you press **Check for updates**. There's no telemetry, no analytics and nothing in the background.
- **Updates:** the panel installs only a release zip from `github.com/justinca92/spindeck/releases`, and only with GitHub's sha256 digest. Decky checks the zip against that digest and asks you to confirm. Without a digest the panel refuses and points you to a manual install.
- **Files:** the Python backend reads and writes one settings file in Decky's settings folder (plus a short-lived update marker). It never touches Steam's files, controller layouts or other plugins, and uninstalling removes its settings.
- **Steam's UI:** like every Decky plugin, Spindeck runs inside Steam's UI with Steam's permissions. It only reads the library, friends and controller state it shows, and undoes every change it makes to Steam's UI when it's turned off or removed.
- **Releases:** releases are built by GitHub Actions from a tag. Actions are pinned to commit SHAs, and only the final publish step can write to the repository.

## Out of scope

- Problems that need someone who already controls your Deck (Desktop Mode, SSH, or a malicious plugin running alongside Spindeck).
- Vulnerabilities in Steam, SteamOS or Decky Loader themselves. Please report those to Valve or the [Decky Loader project](https://github.com/SteamDeckHomebrew/decky-loader).
- The dev tools in `devtools/` and `tests/`, which aren't shipped. Reports about them are still welcome as normal issues.
