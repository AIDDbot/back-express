/**
 * Utilities to safely parse, coerce and manipulate numbers from unknown values.
 * Aim: be resilient when values come from environment variables, databases,
 * or external input (strings, objects, bigints, etc.).
 */

export const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const isNumericString = (s: string): boolean =>
  typeof s === "string" && /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/u.test(s.trim());

export const parseNumberFromString = (input: string): number | null => {
  if (typeof input !== "string" || input.trim() === "") return null;
  const match = input.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/u);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
};

export const parseAllNumbersFromString = (input: string): number[] => {
  if (typeof input !== "string" || input.trim() === "") return [];
  const matches = input.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/gu) ?? [];
  return matches.map((m) => Number(m)).filter(Number.isFinite);
};

export const safeParseFloat = (v: unknown, fallback = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") return parseStringToFloat(v, fallback);
  return fallback;
};

export const safeParseInt = (v: unknown, fallback = 0, radix = 10): number => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : fallback;
  if (typeof v === "string") return parseStringToInt(v, fallback, radix);
  return fallback;
};

const parseStringToFloat = (s: string, fallback: number): number => {
  const t = s.trim();
  if (t === "") return fallback;
  const n = Number(t);
  if (Number.isFinite(n)) return n;
  const extracted = parseNumberFromString(t);
  return extracted === null ? fallback : extracted;
};

const parseStringToInt = (s: string, fallback: number, radix: number): number => {
  const t = s.trim();
  if (t === "") return fallback;
  const match = t.match(/[-+]?\d+/u);
  if (!match) return fallback;
  const n = parseInt(match[0], radix);
  return Number.isNaN(n) ? fallback : n;
};

export const coerceToFiniteNumber = (v: unknown, fallback = 0): number => {
  const n = safeParseFloat(v, Number.NaN);
  return Number.isFinite(n) ? n : fallback;
};

export const clamp = (value: number, min?: number, max?: number): number => {
  if (typeof min === "number" && value < min) value = min;
  if (typeof max === "number" && value > max) value = max;
  return value;
};

export const roundTo = (value: number, decimals = 0): number => {
  if (!Number.isFinite(value) || !Number.isFinite(decimals)) return value;
  const factor = 10 ** Math.max(0, Math.trunc(decimals));
  return Math.round(value * factor) / factor;
};

export const floorTo = (value: number, decimals = 0): number => {
  const factor = 10 ** Math.max(0, Math.trunc(decimals));
  return Math.floor(value * factor) / factor;
};

export const ceilTo = (value: number, decimals = 0): number => {
  const factor = 10 ** Math.max(0, Math.trunc(decimals));
  return Math.ceil(value * factor) / factor;
};

export const toFixedNumber = (value: unknown, decimals = 0, fallback = 0): number => {
  const n = coerceToFiniteNumber(value, fallback);
  return roundTo(n, decimals);
};

export default {
  isNumber,
  isNumericString,
  parseNumberFromString,
  parseAllNumbersFromString,
  safeParseFloat,
  safeParseInt,
  coerceToFiniteNumber,
  clamp,
  roundTo,
  floorTo,
  ceilTo,
  toFixedNumber,
};
