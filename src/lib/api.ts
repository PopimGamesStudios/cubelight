import type { CubelightApi } from "@shared/types";
import { mockApi } from "./mock";

export const isDesktop = typeof window !== "undefined" && Boolean(window.cubelight);
export const api: CubelightApi = (typeof window !== "undefined" && window.cubelight) || mockApi;

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();
}
