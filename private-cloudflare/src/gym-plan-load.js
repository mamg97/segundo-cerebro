// The Gym plan is read from a Spanish-locale Google Sheet. Its formatted
// numeric cells may use a decimal comma (e.g. "22,5"). Keep this parser
// scoped to Gym; financial amounts and canonical source values are untouched.
export function parseGymPlanLoadValue(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = /^[+-]?\d+,\d+$/.test(raw) ? raw.replace(",", ".") : raw;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
