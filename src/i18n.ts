import { type Lang, useLang } from "./locale";
import { de } from "./lang/de";
import { en } from "./lang/en";
import { es } from "./lang/es";
import { fr } from "./lang/fr";
import { ja } from "./lang/ja";
import { ko } from "./lang/ko";
import { pt } from "./lang/pt";
import { ru } from "./lang/ru";
import { uk } from "./lang/uk";
import { zh } from "./lang/zh";

// Every language lives in src/lang/. Korean is the source: `Strings` is its type,
// so each translation must have exactly its keys (tsc checks).
export type Strings = typeof ko;
export const STRINGS: Record<Lang, Strings> = { ko, en, de, fr, es, pt, ru, uk, ja, zh };
export const useT = (): Strings => STRINGS[useLang()];
