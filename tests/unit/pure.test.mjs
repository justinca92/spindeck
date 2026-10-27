import { test } from "node:test";
import assert from "node:assert/strict";
import { crossedMilestone } from "../../src/odometer.ts";
import { composeHangul, indexLetter } from "../../src/hangul.ts";
import { levelToDb } from "../../src/haptics.ts";

test("odometer: the highest milestone crossed, or null", () => {
  assert.equal(crossedMilestone(24.9, 25), 25);
  assert.equal(crossedMilestone(25, 30), null, "already past 25");
  assert.equal(crossedMilestone(90, 600), 500, "two crossed at once → the highest");
  assert.equal(crossedMilestone(0, 10), null);
});

test("hangul: loose jamo compose into syllables", () => {
  assert.equal(composeHangul("ㅅㅡㅌㅣㅁㄷㅔㄱ"), "스팀덱");
  assert.equal(composeHangul("스ㅌㅣㅁ"), "스팀", "a half-composed mix recomposes");
  assert.equal(composeHangul("Deck 1"), "Deck 1", "non-Hangul text is untouched");
});

test("indexLetter: A–Z, Hangul initial consonant, other letters, '#'", () => {
  assert.equal(indexLetter("portal 2"), "P");
  assert.equal(indexLetter("  zelda"), "Z", "leading spaces ignored");
  assert.equal(indexLetter("스팀덱"), "ㅅ");
  assert.equal(indexLetter("까마귀"), "ㄲ");
  assert.equal(indexLetter("Élan"), "É");
  assert.equal(indexLetter("7 Days"), "#");
  assert.equal(indexLetter(""), "#");
});

test("haptics: strength level → dB gain, clamped to 1–9", () => {
  assert.equal(levelToDb(1), -24);
  assert.equal(levelToDb(5), -12, "Steam's radial-menu strength");
  assert.equal(levelToDb(9), 0);
  assert.equal(levelToDb(0), -24);
  assert.equal(levelToDb(42), 0);
});
