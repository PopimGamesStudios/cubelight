import fs from "node:fs";
import path from "node:path";
import { getCurseForgeDownloadUrl, getCurseForgeVersions, searchCurseForge } from "./curseforge";
import { getModrinthVersions, searchModrinth } from "./modrinth";
import { downloadFile } from "./download";
import { addInstalledMod, getInstance, removeInstalledMod, updateInstalledMod } from "./instances";
import { instanceGamePath } from "./paths";
import type {
  InstallModInput,
  InstalledMod,
  ModSearchQuery,
  ModSearchResponse,
  ModType,
  ModVersionInfo,
  ModVersionQuery,
} from "../../shared/types";

const TARGET_FOLDERS: Record<ModType, string> = {
  mod: "mods",
  plugin: "plugins",
  resourcepack: "resourcepacks",
  shader: "shaderpacks",
};

export type ModProgressEmitter = (stage: string, percent?: number, indeterminate?: boolean) => void;

export async function searchMods(query: ModSearchQuery): Promise<ModSearchResponse> {
  return query.provider === "curseforge" ? searchCurseForge(query) : searchModrinth(query);
}

export async function getModVersions(query: ModVersionQuery): Promise<ModVersionInfo[]> {
  return query.provider === "curseforge" ? getCurseForgeVersions(query) : getModrinthVersions(query);
}

function validateType(instanceKind: "client" | "server", type: ModType): void {
  if (type === "plugin" && instanceKind !== "server") {
    throw new Error("Plugins install into server instances. Select or create a server instance first.");
  }
  if ((type === "resourcepack" || type === "shader") && instanceKind !== "client") {
    throw new Error("Resource packs and shaders install into client instances.");
  }
}

function safeFileName(fileName: string, title: string, type: ModType): string {
  const raw = path.basename((fileName || "").replace(/\.disabled$/i, "")).trim();
  const cleaned = raw.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 140);
  if (cleaned && /\.(jar|zip)$/i.test(cleaned)) return cleaned;
  const fallback = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 90) || "download";
  return `${fallback}.${type === "mod" || type === "plugin" ? "jar" : "zip"}`;
}

function uniqueFileName(folder: string, fileName: string): string {
  if (!fs.existsSync(path.join(folder, fileName))) return fileName;
  const extension = path.extname(fileName);
  const base = path.basename(fileName, extension);
  let index = 2;
  while (fs.existsSync(path.join(folder, `${base}-${index}${extension}`))) index += 1;
  return `${base}-${index}${extension}`;
}

function removeFileVariants(folder: string, fileName: string): void {
  for (const candidate of [fileName, `${fileName}.disabled`]) {
    const target = path.join(folder, path.basename(candidate));
    try {
      if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    } catch {
      // ignore
    }
  }
}

function looksLikeArchive(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(2);
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);
    return buffer.toString("utf8") === "PK";
  } catch {
    return false;
  }
}

export async function installMod(input: InstallModInput, onProgress: ModProgressEmitter): Promise<InstalledMod> {
  const instance = getInstance(input.instanceId);
  validateType(instance.kind, input.type);

  const folder = path.join(instanceGamePath(instance.id), TARGET_FOLDERS[input.type]);
  fs.mkdirSync(folder, { recursive: true });

  const desiredName = safeFileName(input.version.fileName, input.title, input.type);
  const existing = instance.installedMods.find(
    (mod) => mod.projectId === input.projectId && mod.provider === input.provider && mod.type === input.type,
  );
  if (existing) removeFileVariants(folder, existing.fileName);

  const fileName = uniqueFileName(folder, desiredName);
  const destination = path.join(folder, fileName);

  let url = input.version.downloadUrl;
  if (!url && input.provider === "curseforge") {
    url = await getCurseForgeDownloadUrl(input.projectId, input.version.id);
  }
  if (!url) throw new Error("This version doesn't expose a downloadable file.");

  onProgress("Preparing download", 0, true);
  let lastEmit = 0;
  await downloadFile(url, destination, {
    onProgress: (received, total) => {
      const now = Date.now();
      if (now - lastEmit < 120) return;
      lastEmit = now;
      const percent = total && total > 0 ? Math.min(99, (received / total) * 100) : undefined;
      onProgress("Downloading", percent, percent === undefined);
    },
  });

  if (!looksLikeArchive(destination)) {
    try {
      fs.rmSync(destination, { force: true });
    } catch {
      // ignore
    }
    throw new Error("The downloaded file was not a valid jar/zip. Try another version.");
  }

  onProgress("Finishing", 100, false);
  const mod: InstalledMod = {
    key: `${input.provider}:${input.projectId}:${input.version.id}`,
    projectId: input.projectId,
    provider: input.provider,
    title: input.title,
    fileName,
    versionName: input.version.name || input.version.versionNumber,
    type: input.type,
    iconUrl: input.iconUrl,
    enabled: true,
    installedAt: Date.now(),
    websiteUrl: input.websiteUrl,
  };
  addInstalledMod(instance.id, mod);
  return mod;
}

export function uninstallMod(instanceId: string, key: string): void {
  const instance = getInstance(instanceId);
  const mod = instance.installedMods.find((item) => item.key === key);
  if (!mod) return;
  const folder = path.join(instanceGamePath(instance.id), TARGET_FOLDERS[mod.type]);
  removeFileVariants(folder, mod.fileName);
  removeInstalledMod(instance.id, key);
}

export function toggleMod(instanceId: string, key: string): InstalledMod {
  const instance = getInstance(instanceId);
  const mod = instance.installedMods.find((item) => item.key === key);
  if (!mod) throw new Error("Installed item not found.");
  const folder = path.join(instanceGamePath(instance.id), TARGET_FOLDERS[mod.type]);
  const base = path.join(folder, path.basename(mod.fileName));
  const disabled = `${base}.disabled`;

  if (mod.enabled) {
    if (!fs.existsSync(base)) throw new Error("The installed file is missing from disk.");
    if (fs.existsSync(disabled)) fs.rmSync(disabled, { force: true });
    fs.renameSync(base, disabled);
  } else {
    if (!fs.existsSync(disabled)) throw new Error("The disabled file is missing from disk.");
    if (fs.existsSync(base)) fs.rmSync(base, { force: true });
    fs.renameSync(disabled, base);
  }

  return updateInstalledMod(instance.id, key, { enabled: !mod.enabled });
}

export function getInstalled(instanceId: string): InstalledMod[] {
  return getInstance(instanceId).installedMods;
}

export function targetFolder(type: ModType): string {
  return TARGET_FOLDERS[type];
}
