import { shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { JsonStore } from "./json-store";
import { instanceGamePath, instancesFile } from "./paths";
import type { CreateInstanceInput, DeepPartial, Instance, InstalledMod, LoaderType } from "../../shared/types";
import { logger } from "./logger";

interface InstancesFile {
  instances: Instance[];
}

const store = new JsonStore<InstancesFile>(instancesFile(), { instances: [] });

const LOADERS: LoaderType[] = ["vanilla", "fabric", "forge", "neoforge"];
const COLORS = ["#c8ff3d", "#ff6b3d", "#a78bfa", "#5eead4", "#4f8cff", "#f472b6", "#fbbf24"];

export function listInstances(): Instance[] {
  return store.get().instances;
}

export function getInstance(id: string): Instance {
  const instance = listInstances().find((item) => item.id === id);
  if (!instance) throw new Error("Instance not found.");
  return instance;
}

function uniqueName(desired: string): string {
  const base = desired.trim() || "New instance";
  const names = new Set(listInstances().map((item) => item.name.toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let index = 2;
  while (names.has(`${base} ${index}`.toLowerCase())) index += 1;
  return `${base} ${index}`;
}

function prepareFolders(instance: Instance): void {
  const root = instanceGamePath(instance.id);
  const folders =
    instance.kind === "server"
      ? ["plugins", "mods", "config", "logs", "world"]
      : ["mods", "resourcepacks", "shaderpacks", "saves", "config", "logs", "versions"];
  fs.mkdirSync(root, { recursive: true });
  for (const folder of folders) {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
  }
}

export function createInstance(input: CreateInstanceInput): Instance {
  const name = uniqueName(input.name);
  if (!/^[0-9A-Za-z._ -]{1,48}$/.test(name)) {
    throw new Error("Instance names can use letters, numbers, spaces, dots, dashes and underscores.");
  }
  if (!input.mcVersion || !/^[0-9A-Za-z._-]{2,32}$/.test(input.mcVersion)) {
    throw new Error("Choose a valid Minecraft version.");
  }
  if (!LOADERS.includes(input.loader)) throw new Error("Unsupported mod loader.");

  const instance: Instance = {
    id: randomUUID(),
    name,
    mcVersion: input.mcVersion,
    loader: input.loader,
    kind: input.kind === "server" ? "server" : "client",
    color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : COLORS[0],
    icon: input.icon || (input.kind === "server" ? "▤" : "◆"),
    memoryMb: Math.min(32768, Math.max(512, Math.round(input.memoryMb || 4096))),
    createdAt: Date.now(),
    installed: input.kind === "server",
    installedMods: [],
  };

  prepareFolders(instance);
  const data = store.get();
  data.instances.unshift(instance);
  store.set(data);
  return instance;
}

export function updateInstance(id: string, patch: DeepPartial<Instance>): Instance {
  const data = store.get();
  const index = data.instances.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Instance not found.");
  const current = data.instances[index];

  const next: Instance = { ...current };
  if (typeof patch.name === "string" && patch.name.trim()) next.name = patch.name.trim().slice(0, 48);
  if (typeof patch.mcVersion === "string") next.mcVersion = patch.mcVersion;
  if (typeof patch.loader === "string" && LOADERS.includes(patch.loader)) next.loader = patch.loader;
  if (typeof patch.loaderVersion === "string") next.loaderVersion = patch.loaderVersion;
  if (typeof patch.versionId === "string") next.versionId = patch.versionId;
  if (typeof patch.color === "string" && /^#[0-9a-fA-F]{6}$/.test(patch.color)) next.color = patch.color;
  if (typeof patch.icon === "string") next.icon = patch.icon.slice(0, 8);
  if (typeof patch.memoryMb === "number") next.memoryMb = Math.min(32768, Math.max(512, Math.round(patch.memoryMb)));
  if (typeof patch.javaPath === "string") next.javaPath = patch.javaPath;
  if (typeof patch.lastPlayed === "number") next.lastPlayed = patch.lastPlayed;
  if (typeof patch.installed === "boolean") next.installed = patch.installed;
  if (typeof patch.notes === "string") next.notes = patch.notes.slice(0, 2000);

  data.instances[index] = next;
  store.set(data);
  return next;
}

export async function removeInstance(id: string): Promise<void> {
  const data = store.get();
  const instance = data.instances.find((item) => item.id === id);
  if (!instance) return;
  data.instances = data.instances.filter((item) => item.id !== id);
  store.set(data);
  try {
    const target = instanceGamePath(id);
    if (fs.existsSync(target)) {
      await shell.trashItem(target);
    }
  } catch (error) {
    logger.warn(`Could not move instance ${id} to trash`, error);
  }
}

export function saveInstance(instance: Instance): Instance {
  const data = store.get();
  const index = data.instances.findIndex((item) => item.id === instance.id);
  if (index === -1) {
    data.instances.unshift(instance);
  } else {
    data.instances[index] = instance;
  }
  store.set(data);
  return instance;
}

export function setInstalledMods(id: string, mods: InstalledMod[]): Instance {
  const instance = getInstance(id);
  return saveInstance({ ...instance, installedMods: mods });
}

export function addInstalledMod(id: string, mod: InstalledMod): Instance {
  const instance = getInstance(id);
  const mods = instance.installedMods.filter(
    (item) => !(item.projectId === mod.projectId && item.provider === mod.provider && item.type === mod.type),
  );
  mods.unshift(mod);
  return saveInstance({ ...instance, installedMods: mods });
}

export function removeInstalledMod(id: string, key: string): Instance {
  const instance = getInstance(id);
  return saveInstance({
    ...instance,
    installedMods: instance.installedMods.filter((item) => item.key !== key),
  });
}

export function updateInstalledMod(id: string, key: string, patch: Partial<InstalledMod>): InstalledMod {
  const instance = getInstance(id);
  const mod = instance.installedMods.find((item) => item.key === key);
  if (!mod) throw new Error("Installed item not found.");
  const next = { ...mod, ...patch };
  saveInstance({
    ...instance,
    installedMods: instance.installedMods.map((item) => (item.key === key ? next : item)),
  });
  return next;
}

export function ensureInstanceFolders(instance: Instance): void {
  prepareFolders(instance);
}
