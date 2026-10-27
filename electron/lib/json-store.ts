import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : (patch as T));
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export class JsonStore<T extends object> {
  private value: T;

  constructor(
    private readonly file: string,
    private readonly defaults: T,
  ) {
    this.value = this.read();
  }

  get(): T {
    return this.value;
  }

  set(value: T): T {
    this.value = value;
    this.persist();
    return this.value;
  }

  update(patch: unknown): T {
    this.value = deepMerge(this.value, patch);
    this.persist();
    return this.value;
  }

  reset(): T {
    this.value = structuredClone(this.defaults);
    this.persist();
    return this.value;
  }

  private read(): T {
    try {
      if (!fs.existsSync(this.file)) {
        const initial = structuredClone(this.defaults);
        this.persistValue(initial);
        return initial;
      }
      const raw = fs.readFileSync(this.file, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return deepMerge(structuredClone(this.defaults), parsed);
    } catch (error) {
      logger.warn(`Could not read ${this.file}; using defaults`, error);
      try {
        if (fs.existsSync(this.file)) {
          fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`);
        }
      } catch {
        // ignore
      }
      return structuredClone(this.defaults);
    }
  }

  private persist(): void {
    this.persistValue(this.value);
  }

  private persistValue(value: T): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(value, null, 2), "utf8");
    } catch (error) {
      logger.error(`Could not write ${this.file}`, error);
    }
  }
}
