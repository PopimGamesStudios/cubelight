import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import {
  MinecraftFolder,
  Version,
  createMinecraftProcessWatcher,
  launch,
  type ResolvedVersion,
} from "@xmcl/core";
import {
  getLoaderArtifactListFor,
  installDependenciesTask,
  installFabric,
  installForge,
  installNeoForged,
  installTask,
} from "@xmcl/installer";
import { compareVersions, fetchJson, fetchText, parseMavenVersions } from "./download";
import { getSettings } from "./settings";
import { ensureInstanceFolders, getInstance, updateInstance } from "./instances";
import { instanceGamePath } from "./paths";
import { detectJava, pickJava, requiredJavaMajor } from "./java";
import { logger } from "./logger";
import type { GameProgress, GameVersion, Instance, LaunchStateName } from "../../shared/types";

interface VersionManifestEntry {
  id: string;
  type: string;
  url: string;
  time: string;
  releaseTime: string;
}

interface VersionManifest {
  latest: { release: string; snapshot: string };
  versions: VersionManifestEntry[];
}

let manifestCache: { at: number; data: VersionManifest } | null = null;

export async function getVersionManifest(force = false): Promise<VersionManifest> {
  if (!force && manifestCache && Date.now() - manifestCache.at < 10 * 60_000) {
    return manifestCache.data;
  }
  const data = await fetchJson<VersionManifest>(
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    {},
    { timeoutMs: 30_000 },
  );
  manifestCache = { at: Date.now(), data };
  return data;
}

export async function getGameVersions(includeSnapshots: boolean): Promise<{
  versions: GameVersion[];
  latest: { release: string; snapshot: string };
}> {
  const manifest = await getVersionManifest();
  const versions = manifest.versions
    .filter((version) => version.type === "release" || (includeSnapshots && version.type === "snapshot"))
    .map((version) => ({
      id: version.id,
      type: version.type,
      releaseTime: version.releaseTime,
    }));
  return { versions, latest: manifest.latest };
}

async function findVersionMeta(id: string): Promise<VersionManifestEntry> {
  const manifest = await getVersionManifest();
  const meta = manifest.versions.find((version) => version.id === id);
  if (!meta) throw new Error(`Minecraft ${id} was not found in Mojang's version list.`);
  return meta;
}

type ProgressEmitter = (event: Omit<GameProgress, "instanceId">) => void;

async function runTask(
  task: any,
  stage: string,
  base: number,
  span: number,
  onProgress: ProgressEmitter,
): Promise<void> {
  let last = 0;
  await task.startAndWait({
    onStart: (child: any) => {
      onProgress({ stage, detail: child?.name, percent: base, indeterminate: true });
    },
    onUpdate: () => {
      const now = Date.now();
      if (now - last < 140) return;
      last = now;
      const total = Number(task.total ?? 0);
      const progress = Number(task.progress ?? 0);
      const ratio = total > 0 ? Math.max(0, Math.min(1, progress / total)) : undefined;
      onProgress({
        stage,
        detail: task.path || task.name,
        percent: ratio === undefined ? base : base + ratio * span,
        indeterminate: ratio === undefined,
      });
    },
  });
}

async function resolveForgeVersion(mcVersion: string): Promise<string> {
  try {
    const promotions = await fetchJson<{ promos?: Record<string, string> }>(
      "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json",
      {},
      { timeoutMs: 20_000 },
    );
    const recommended = promotions.promos?.[`${mcVersion}-recommended`];
    const latest = promotions.promos?.[`${mcVersion}-latest`];
    if (recommended || latest) return recommended || latest!;
  } catch (error) {
    logger.debug("Forge promotions lookup failed; falling back to maven metadata", error);
  }

  const xml = await fetchText("https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml", {}, { timeoutMs: 25_000 });
  const prefix = `${mcVersion}-`;
  const versions = parseMavenVersions(xml)
    .filter((version) => version.startsWith(prefix))
    .map((version) => version.slice(prefix.length))
    .filter(Boolean)
    .sort(compareVersions);
  const picked = versions[versions.length - 1];
  if (!picked) throw new Error(`Forge does not have a build for Minecraft ${mcVersion}.`);
  return picked;
}

async function resolveNeoForgeVersion(mcVersion: string): Promise<{ project: "forge" | "neoforge"; version: string }> {
  if (mcVersion === "1.20.1") {
    const xml = await fetchText(
      "https://maven.neoforged.net/releases/net/neoforged/forge/maven-metadata.xml",
      {},
      { timeoutMs: 25_000 },
    );
    const versions = parseMavenVersions(xml)
      .filter((version) => version.startsWith("1.20.1-"))
      .sort(compareVersions);
    const picked = versions[versions.length - 1];
    if (!picked) throw new Error("NeoForge does not have a build for Minecraft 1.20.1.");
    return { project: "forge", version: picked };
  }

  const match = /^1\.(\d+)(?:\.(\d+))?/.exec(mcVersion);
  if (!match) throw new Error(`NeoForge could not resolve Minecraft ${mcVersion}.`);
  const prefix = `${Number(match[1])}.${Number(match[2] ?? 0)}`;
  const xml = await fetchText(
    "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml",
    {},
    { timeoutMs: 25_000 },
  );
  const versions = parseMavenVersions(xml)
    .filter((version) => version.startsWith(`${prefix}.`))
    .sort(compareVersions);
  const picked = versions[versions.length - 1];
  if (!picked) {
    throw new Error(`NeoForge does not have a build for Minecraft ${mcVersion}. Try Fabric or Forge.`);
  }
  return { project: "neoforge", version: picked };
}

function friendlyInstallError(error: unknown, loader: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("java") || message.includes("Java") || message.includes("ENOENT")) {
    return new Error(
      `Installing ${loader} needs Java. Install Java 21 from adoptium.net, then set the Java path in Settings → Java. (${message})`,
    );
  }
  return new Error(`${loader} install failed: ${message}`);
}

export async function installInstance(id: string, onProgress: ProgressEmitter): Promise<Instance> {
  let instance = getInstance(id);
  ensureInstanceFolders(instance);

  if (instance.kind === "server") {
    onProgress({ stage: "Server folders ready", detail: instance.name, percent: 100 });
    return updateInstance(id, { installed: true });
  }

  const root = instanceGamePath(id);
  const folder = MinecraftFolder.from(root);
  const meta = await findVersionMeta(instance.mcVersion);
  const javaInfos = await detectJava();
  const requiredJava = requiredJavaMajor(instance.mcVersion);
  const java = await pickJava(javaInfos, requiredJava, instance.javaPath || getSettings().launcher.javaPath);
  const loaderNeedsJava = instance.loader === "forge" || instance.loader === "neoforge";
  if (loaderNeedsJava && !java) {
    throw new Error(
      `Java ${requiredJava}+ is required to install ${instance.loader}. Install it from adoptium.net and choose it in Settings → Java.`,
    );
  }

  onProgress({ stage: "Resolving Minecraft", detail: instance.mcVersion, percent: 1, indeterminate: true });
  await runTask(
    installTask(meta, folder, { side: "client" }),
    "Downloading Minecraft",
    2,
    54,
    onProgress,
  );

  let versionId = instance.mcVersion;
  let loaderVersion: string | undefined;

  if (instance.loader === "fabric") {
    try {
      const artifacts = await getLoaderArtifactListFor(instance.mcVersion);
      if (!artifacts.length) {
        throw new Error(`Fabric does not support Minecraft ${instance.mcVersion}.`);
      }
      const stable = artifacts.filter((artifact) => artifact.loader.stable);
      const artifact = (stable.length ? stable : artifacts).sort((a, b) =>
        compareVersions(b.loader.version, a.loader.version),
      )[0];
      loaderVersion = artifact.loader.version;
      onProgress({ stage: "Installing Fabric", detail: loaderVersion, percent: 57, indeterminate: true });
      versionId = await installFabric(artifact, folder, { side: "client" });
      const resolved = await Version.parse(folder, versionId);
      await runTask(
        installDependenciesTask(resolved, { side: "client" }),
        "Downloading Fabric libraries",
        60,
        38,
        onProgress,
      );
    } catch (error) {
      throw friendlyInstallError(error, "Fabric");
    }
  } else if (instance.loader === "forge") {
    try {
      loaderVersion = await resolveForgeVersion(instance.mcVersion);
      onProgress({ stage: "Installing Forge", detail: loaderVersion, percent: 57, indeterminate: true });
      versionId = await installForge(
        { mcversion: instance.mcVersion, version: loaderVersion },
        folder,
        {
          side: "client",
          java: java?.path,
          mavenHost: "https://maven.minecraftforge.net",
        },
      );
      const resolved = await Version.parse(folder, versionId);
      await runTask(
        installDependenciesTask(resolved, { side: "client" }),
        "Downloading Forge libraries",
        62,
        36,
        onProgress,
      );
    } catch (error) {
      throw friendlyInstallError(error, "Forge");
    }
  } else if (instance.loader === "neoforge") {
    try {
      const neo = await resolveNeoForgeVersion(instance.mcVersion);
      loaderVersion = neo.version;
      onProgress({ stage: "Installing NeoForge", detail: loaderVersion, percent: 57, indeterminate: true });
      versionId = await installNeoForged(neo.project, neo.version, folder, {
        side: "client",
        java: java?.path,
        mavenHost: "https://maven.neoforged.net/releases",
      });
      const resolved = await Version.parse(folder, versionId);
      await runTask(
        installDependenciesTask(resolved, { side: "client" }),
        "Downloading NeoForge libraries",
        62,
        36,
        onProgress,
      );
    } catch (error) {
      throw friendlyInstallError(error, "NeoForge");
    }
  }

  onProgress({ stage: "Finalizing instance", percent: 99, indeterminate: false });
  instance = updateInstance(id, {
    installed: true,
    versionId,
    loaderVersion,
  });
  onProgress({ stage: "Ready to play", percent: 100, indeterminate: false });
  return instance;
}

export interface LaunchAccount {
  mode: "offline" | "microsoft";
  name: string;
  uuid: string;
  accessToken: string;
}

export interface LaunchHandlers {
  onState: (state: LaunchStateName, message?: string, code?: number) => void;
  onLog: (line: string, stream: "stdout" | "stderr" | "launcher") => void;
}

export interface RunningGame {
  child: ChildProcess;
  watcher: ReturnType<typeof createMinecraftProcessWatcher>;
  startedAt: number;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { error?: string; message?: string };
    if (candidate.message) return candidate.message;
    if (candidate.error) return candidate.error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export async function launchInstance(
  instance: Instance,
  account: LaunchAccount,
  handlers: LaunchHandlers,
): Promise<RunningGame> {
  if (instance.kind === "server") throw new Error("Server instances don't launch a game client.");
  if (!instance.installed) throw new Error("Install this instance before launching it.");

  const root = instanceGamePath(instance.id);
  if (!fs.existsSync(root)) throw new Error("The instance folder is missing. Reinstall the instance.");

  const versionId = instance.versionId || instance.mcVersion;
  let resolved: ResolvedVersion;
  try {
    resolved = await Version.parse(root, versionId);
  } catch (error) {
    logger.warn(`Could not parse version ${versionId}`, error);
    throw new Error(`Could not read version ${versionId}. Reinstall the instance from the Instances page.`);
  }

  const requiredJava = resolved.javaVersion?.majorVersion ?? requiredJavaMajor(instance.mcVersion);
  const javaInfos = await detectJava();
  const java = await pickJava(javaInfos, requiredJava, instance.javaPath || getSettings().launcher.javaPath);
  if (!java) {
    throw new Error(
      `Minecraft ${instance.mcVersion} needs Java ${requiredJava}+. Install it from adoptium.net and choose it in Settings → Java.`,
    );
  }

  const settings = getSettings();
  handlers.onState("launching", `Starting with Java ${java.majorVersion}`);
  handlers.onLog(
    `Launching ${instance.name} (${versionId}) with Java ${java.majorVersion} · ${instance.memoryMb} MB`,
    "launcher",
  );

  try {
    const child = await launch({
      gamePath: root,
      resourcePath: root,
      version: resolved,
      javaPath: java.path,
      gameProfile: { name: account.name, id: account.uuid },
      accessToken: account.accessToken,
      userType: account.mode === "microsoft" ? "mojang" : "legacy",
      minMemory: 512,
      maxMemory: instance.memoryMb,
      launcherName: "Cubelight",
      launcherBrand: app.getVersion(),
      extraJVMArgs: ["-Dcubelight.launcher=true"],
      resolution: settings.launcher.fullscreen
        ? { fullscreen: true }
        : { width: settings.launcher.gameWindowWidth, height: settings.launcher.gameWindowHeight },
      ignoreInvalidMinecraftCertificates: true,
      ignorePatchDiscrepancies: true,
    });

    const watcher = createMinecraftProcessWatcher(child);
    const emitLines = (stream: "stdout" | "stderr") => (data: Buffer | string) => {
      const text = data.toString();
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) handlers.onLog(line, stream);
      }
    };
    child.stdout?.on("data", emitLines("stdout"));
    child.stderr?.on("data", emitLines("stderr"));
    child.on("error", (error) => {
      logger.error("Minecraft process error", error);
      handlers.onState("crashed", error.message);
    });

    watcher.on("minecraft-window-ready", () => {
      handlers.onState("running");
    });
    watcher.on("minecraft-exit", (event) => {
      if (event.code === 0) {
        handlers.onState("stopped", "Game closed", 0);
      } else {
        handlers.onState(
          "crashed",
          event.crashReportLocation
            ? `Game exited with code ${event.code}. Crash report: ${event.crashReportLocation}`
            : `Game exited with code ${event.code}`,
          event.code,
        );
      }
    });

    return { child, watcher, startedAt: Date.now() };
  } catch (error) {
    logger.error("Minecraft launch failed", error);
    throw new Error(`Could not launch Minecraft: ${formatError(error)}`);
  }
}

export function killGame(child: ChildProcess): void {
  if (!child.pid) return;
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    } catch (error) {
      logger.warn("taskkill failed", error);
      child.kill();
    }
  } else {
    child.kill("SIGTERM");
  }
}
