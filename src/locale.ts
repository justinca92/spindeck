// UI language: Korean when Steam's UI language is Korean ("koreana"),
// English otherwise — or forced by the "Language" setting. Also decides
// whether the Hangul keypad is offered.
import { useEffect, useState } from "react";
import { getSettings, useSettings } from "./settings";

export type Lang = "ko" | "en";
export type LangSetting = "auto" | Lang;

/** What Steam says, and where it came from (shown in the panel). */
export const detected = { lang: "en" as Lang, raw: "?", source: "none" };

function setDetected(raw: string, source: string) {
  detected.raw = raw;
  detected.source = source;
  detected.lang = /^(koreana|ko)/i.test(raw) ? "ko" : "en";
}

function syncGuess() {
  const w: any = globalThis as any;
  const locs: string[] | undefined = w.LocalizationManager?.m_rgLocalesToUse;
  if (Array.isArray(locs) && locs.length) return setDetected(String(locs[0]), "Steam");
  const htmlLang = w.document?.documentElement?.lang;
  if (htmlLang) return setDetected(String(htmlLang), "page");
  const nav = w.navigator?.language;
  if (nav) return setDetected(String(nav), "system");
}
syncGuess();

const listeners = new Set<() => void>();
let asked = false;
function askSteam() {
  if (asked) return;
  asked = true;
  try {
    // Steam's own UI language setting is the most reliable source.
    const p = (globalThis as any).SteamClient?.Settings?.GetCurrentLanguage?.();
    Promise.resolve(p)
      .then((lang: any) => {
        if (typeof lang !== "string" || !lang) return;
        setDetected(lang, "Steam");
        listeners.forEach((l) => l());
      })
      .catch(() => {});
  } catch {
    /* keep the guess */
  }
}

const resolve = (pref: LangSetting | undefined): Lang => (pref === "ko" || pref === "en" ? pref : detected.lang);

export function getLang(): Lang {
  askSteam();
  return resolve(getSettings().language);
}

export function useLang(): Lang {
  const s = useSettings();
  const [, bump] = useState(0);
  useEffect(() => {
    askSteam();
    const l = () => bump((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return resolve(s.language);
}

export const useKoreanLocale = () => useLang() === "ko";
