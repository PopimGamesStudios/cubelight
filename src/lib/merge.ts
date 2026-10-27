import type { DeepPartial } from "@shared/types";

export function deepMerge<T>(base: T, patch: DeepPartial<T> | unknown): T {
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return (patch === undefined ? base : (patch as T));
  }
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return (patch === undefined ? base : (patch as T));
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = result[key];
    if (
      typeof current === "object" &&
      current !== null &&
      !Array.isArray(current) &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
