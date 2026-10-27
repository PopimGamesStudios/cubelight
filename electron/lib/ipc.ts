import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import fs from "node:fs";
import { getSettings, resetSettings, updateSettings } from "./settings";
import { dataDir, ensureDirs, instanceGamePath } from "./paths";
import {
  createInstance,
  getInstance,
  listInstances,
  removeInstance,
  updateInstance,
} from "./instances";
import { getGameVersions, installInstance, killGame, launchInstance, type RunningGame } from "./minecraft";
import { detectJava, invalidateJavaCache } from "./java";
import { searchMods, getModVersions, installMod, uninstallMod, toggleMod, getInstalled } from "./mods";
import { beginMicrosoftLogin, getAccountForLaunch, getPublicAccount, logout, setOfflineAccount } from "./auth";
import { checkForUpdates, downloadUpdate, getUpdateStatus, installUpdate } from "./updater";
import { refreshTray } from "./tray";
import { logger } from "./logger";
import type {
  AppPage,
  CreateInstanceInput,
  DeepPartial,
  DialogFilter,
  Instance,
  InstallModInput,
  ModSearchQuery,
  ModVersionQuery,
  Settings,
} from "../../shared/types";

export interface IpcContext {
  getWindow: () => BrowserWindow | null;
  broadcast: (channel: string, payload: unknown) => void;
  quit: () => void;
}

const running = new Map<string, RunningGame>();
const installing = new Set<string>();

function trusted(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? event.sender.getURL();
  if (
    url.startsWith("file://") ||
    url.startsWith("http://localhost:5173") ||
    url.startsWith("http://127.0.0.1:5173")
  ) {
    return;
  }
  throw new Error("Blocked IPC call from an untrusted page.");
}

function register<T>(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => T | Promise<T>): void {
  ipcMain.handle(channel, async (event, ...args) => {
    trusted(event);
    try {
      return await handler(event, ...args);
    } catch (error) {
      logger.error(`IPC ${channel} failed`, error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  });
}

function requireWindow(context: IpcContext): BrowserWindow {
  const win = context.getWindow();
  if (!win) throw new Error("The launcher window is not available.");
  return win;
}

function applyWindowSettings(settings: Settings): void {
  const win = globalThis.__cubelightWindow?.();
  if (!win) return;
  win.webContents.setZoomFactor(Math.min(1.4, Math.max(0.8, settings.appearance.uiScale)));
  try {
    win.setBackgroundColor(settings.appearance.background);
  } catch {
    // ignore
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __cubelightWindow: (() => BrowserWindow | null) | undefined;
}

export function registerIpc(context: IpcContext): void {
  globalThis.__cubelightWindow = context.getWindow;

  register("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    isPackaged: app.isPackaged,
    dataDir: dataDir(),
  }));

  register("app:openExternal", async (_event, url: unknown) => {
    if (typeof url !== "string") throw new Error("Invalid URL.");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Invalid URL.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only http and https links can be opened.");
    }
    await shell.openExternal(parsed.toString());
  });

  register("app:quit", () => {
    context.quit();
  });

  register("app:showWindow", () => {
    const win = context.getWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  register("settings:get", () => getSettings());

  register("settings:update", (_event, patch: DeepPartial<Settings>) => {
    const next = updateSettings(patch);
    invalidateJavaCache();
    applyWindowSettings(next);
    return next;
  });

  register("settings:reset", () => {
    const next = resetSettings();
    invalidateJavaCache();
    applyWindowSettings(next);
    return next;
  });

  register("settings:chooseDirectory", async (event, title?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? requireWindow(context);
    const result = await dialog.showOpenDialog(win, {
      title: title || "Choose a folder",
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  register("settings:chooseFile", async (event, title?: string, filters?: DialogFilter[]) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? requireWindow(context);
    const result = await dialog.showOpenDialog(win, {
      title: title || "Choose a file",
      properties: ["openFile"],
      filters: filters?.length ? filters : [{ name: "Java executable", extensions: ["exe", "bin", "*"] }],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  register("settings:openPath", async (_event, target: unknown) => {
    if (typeof target !== "string" || !target.trim()) throw new Error("Invalid path.");
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  });

  register("window:minimize", () => {
    context.getWindow()?.minimize();
  });

  register("window:toggleMaximize", () => {
    const win = context.getWindow();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });

  register("window:close", () => {
    context.getWindow()?.close();
  });

  register("window:isMaximized", () => context.getWindow()?.isMaximized() ?? false);

  register("window:setZoom", (_event, factor: unknown) => {
    const win = context.getWindow();
    if (!win) return;
    const value = Math.min(1.4, Math.max(0.8, Number(factor) || 1));
    win.webContents.setZoomFactor(value);
  });

  register("instances:list", () => listInstances());

  register("instances:create", (_event, input: CreateInstanceInput) => {
    const instance = createInstance(input);
    refreshTray();
    return instance;
  });

  register("instances:update", (_event, id: string, patch: DeepPartial<Instance>) => {
    const instance = updateInstance(id, patch);
    refreshTray();
    return instance;
  });

  register("instances:remove", async (_event, id: string) => {
    const game = running.get(id);
    if (game) killGame(game.child);
    running.delete(id);
    await removeInstance(id);
    refreshTray();
  });

  register("instances:openFolder", async (_event, id: string) => {
    const target = instanceGamePath(id);
    fs.mkdirSync(target, { recursive: true });
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  });

  register("game:versions", (_event, includeSnapshots: boolean) => getGameVersions(Boolean(includeSnapshots)));

  register("game:java", () => detectJava(true));

  register("game:install", async (_event, id: string) => {
    if (installing.has(id)) throw new Error("This instance is already installing.");
    if (running.has(id)) throw new Error("Close the game before reinstalling this instance.");
    installing.add(id);
    context.broadcast("game:state", { instanceId: id, state: "installing" });
    try {
      const instance = await installInstance(id, (progress) => {
        context.broadcast("game:progress", { instanceId: id, ...progress });
      });
      refreshTray();
      return instance;
    } catch (error) {
      logger.warn(`Install failed for ${id}`, error);
      throw error;
    } finally {
      installing.delete(id);
      context.broadcast("game:state", { instanceId: id, state: "stopped" });
    }
  });

  register("game:launch", async (_event, id: string) => launchGame(id, context));

  register("game:stop", (_event, id: string) => {
    const game = running.get(id);
    if (!game) return;
    killGame(game.child);
    running.delete(id);
    context.broadcast("game:state", { instanceId: id, state: "stopped", message: "Game stopped" });
  });

  register("mods:search", (_event, query: ModSearchQuery) => searchMods(query));

  register("mods:versions", (_event, query: ModVersionQuery) => getModVersions(query));

  register("mods:install", async (_event, input: InstallModInput) => {
    const mod = await installMod(input, (stage, percent, indeterminate) => {
      context.broadcast("mods:progress", {
        instanceId: input.instanceId,
        projectId: input.projectId,
        title: input.title,
        stage,
        percent,
        indeterminate,
      });
    });
    return mod;
  });

  register("mods:uninstall", (_event, instanceId: string, key: string) => {
    uninstallMod(instanceId, key);
  });

  register("mods:toggle", (_event, instanceId: string, key: string) => toggleMod(instanceId, key));

  register("mods:installed", (_event, instanceId: string) => getInstalled(instanceId));

  register("auth:get", () => getPublicAccount());

  register("auth:offline", (_event, name: string) => {
    const account = setOfflineAccount(name);
    context.broadcast("auth:account", account);
    return account;
  });

  register("auth:microsoftStart", async (_event, clientId: string) => {
    return beginMicrosoftLogin(clientId, {
      deviceCode: (info) => context.broadcast("auth:device-code", info),
      account: (account) => context.broadcast("auth:account", account),
      error: (message) => context.broadcast("auth:error", message),
    });
  });

  register("auth:logout", () => {
    const account = logout();
    context.broadcast("auth:account", account);
    return account;
  });

  register("updater:status", () => getUpdateStatus());
  register("updater:check", () => checkForUpdates());
  register("updater:download", () => downloadUpdate());
  register("updater:install", () => installUpdate());
}

export async function launchGame(id: string, context: IpcContext): Promise<void> {
  if (installing.has(id)) throw new Error("Wait for the instance to finish installing.");
  if (running.has(id)) throw new Error("This instance is already running.");
  const instance = getInstance(id);
  if (!instance.installed) throw new Error("Install this instance before launching it.");

  const account = await getAccountForLaunch();
  context.broadcast("game:state", { instanceId: id, state: "launching" });
  let exited = false;

  try {
    const game = await launchInstance(instance, account, {
      onState: (state, message, code) => {
        context.broadcast("game:state", { instanceId: id, state, message, code });
        if (state === "running") {
          updateInstance(id, { lastPlayed: Date.now() });
          const win = context.getWindow();
          if (win && getSettings().launcher.minimizeOnLaunch) win.minimize();
        }
        if (state === "stopped" || state === "crashed") {
          exited = true;
          running.delete(id);
          updateInstance(id, { lastPlayed: Date.now() });
        }
      },
      onLog: (line, stream) => {
        context.broadcast("game:log", { instanceId: id, line, stream });
      },
    });
    if (!exited) running.set(id, game);
    updateInstance(id, { lastPlayed: Date.now() });
  } catch (error) {
    running.delete(id);
    context.broadcast("game:state", {
      instanceId: id,
      state: "crashed",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function killAllGames(): void {
  for (const game of running.values()) {
    killGame(game.child);
  }
  running.clear();
}

export function navigateTo(page: AppPage): void {
  const win = globalThis.__cubelightWindow?.();
  if (!win) return;
  win.webContents.send("app:navigate", page);
}

export function ensureDataDirs(): void {
  ensureDirs();
}
