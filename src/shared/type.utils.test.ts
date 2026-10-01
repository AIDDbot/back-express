import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ceilTo,
  clamp,
  coerceToFiniteNumber,
  floorTo,
  isNonEmptyString,
  isNumber,
  isNumericString,
  isRecord,
  parseAllNumbersFromString,
  parseNumberFromString,
  roundTo,
  safeParseFloat,
  safeParseInt,
  toFixedNumber,
} from "./type.utils.ts";

void describe("type.utils - value narrowing", () => {
  void it("recognizes non-null records", () => {
    assert.strictEqual(isRecord({ value: 1 }), true);
    assert.strictEqual(isRecord([]), true);
    assert.strictEqual(isRecord(null), false);
    assert.strictEqual(isRecord("value"), false);
  });

  void it("recognizes non-empty strings after trimming", () => {
    assert.strictEqual(isNonEmptyString(" value "), true);
    assert.strictEqual(isNonEmptyString(""), false);
    assert.strictEqual(isNonEmptyString("  "), false);
    assert.strictEqual(isNonEmptyString(1), false);
  });
});

void describe("type.utils - type checking", () => {
  void describe("isNumber", () => {
    void it("returns true for valid numbers", () => {
      assert.strictEqual(isNumber(42), true);
      assert.strictEqual(isNumber(3.14), true);
      assert.strictEqual(isNumber(0), true);
      assert.strictEqual(isNumber(-5), true);
    });

    void it("returns false for invalid values", () => {
      assert.strictEqual(isNumber("42"), false);
      assert.strictEqual(isNumber(NaN), false);
      assert.strictEqual(isNumber(Infinity), false);
      assert.strictEqual(isNumber(null), false);
      assert.strictEqual(isNumber(undefined), false);
    });
  });

  void describe("isNumericString", () => {
    void it("returns true for numeric strings", () => {
      assert.strictEqual(isNumericString("42"), true);
      assert.strictEqual(isNumericString("-3.14"), true);
      assert.strictEqual(isNumericString("+5"), true);
      assert.strictEqual(isNumericString("1.5e2"), true);
      assert.strictEqual(isNumericString("1.5e-2"), true);
      assert.strictEqual(isNumericString("  123  "), true);
    });

    void it("returns false for non-numeric strings", () => {
      assert.strictEqual(isNumericString("abc"), false);
      assert.strictEqual(isNumericString("12abc"), false);
      assert.strictEqual(isNumericString(""), false);
      assert.strictEqual(isNumericString("  "), false);
    });
  });
});

void describe("type.utils - parsing", () => {
  void describe("parseNumberFromString", () => {
    void it("extracts first number from string", () => {
      assert.strictEqual(parseNumberFromString("42"), 42);
      assert.strictEqual(parseNumberFromString("-3.14"), -3.14);
      assert.strictEqual(parseNumberFromString("prefix 123 suffix"), 123);
      assert.strictEqual(parseNumberFromString("1.5e2"), 150);
    });

    void it("returns null for invalid input", () => {
      assert.strictEqual(parseNumberFromString("abc"), null);
      assert.strictEqual(parseNumberFromString(""), null);
      assert.strictEqual(parseNumberFromString("  "), null);
    });
  });

  void describe("parseAllNumbersFromString", () => {
    void it("extracts all numbers from string", () => {
      assert.deepStrictEqual(parseAllNumbersFromString("1 2 3"), [1, 2, 3]);
      assert.deepStrictEqual(parseAllNumbersFromString("10.5 -20 3.14"), [10.5, -20, 3.14]);
    });

    void it("returns empty array for invalid input", () => {
      assert.deepStrictEqual(parseAllNumbersFromString("abc"), []);
      assert.deepStrictEqual(parseAllNumbersFromString(""), []);
      assert.deepStrictEqual(parseAllNumbersFromString("  "), []);
    });

    void it("filters out non-finite numbers", () => {
      const result = parseAllNumbersFromString("1 2 3");
      assert.strictEqual(
        result.every((n: number) => Number.isFinite(n)),
        true,
      );
    });
  });
});

void describe("type.utils - safe parsing (float)", () => {
  void describe("safeParseFloat", () => {
    void it("parses numbers correctly", () => {
      assert.strictEqual(safeParseFloat(42), 42);
      assert.strictEqual(safeParseFloat(3.14), 3.14);
    });

    void it("parses string numbers", () => {
      assert.strictEqual(safeParseFloat("42"), 42);
      assert.strictEqual(safeParseFloat("-3.14"), -3.14);
      assert.strictEqual(safeParseFloat("  5.5  "), 5.5);
    });

    void it("returns fallback for invalid input", () => {
      assert.strictEqual(safeParseFloat("abc"), 0);
      assert.strictEqual(safeParseFloat("abc", 99), 99);
      assert.strictEqual(safeParseFloat(null), 0);
      assert.strictEqual(safeParseFloat(undefined), 0);
      assert.strictEqual(safeParseFloat(NaN), 0);
    });
  });
});

void describe("type.utils - safe parsing (int and coerce)", () => {
  void describe("safeParseInt", () => {
    void it("parses integers correctly", () => {
      assert.strictEqual(safeParseInt(42), 42);
      assert.strictEqual(safeParseInt(-5), -5);
    });

    void it("truncates floats", () => {
      assert.strictEqual(safeParseInt(3.99), 3);
      assert.strictEqual(safeParseInt(-3.99), -3);
    });

    void it("parses string integers", () => {
      assert.strictEqual(safeParseInt("42"), 42);
      assert.strictEqual(safeParseInt("-5"), -5);
    });

    void it("supports radix parameter", () => {
      assert.strictEqual(safeParseInt("10", 0, 2), 2);
      assert.strictEqual(safeParseInt("20", 0, 16), 32);
    });

    void it("returns fallback for invalid input", () => {
      assert.strictEqual(safeParseInt("abc"), 0);
      assert.strictEqual(safeParseInt("abc", 99), 99);
      assert.strictEqual(safeParseInt(undefined), 0);
    });
  });

  void describe("coerceToFiniteNumber", () => {
    void it("coerces values to finite numbers", () => {
      assert.strictEqual(coerceToFiniteNumber(42), 42);
      assert.strictEqual(coerceToFiniteNumber("42"), 42);
    });

    void it("returns fallback for infinite or NaN", () => {
      assert.strictEqual(coerceToFiniteNumber(NaN), 0);
      assert.strictEqual(coerceToFiniteNumber(Infinity), 0);
      assert.strictEqual(coerceToFiniteNumber(NaN, 99), 99);
    });
  });
});

void describe("type.utils - utilities (clamp and rounding)", () => {
  void describe("clamp", () => {
    void it("clamps value between min and max", () => {
      assert.strictEqual(clamp(5, 0, 10), 5);
      assert.strictEqual(clamp(-5, 0, 10), 0);
      assert.strictEqual(clamp(15, 0, 10), 10);
    });

    void it("clamps with only min", () => {
      assert.strictEqual(clamp(5, 10), 10);
      assert.strictEqual(clamp(15, 10), 15);
    });

    void it("clamps with only max", () => {
      assert.strictEqual(clamp(5, undefined, 10), 5);
      assert.strictEqual(clamp(15, undefined, 10), 10);
    });
  });

  void describe("roundTo", () => {
    void it("rounds to specified decimals", () => {
      assert.strictEqual(roundTo(3.14159, 2), 3.14);
      assert.strictEqual(roundTo(3.14159, 0), 3);
      assert.strictEqual(roundTo(3.5), 4);
    });

    void it("returns value for non-finite inputs", () => {
      assert.strictEqual(roundTo(NaN, 2), NaN);
      assert.strictEqual(roundTo(Infinity, 2), Infinity);
      assert.strictEqual(roundTo(3.14, NaN), 3.14);
    });
  });

  void describe("floorTo", () => {
    void it("floors to specified decimals", () => {
      assert.strictEqual(floorTo(3.14159, 2), 3.14);
      assert.strictEqual(floorTo(3.99, 0), 3);
      assert.strictEqual(floorTo(-3.1, 0), -4);
    });
  });

  void describe("ceilTo", () => {
    void it("ceils to specified decimals", () => {
      assert.strictEqual(ceilTo(3.14159, 2), 3.15);
      assert.strictEqual(ceilTo(3.01, 0), 4);
      assert.strictEqual(ceilTo(-3.9, 0), -3);
    });
  });
});

void describe("type.utils - formatting", () => {
  void describe("toFixedNumber", () => {
    void it("converts to fixed decimal number", () => {
      assert.strictEqual(toFixedNumber(3.14159, 2), 3.14);
      assert.strictEqual(toFixedNumber("3.14159", 2), 3.14);
      assert.strictEqual(toFixedNumber(null, 2), 0);
    });

    void it("uses fallback for invalid input", () => {
      assert.strictEqual(toFixedNumber("abc", 2, 99), 99);
      assert.strictEqual(toFixedNumber(undefined, 2, 42), 42);
    });
  });
});
