import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getPotentialJavaLocations, resolveJava } from "@xmcl/installer";
import { getSettings } from "./settings";
import type { JavaInfo } from "../../shared/types";
import { logger } from "./logger";

let cache: { at: number; preferred: string; list: JavaInfo[] } | null = null;

function javaExecutable(home: string): string {
  return path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java");
}

function addHome(candidates: Set<string>, home: string): void {
  if (!home) return;
  try {
    if (fs.existsSync(home) && fs.statSync(home).isFile()) {
      candidates.add(home);
      return;
    }
    const executable = javaExecutable(home);
    if (fs.existsSync(executable)) candidates.add(executable);
  } catch {
    // ignore
  }
}

function addHomeAndChildren(candidates: Set<string>, parent: string): void {
  if (!parent || !fs.existsSync(parent)) return;
  addHome(candidates, parent);
  try {
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      addHome(candidates, path.join(parent, entry.name));
    }
  } catch {
    // ignore
  }
}

async function collectCandidates(): Promise<string[]> {
  const candidates = new Set<string>();
  const settings = getSettings();

  if (settings.launcher.javaPath) addHome(candidates, settings.launcher.javaPath);

  try {
    for (const location of await getPotentialJavaLocations()) {
      if (location) candidates.add(location);
    }
  } catch (error) {
    logger.debug("Could not query PATH for Java", error);
  }

  const envHome = process.env.JAVA_HOME;
  if (envHome) addHome(candidates, envHome);

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    for (const parent of [
      path.join(programFiles, "Java"),
      path.join(programFiles, "Eclipse Adoptium"),
      path.join(programFiles, "Microsoft"),
      path.join(programFiles, "Zulu"),
      path.join(programFiles, "BellSoft"),
      path.join(programFiles, "Amazon Corretto"),
      path.join(localAppData, "Programs", "Eclipse Adoptium"),
      path.join(os.homedir(), ".jdks"),
    ]) {
      addHomeAndChildren(candidates, parent);
    }
  } else if (process.platform === "darwin") {
    const base = "/Library/Java/JavaVirtualMachines";
    if (fs.existsSync(base)) {
      try {
        for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
          if (entry.isDirectory()) addHome(candidates, path.join(base, entry.name, "Contents", "Home"));
        }
      } catch {
        // ignore
      }
    }
  } else {
    addHomeAndChildren(candidates, "/usr/lib/jvm");
    addHomeAndChildren(candidates, "/usr/java");
    addHomeAndChildren(candidates, path.join(os.homedir(), ".jdks"));
  }

  return [...candidates];
}

export async function detectJava(force = false): Promise<JavaInfo[]> {
  const settings = getSettings();
  if (!force && cache && Date.now() - cache.at < 60_000 && cache.preferred === settings.launcher.javaPath) {
    return cache.list;
  }

  const candidates = await collectCandidates();
  const resolved = await Promise.all(
    candidates.map(async (candidate): Promise<JavaInfo | null> => {
      try {
        const info = await resolveJava(candidate);
        if (!info) return null;
        return { ...info, source: sourceFor(candidate) };
      } catch {
        return null;
      }
    }),
  );

  const seen = new Set<string>();
  const list = resolved
    .filter((info): info is JavaInfo => info !== null)
    .filter((info) => {
      const key = path.resolve(info.path).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.majorVersion - a.majorVersion || a.path.localeCompare(b.path));

  cache = { at: Date.now(), preferred: settings.launcher.javaPath, list };
  return list;
}

function sourceFor(candidate: string): string {
  if (candidate.toLowerCase().includes("adoptium")) return "Adoptium";
  if (candidate.toLowerCase().includes("zulu")) return "Zulu";
  if (candidate.toLowerCase().includes("corretto")) return "Corretto";
  if (candidate.toLowerCase().includes("microsoft")) return "Microsoft";
  if (candidate.toLowerCase().includes("bellsoft") || candidate.toLowerCase().includes("liberica")) return "Liberica";
  if (process.env.JAVA_HOME && candidate.startsWith(process.env.JAVA_HOME)) return "JAVA_HOME";
  return "Detected";
}

export function requiredJavaMajor(mcVersion: string): number {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(mcVersion);
  if (!match) return 21;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] ? Number(match[3]) : 0;
  if (major > 1) return 21;
  if (minor >= 21) return 21;
  if (minor === 20) return patch >= 5 ? 21 : 17;
  if (minor >= 18) return 17;
  if (minor === 17) return 16;
  return 8;
}

export async function pickJava(
  infos: JavaInfo[],
  requiredMajor: number,
  preferredPath?: string,
): Promise<JavaInfo | undefined> {
  if (preferredPath) {
    const normalized = path.resolve(preferredPath).toLowerCase();
    const exact = infos.find((info) => path.resolve(info.path).toLowerCase() === normalized);
    if (exact && exact.majorVersion >= requiredMajor) return exact;
  }
  return infos
    .filter((info) => info.majorVersion >= requiredMajor)
    .sort((a, b) => a.majorVersion - b.majorVersion || a.path.localeCompare(b.path))[0];
}

export function invalidateJavaCache(): void {
  cache = null;
}
