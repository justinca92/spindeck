// Compose loose Hangul jamo into syllables (스ㅌㅣㅁㄷㅔㄱ → 스팀덱).
// Steam's on-screen keyboard sometimes delivers raw compatibility jamo to
// plugin text fields instead of composed syllables; this repairs the text.
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
const V2: Record<string, string> = { ㅗㅏ: "ㅘ", ㅗㅐ: "ㅙ", ㅗㅣ: "ㅚ", ㅜㅓ: "ㅝ", ㅜㅔ: "ㅞ", ㅜㅣ: "ㅟ", ㅡㅣ: "ㅢ" };
const C2: Record<string, string> = {
  ㄱㅅ: "ㄳ", ㄴㅈ: "ㄵ", ㄴㅎ: "ㄶ", ㄹㄱ: "ㄺ", ㄹㅁ: "ㄻ", ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ", ㄹㅌ: "ㄾ", ㄹㅍ: "ㄿ", ㄹㅎ: "ㅀ", ㅂㅅ: "ㅄ",
};
const C2_SPLIT: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(C2).map(([k, v]) => [v, [k[0], k[1]] as [string, string]]),
);
const isCons = (c: string) => CHO.includes(c) || (JONG.includes(c) && c !== " ");
const isVowel = (c: string) => JUNG.includes(c);

/** Split composed syllables back into jamo so a mix like "스ㅌㅣ" recomposes cleanly. */
function decompose(s: string) {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    const jong = code % 28;
    const jung = ((code - jong) / 28) % 21;
    const cho = Math.floor(code / 588);
    out += CHO[cho] + JUNG[jung];
    if (jong) out += C2_SPLIT[JONG[jong]]?.join("") ?? JONG[jong];
  }
  return out;
}

/**
 * Map conjoining jamo (U+1100 block, which most UI fonts can't draw → shown as
 * boxes) to the compatibility jamo the composer works with. Same orders.
 */
function toCompat(s: string) {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 0x1100 && c <= 0x1112) out += CHO[c - 0x1100];
    else if (c >= 0x1161 && c <= 0x1175) out += JUNG[c - 0x1161];
    else if (c >= 0x11a8 && c <= 0x11c2) out += JONG[c - 0x11a8 + 1];
    else out += ch;
  }
  return out;
}

export function composeHangul(raw: string): string {
  const input = toCompat(raw);
  if (!/[ㄱ-ㅣ]/.test(input)) return input; // nothing loose to fix
  const s = decompose(input);
  let out = "";
  let cho = "", jung = "", jong = "";
  const flush = () => {
    if (cho && jung) {
      out += String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + Math.max(0, JONG.indexOf(jong || " ")));
    } else out += cho + jung + jong;
    cho = jung = jong = "";
  };
  for (const c of s) {
    if (isCons(c)) {
      if (cho && jung && !jong && JONG.includes(c)) jong = c;
      else if (jong && C2[jong + c]) jong = C2[jong + c];
      else {
        flush();
        if (CHO.includes(c)) cho = c;
        else out += c;
      }
    } else if (isVowel(c)) {
      if (cho && !jung) jung = c;
      else if (jung && !jong && V2[jung + c]) jung = V2[jung + c];
      else if (jong) {
        // the final consonant moves to start the next syllable
        const split = C2_SPLIT[jong];
        const moved = split ? split[1] : jong;
        jong = split ? split[0] : "";
        flush();
        cho = moved;
        jung = c;
      } else {
        flush();
        out += c;
      }
    } else {
      flush();
      out += c;
    }
  }
  flush();
  return out;
}

/** Text → editable jamo sequence (one entry per keypress), for backspacing jamo by jamo. */
export function toJamo(s: string): string {
  return decompose(toCompat(s));
}
