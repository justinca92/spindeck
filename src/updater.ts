// In-panel update: "Check for updates" asks GitHub's public API for the latest
// release, only when the user presses it (never on its own). "Update to vX"
// hands the release zip to Decky's own installer, which asks once to confirm
// and replaces the plugin in place. The backend's prepare_update marks the
// next uninstall as part of an update, so the user's settings are kept.
import { callable } from "@decky/api";
import { useSyncExternalStore } from "react";
import { PLUGIN_VERSION } from "./links";
import { debug } from "./log";

const RELEASES_API = "https://api.github.com/repos/justinca92/spindeck/releases/latest";
/** Pre-release channel: the recent releases, pre-releases included (GitHub's "latest" never is one). */
const RELEASES_LIST_API = "https://api.github.com/repos/justinca92/spindeck/releases?per_page=20";
/** The only place an update zip may come from. */
const DOWNLOAD_PREFIX = "https://github.com/justinca92/spindeck/releases/download/";
/** Decky's InstallType.UPDATE (0 install, 1 reinstall, 2 update). */
const INSTALL_TYPE_UPDATE = 2;

export type UpdateChannel = "stable" | "prerelease";
export type UpdateInfo = { version: string; url: string; hash: string; page: string };
export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "latest"; version: string }
  | { kind: "available"; info: UpdateInfo }
  | { kind: "error" };

let state: UpdateState = { kind: "idle" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * true if version a is newer than b: "1.10.0" > "1.9.2", and a release is newer
 * than its own pre-releases ("1.5.0" > "1.5.0-rc.2" > "1.5.0-rc.1"), so someone
 * on a pre-release is offered the stable version once it's out.
 */
export function newer(a: string, b: string) {
  const parse = (v: string) => {
    const [core, pre = ""] = v.split("-", 2);
    return { core: core.split(".").map((n) => parseInt(n, 10) || 0), pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.core.length, pb.core.length); i++) {
    const d = (pa.core[i] ?? 0) - (pb.core[i] ?? 0);
    if (d) return d > 0;
  }
  if (!pa.pre || !pb.pre) return !pa.pre && !!pb.pre;
  // Both pre-releases of the same version: "rc.10" > "rc.9".
  return pa.pre.localeCompare(pb.pre, "en", { numeric: true }) > 0;
}

/** One GitHub release as an update, or null if it has no plugin zip. */
function toInfo(rel: any): UpdateInfo | null {
  const version = String(rel?.tag_name ?? "").replace(/^v/i, "");
  const asset = (rel?.assets ?? []).find((a: any) => /^spindeck-.*\.zip$/i.test(String(a?.name ?? "")));
  if (!version || !asset?.browser_download_url) return null;
  // GitHub reports each asset's digest ("sha256:…"); Decky verifies the zip against it.
  const hash = /^sha256:([0-9a-f]{64})$/i.exec(String(asset.digest ?? ""))?.[1] ?? "";
  return { version, url: asset.browser_download_url, hash, page: String(rel.html_url ?? "") };
}

/**
 * The newer release, "latest" if we're up to date, or null if the check failed.
 * Stable: GitHub's latest release. Pre-release: the newest of the recent releases,
 * pre-releases included, so it moves on to the stable version once that's out.
 */
async function checkForUpdate(channel: UpdateChannel): Promise<UpdateInfo | "latest" | null> {
  try {
    const res = await fetch(channel === "prerelease" ? RELEASES_LIST_API : RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) {
      debug("update", "check failed", res.status);
      return null;
    }
    const body: any = await res.json();
    const releases: any[] = channel === "prerelease" ? (Array.isArray(body) ? body : []) : [body];
    let best: UpdateInfo | null = null;
    for (const rel of releases) {
      if (rel?.draft) continue;
      const info = toInfo(rel);
      if (info && (!best || newer(info.version, best.version))) best = info;
    }
    if (!best) return null;
    if (!newer(best.version, PLUGIN_VERSION)) return "latest";
    debug("update", "newer release", best, "running", PLUGIN_VERSION, channel);
    return best;
  } catch (e) {
    debug("update", "check error", e);
    return null;
  }
}

const prepareUpdate = callable<[], boolean>("prepare_update");

/** Ask Decky to install the release over us. false → this Decky can't do it from here. */
export async function startUpdate(info: UpdateInfo): Promise<boolean> {
  // Decky skips its sha256 check when the hash is empty: without GitHub's digest
  // (or from anywhere but this repo's releases) the zip must be installed by hand.
  if (!info.hash || !info.url.startsWith(DOWNLOAD_PREFIX)) {
    debug("update", "no digest or unexpected download URL: manual install only", info);
    return false;
  }
  const backend = (window as any).DeckyBackend;
  if (typeof backend?.call !== "function") {
    debug("update", "Decky's installer isn't reachable from here");
    return false;
  }
  try {
    await prepareUpdate();
  } catch (e) {
    debug("update", "prepare failed", e);
  }
  try {
    await backend.call("utilities/install_plugin", info.url, "Spindeck", info.version, info.hash, INSTALL_TYPE_UPDATE);
    return true;
  } catch (e) {
    debug("update", "install request failed", e);
    return false;
  }
}

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export const useUpdateCheck = (): UpdateState => useSyncExternalStore(subscribe, () => state);

/** Forget the last check (e.g. the channel changed, so its answer no longer applies). */
export function resetUpdateCheck() {
  if (state.kind === "checking") return;
  state = { kind: "idle" };
  emit();
}

export async function checkNow(channel: UpdateChannel = "stable") {
  if (state.kind === "checking") return;
  state = { kind: "checking" };
  emit();
  const r = await checkForUpdate(channel);
  state = r === null ? { kind: "error" } : r === "latest" ? { kind: "latest", version: PLUGIN_VERSION } : { kind: "available", info: r };
  emit();
}
