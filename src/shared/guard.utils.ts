/**
 * Generic runtime type guards for narrowing values of unknown origin
 * (request bodies, stored records, external input) into typed values
 * without unchecked type assertions.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";
