import { describe, expect, it } from "bun:test";
import {
  ceilTo,
  clamp,
  coerceToFiniteNumber,
  floorTo,
  isNumber,
  isNumericString,
  parseAllNumbersFromString,
  parseNumberFromString,
  roundTo,
  safeParseFloat,
  safeParseInt,
  toFixedNumber,
} from "./type.utils.js";

describe("type.utils - type checking", () => {
  describe("isNumber", () => {
    it("returns true for valid numbers", () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-5)).toBe(true);
    });

    it("returns false for invalid values", () => {
      expect(isNumber("42")).toBe(false);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe("isNumericString", () => {
    it("returns true for numeric strings", () => {
      expect(isNumericString("42")).toBe(true);
      expect(isNumericString("-3.14")).toBe(true);
      expect(isNumericString("+5")).toBe(true);
      expect(isNumericString("1.5e2")).toBe(true);
      expect(isNumericString("1.5e-2")).toBe(true);
      expect(isNumericString("  123  ")).toBe(true);
    });

    it("returns false for non-numeric strings", () => {
      expect(isNumericString("abc")).toBe(false);
      expect(isNumericString("12abc")).toBe(false);
      expect(isNumericString("")).toBe(false);
      expect(isNumericString("  ")).toBe(false);
    });
  });
});

describe("type.utils - parsing", () => {
  describe("parseNumberFromString", () => {
    it("extracts first number from string", () => {
      expect(parseNumberFromString("42")).toBe(42);
      expect(parseNumberFromString("-3.14")).toBe(-3.14);
      expect(parseNumberFromString("prefix 123 suffix")).toBe(123);
      expect(parseNumberFromString("1.5e2")).toBe(150);
    });

    it("returns null for invalid input", () => {
      expect(parseNumberFromString("abc")).toBe(null);
      expect(parseNumberFromString("")).toBe(null);
      expect(parseNumberFromString("  ")).toBe(null);
    });
  });

  describe("parseAllNumbersFromString", () => {
    it("extracts all numbers from string", () => {
      expect(parseAllNumbersFromString("1 2 3")).toEqual([1, 2, 3]);
      expect(parseAllNumbersFromString("10.5 -20 3.14")).toEqual([10.5, -20, 3.14]);
    });

    it("returns empty array for invalid input", () => {
      expect(parseAllNumbersFromString("abc")).toEqual([]);
      expect(parseAllNumbersFromString("")).toEqual([]);
      expect(parseAllNumbersFromString("  ")).toEqual([]);
    });

    it("filters out non-finite numbers", () => {
      const result = parseAllNumbersFromString("1 2 3");
      expect(result.every((n: number) => Number.isFinite(n))).toBe(true);
    });
  });
});

describe("type.utils - safe parsing (float)", () => {
  describe("safeParseFloat", () => {
    it("parses numbers correctly", () => {
      expect(safeParseFloat(42)).toBe(42);
      expect(safeParseFloat(3.14)).toBe(3.14);
    });

    it("parses string numbers", () => {
      expect(safeParseFloat("42")).toBe(42);
      expect(safeParseFloat("-3.14")).toBe(-3.14);
      expect(safeParseFloat("  5.5  ")).toBe(5.5);
    });

    it("returns fallback for invalid input", () => {
      expect(safeParseFloat("abc")).toBe(0);
      expect(safeParseFloat("abc", 99)).toBe(99);
      expect(safeParseFloat(null)).toBe(0);
      expect(safeParseFloat(undefined)).toBe(0);
      expect(safeParseFloat(NaN)).toBe(0);
    });
  });
});

describe("type.utils - safe parsing (int and coerce)", () => {
  describe("safeParseInt", () => {
    it("parses integers correctly", () => {
      expect(safeParseInt(42)).toBe(42);
      expect(safeParseInt(-5)).toBe(-5);
    });

    it("truncates floats", () => {
      expect(safeParseInt(3.99)).toBe(3);
      expect(safeParseInt(-3.99)).toBe(-3);
    });

    it("parses string integers", () => {
      expect(safeParseInt("42")).toBe(42);
      expect(safeParseInt("-5")).toBe(-5);
    });

    it("supports radix parameter", () => {
      expect(safeParseInt("10", 0, 2)).toBe(2);
      expect(safeParseInt("20", 0, 16)).toBe(32);
    });

    it("returns fallback for invalid input", () => {
      expect(safeParseInt("abc")).toBe(0);
      expect(safeParseInt("abc", 99)).toBe(99);
      expect(safeParseInt(undefined)).toBe(0);
    });
  });

  describe("coerceToFiniteNumber", () => {
    it("coerces values to finite numbers", () => {
      expect(coerceToFiniteNumber(42)).toBe(42);
      expect(coerceToFiniteNumber("42")).toBe(42);
    });

    it("returns fallback for infinite or NaN", () => {
      expect(coerceToFiniteNumber(NaN)).toBe(0);
      expect(coerceToFiniteNumber(Infinity)).toBe(0);
      expect(coerceToFiniteNumber(NaN, 99)).toBe(99);
    });
  });
});

describe("type.utils - utilities (clamp and rounding)", () => {
  describe("clamp", () => {
    it("clamps value between min and max", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("clamps with only min", () => {
      expect(clamp(5, 10)).toBe(10);
      expect(clamp(15, 10)).toBe(15);
    });

    it("clamps with only max", () => {
      expect(clamp(5, undefined, 10)).toBe(5);
      expect(clamp(15, undefined, 10)).toBe(10);
    });
  });

  describe("roundTo", () => {
    it("rounds to specified decimals", () => {
      expect(roundTo(3.14159, 2)).toBe(3.14);
      expect(roundTo(3.14159, 0)).toBe(3);
      expect(roundTo(3.5)).toBe(4);
    });

    it("returns value for non-finite inputs", () => {
      expect(roundTo(NaN, 2)).toBe(NaN);
      expect(roundTo(Infinity, 2)).toBe(Infinity);
      expect(roundTo(3.14, NaN)).toBe(3.14);
    });
  });

  describe("floorTo", () => {
    it("floors to specified decimals", () => {
      expect(floorTo(3.14159, 2)).toBe(3.14);
      expect(floorTo(3.99, 0)).toBe(3);
      expect(floorTo(-3.1, 0)).toBe(-4);
    });
  });

  describe("ceilTo", () => {
    it("ceils to specified decimals", () => {
      expect(ceilTo(3.14159, 2)).toBe(3.15);
      expect(ceilTo(3.01, 0)).toBe(4);
      expect(ceilTo(-3.9, 0)).toBe(-3);
    });
  });
});

describe("type.utils - formatting", () => {
  describe("toFixedNumber", () => {
    it("converts to fixed decimal number", () => {
      expect(toFixedNumber(3.14159, 2)).toBe(3.14);
      expect(toFixedNumber("3.14159", 2)).toBe(3.14);
      expect(toFixedNumber(null, 2)).toBe(0);
    });

    it("uses fallback for invalid input", () => {
      expect(toFixedNumber("abc", 2, 99)).toBe(99);
      expect(toFixedNumber(undefined, 2, 42)).toBe(42);
    });
  });
});
