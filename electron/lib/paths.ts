import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  return app.getPath("userData");
}

export function settingsFile(): string {
  return path.join(dataDir(), "settings.json");
}

export function accountFile(): string {
  return path.join(dataDir(), "account.json");
}

export function instancesFile(): string {
  return path.join(dataDir(), "instances.json");
}

export function instancesDir(): string {
  return path.join(dataDir(), "instances");
}

export function cacheDir(): string {
  return path.join(dataDir(), "cache");
}

export function logsDir(): string {
  return path.join(dataDir(), "logs");
}

const SAFE_ID = /^[a-zA-Z0-9-]{6,64}$/;

export function assertInstanceId(id: unknown): string {
  if (typeof id !== "string" || !SAFE_ID.test(id)) {
    throw new Error("Invalid instance id.");
  }
  return id;
}

export function instanceGamePath(id: string): string {
  return path.join(instancesDir(), assertInstanceId(id));
}

export function ensureDirs(): void {
  for (const dir of [dataDir(), instancesDir(), cacheDir(), logsDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
