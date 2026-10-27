import { test } from "node:test";
import assert from "node:assert/strict";
import { STRINGS } from "../../src/i18n.ts";
import { LANGS, langFor } from "../../src/locale.ts";
import { hours, slavic } from "../../src/lang/format.ts";

test("Steam's language names map to our translations; anything else is English", () => {
  const cases = { koreana: "ko", english: "en", german: "de", french: "fr", spanish: "es", latam: "es", brazilian: "pt", portuguese: "pt", russian: "ru", ukrainian: "uk", japanese: "ja", schinese: "zh", tchinese: "zh", "pt-BR": "pt", "de-DE": "de", polish: "en", "": "en" };
  for (const [raw, lang] of Object.entries(cases)) assert.equal(langFor(raw), lang, raw);
});

test("every language in the picker has a translation, and the other way round", () => {
  assert.deepEqual(LANGS.map((l) => l.lang).sort(), Object.keys(STRINGS).sort());
});

// Plausible values for every string function (argument names as in the Korean source).
const SAMPLE = { f: "Bottom text", n: 3, db: -12, v: "1.5.0", cur: "1.4.1", min: 754, days: 9, g: "Celeste" };
const argsFor = (fn) => (fn.toString().match(/^\(([^)]*)\)/)?.[1] ?? "").split(",").map((a) => a.trim().split(/[:=\s]/)[0]).filter(Boolean).map((a) => SAMPLE[a]);

test("every string renders: no empty text, no 'undefined', placeholders kept", () => {
  for (const [lang, s] of Object.entries(STRINGS)) {
    for (const [key, value] of Object.entries(s)) {
      const out = typeof value === "function" ? value(...argsFor(value)) : value;
      for (const text of [out].flat()) {
        assert.equal(typeof text, "string", `${lang}.${key}`);
        assert.ok(text.trim().length > 0, `${lang}.${key} is empty`);
        assert.ok(!/undefined|NaN/.test(text), `${lang}.${key}: ${text}`);
      }
    }
    assert.ok(s.letterCount.includes("{n}"), `${lang}.letterCount keeps {n}`);
    assert.equal(s.colors.length, STRINGS.en.colors.length, `${lang}.colors`);
    for (const days of [0, 1, 3, 14, 60, 800]) assert.ok(s.lastPlayed(days), `${lang}.lastPlayed(${days})`);
    for (const min of [0, 5, 60, 6000]) assert.ok(s.playtime(min) && s.playtimeShort(min), `${lang}.playtime(${min})`);
  }
});

test("hours: one decimal under 100 h, comma where the language uses one", () => {
  assert.equal(hours(95), "1.6");
  assert.equal(hours(95, true), "1,6");
  assert.equal(hours(6000), "100");
  assert.equal(hours(60), "1");
});

test("Russian / Ukrainian plurals", () => {
  const f = (n) => slavic(n, "игра", "игры", "игр");
  assert.deepEqual([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map(f), ["игра", "игры", "игры", "игр", "игр", "игр", "игр", "игра", "игры", "игр", "игра", "игр"]);
  assert.equal(STRINGS.ru.lastPlayed(3), "3 ДНЯ НАЗАД");
  assert.equal(STRINGS.uk.lastPlayed(5), "5 ДНІВ ТОМУ");
});
