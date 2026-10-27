// Number formatting shared by the translations.

/** 95 min → "1.6", 754 min → "12.6", 6000 min → "100" ("1,6" with `comma`). */
export function hours(min: number, comma = false): string {
  const h = min / 60;
  const s = h >= 100 ? String(Math.round(h)) : (Math.round(h * 10) / 10).toString();
  return comma ? s.replace(".", ",") : s;
}

/** Russian / Ukrainian plural form: 1 игра, 2 игры, 5 игр (11–14 → many). */
export function slavic(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}
