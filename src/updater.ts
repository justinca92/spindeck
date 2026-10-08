// In-panel update: "Check for updates" asks GitHub's public API for the latest
// release, only when the user presses it (never on its own). "Update to vX"
// hands the release zip to Decky's own installer, which asks once to confirm
// and replaces the plugin in place. The backend's prepare_update marks the
// next uninstall as part of an update, so the user's settings are kept.
import { callable } from "@decky/api";
import { useEffect, useState } from "react";
import { PLUGIN_VERSION } from "./links";
import { debug } from "./log";

const RELEASES_API = "https://api.github.com/repos/justinca92/spindeck/releases/latest";
/** Decky's InstallType.UPDATE (0 install, 1 reinstall, 2 update). */
const INSTALL_TYPE_UPDATE = 2;

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

/** true if version a is newer than b ("1.10.0" > "1.9.2"). */
function newer(a: string, b: string) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

/** The newer release, "latest" if we're up to date, or null if the check failed. */
async function checkForUpdate(): Promise<UpdateInfo | "latest" | null> {
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) {
      debug("update", "check failed", res.status);
      return null;
    }
    const rel: any = await res.json();
    const version = String(rel?.tag_name ?? "").replace(/^v/i, "");
    const asset = (rel?.assets ?? []).find((a: any) => /^spindeck-.*\.zip$/i.test(String(a?.name ?? "")));
    if (!version || !asset?.browser_download_url) return null;
    if (!newer(version, PLUGIN_VERSION)) return "latest";
    // GitHub reports each asset's digest ("sha256:…"); Decky verifies the zip against it.
    const hash = /^sha256:([0-9a-f]{64})$/i.exec(String(asset.digest ?? ""))?.[1] ?? "";
    const info = { version, url: asset.browser_download_url, hash, page: String(rel.html_url ?? "") };
    debug("update", "newer release", info, "running", PLUGIN_VERSION);
    return info;
  } catch (e) {
    debug("update", "check error", e);
    return null;
  }
}

const prepareUpdate = callable<[], boolean>("prepare_update");

/** Ask Decky to install the release over us. false → this Decky can't do it from here. */
export async function startUpdate(info: UpdateInfo): Promise<boolean> {
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

export function useUpdateCheck(): UpdateState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

export async function checkNow() {
  if (state.kind === "checking") return;
  state = { kind: "checking" };
  emit();
  const r = await checkForUpdate();
  state = r === null ? { kind: "error" } : r === "latest" ? { kind: "latest", version: PLUGIN_VERSION } : { kind: "available", info: r };
  emit();
}
