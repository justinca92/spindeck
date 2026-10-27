// UI language: Steam's own UI language when Spindeck has it (see LANGS),
// English otherwise — or forced by the "Language" setting. Also decides
// whether the Hangul keypad is offered (Korean only).
import { useSyncExternalStore } from "react";
import { getSettings, useSettings } from "./settings";

export type Lang = "en" | "ko" | "de" | "fr" | "es" | "pt" | "ru" | "uk" | "ja" | "zh";

/** Each language: its own name (for the picker) and the Steam / BCP 47 names it covers. */
export const LANGS: { lang: Lang; name: string; match: RegExp }[] = [
  { lang: "en", name: "English", match: /^en/i },
  { lang: "ko", name: "한국어", match: /^(koreana|ko)/i },
  { lang: "de", name: "Deutsch", match: /^(german|de)/i },
  { lang: "fr", name: "Français", match: /^(french|fr)/i },
  { lang: "es", name: "Español", match: /^(spanish|latam|es)/i },
  { lang: "pt", name: "Português (Brasil)", match: /^(brazilian|portuguese|pt)/i },
  { lang: "ru", name: "Русский", match: /^(russian|ru)/i },
  { lang: "uk", name: "Українська", match: /^(ukrainian|uk)/i },
  { lang: "ja", name: "日本語", match: /^(japanese|ja)/i },
  { lang: "zh", name: "简体中文", match: /^(schinese|tchinese|zh)/i },
];

/** Steam's language name ("koreana", "brazilian", …) or a code ("pt-BR") → our language, English if we don't have it. */
export const langFor = (raw: string): Lang => LANGS.find((l) => l.match.test(raw))?.lang ?? "en";
export type LangSetting = "auto" | Lang;

/** What Steam says, and where it came from (shown in the panel). */
export const detected = { lang: "en" as Lang, raw: "?", source: "none" };

function setDetected(raw: string, source: string) {
  detected.raw = raw;
  detected.source = source;
  detected.lang = langFor(raw);
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

const resolve = (pref: LangSetting | undefined): Lang => (LANGS.some((l) => l.lang === pref) ? (pref as Lang) : detected.lang);

export function getLang(): Lang {
  askSteam();
  return resolve(getSettings().language);
}

const subscribe = (l: () => void) => (askSteam(), listeners.add(l), () => void listeners.delete(l));
export function useLang(): Lang {
  const s = useSettings();
  useSyncExternalStore(subscribe, () => detected.raw); // re-render when Steam reports its language
  return resolve(s.language);
}
