import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { logger } from "./logger";

const DEFAULT_UA = "Cubelight/1.0.0 (open-source Minecraft launcher)";

function extractErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const candidate =
      parsed.error_description ?? parsed.message ?? parsed.error ?? parsed.detail ?? parsed.title;
    if (typeof candidate === "string") return candidate;
  } catch {
    // not json
  }
  return trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 320);
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  options: { timeoutMs?: number; userAgent?: string } = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": options.userAgent || DEFAULT_UA,
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: init.signal ?? AbortSignal.timeout(options.timeoutMs ?? 20_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = extractErrorMessage(body);
    throw new Error(`Request failed (${response.status})${message ? `: ${message}` : ""}`);
  }
  return (await response.json()) as T;
}

export async function fetchText(
  url: string,
  init: RequestInit = {},
  options: { timeoutMs?: number; userAgent?: string } = {},
): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": options.userAgent || DEFAULT_UA,
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: init.signal ?? AbortSignal.timeout(options.timeoutMs ?? 20_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = extractErrorMessage(body);
    throw new Error(`Request failed (${response.status})${message ? `: ${message}` : ""}`);
  }
  return response.text();
}

export interface DownloadOptions {
  onProgress?: (received: number, total: number | null) => void;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  userAgent?: string;
}

export async function downloadFile(url: string, destination: string, options: DownloadOptions = {}): Promise<void> {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temp = `${destination}.part-${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": options.userAgent || DEFAULT_UA,
      ...options.headers,
    },
    redirect: "follow",
    signal: options.signal,
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    const message = extractErrorMessage(body);
    throw new Error(`Download failed (${response.status})${message ? `: ${message}` : ""}`);
  }

  const totalHeader = response.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : null;
  let received = 0;
  const stream = fs.createWriteStream(temp);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (!stream.write(Buffer.from(value))) {
        await once(stream, "drain");
      }
      options.onProgress?.(received, Number.isFinite(total) ? total : null);
    }
    await new Promise<void>((resolve, reject) => {
      stream.end(() => resolve());
      stream.once("error", reject);
    });
    if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });
    fs.renameSync(temp, destination);
    options.onProgress?.(received, received);
  } catch (error) {
    stream.destroy();
    try {
      if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
    } catch {
      // ignore
    }
    logger.warn(`Download failed for ${url}`, error);
    throw error;
  }
}

export function parseMavenVersions(xml: string): string[] {
  const versions: string[] = [];
  const regex = /<version>([^<]+)<\/version>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml))) {
    versions.push(match[1].trim());
  }
  return versions;
}

export function compareVersions(a: string, b: string): number {
  const split = (value: string) =>
    value
      .split(/[.+-]/)
      .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  const left = split(a);
  const right = split(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    if (typeof l === "number" && typeof r === "number") {
      if (l !== r) return l - r;
    } else {
      const result = String(l).localeCompare(String(r));
      if (result !== 0) return result;
    }
  }
  return 0;
}
