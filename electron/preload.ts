import { contextBridge, ipcRenderer } from "electron";
import type {
  AppPage,
  CubelightApi,
  DeviceCodeInfo,
  GameLogEvent,
  GameProgress,
  LaunchState,
  ModProgress,
  PublicAccount,
  UpdateStatus,
} from "../shared/types";

function on<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: CubelightApi = {
  app: {
    info: () => ipcRenderer.invoke("app:info"),
    openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
    quit: () => ipcRenderer.invoke("app:quit"),
    showWindow: () => ipcRenderer.invoke("app:showWindow"),
    onNavigate: (cb) => on<AppPage>("app:navigate", cb),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (patch) => ipcRenderer.invoke("settings:update", patch),
    reset: () => ipcRenderer.invoke("settings:reset"),
    chooseDirectory: (title) => ipcRenderer.invoke("settings:chooseDirectory", title),
    chooseFile: (title, filters) => ipcRenderer.invoke("settings:chooseFile", title, filters),
    openPath: (target) => ipcRenderer.invoke("settings:openPath", target),
  },
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
    setZoom: (factor) => ipcRenderer.invoke("window:setZoom", factor),
    onMaximizeChange: (cb) => on<boolean>("window:maximized", cb),
  },
  instances: {
    list: () => ipcRenderer.invoke("instances:list"),
    create: (input) => ipcRenderer.invoke("instances:create", input),
    update: (id, patch) => ipcRenderer.invoke("instances:update", id, patch),
    remove: (id) => ipcRenderer.invoke("instances:remove", id),
    openFolder: (id) => ipcRenderer.invoke("instances:openFolder", id),
  },
  game: {
    versions: (includeSnapshots) => ipcRenderer.invoke("game:versions", includeSnapshots),
    java: () => ipcRenderer.invoke("game:java"),
    install: (id) => ipcRenderer.invoke("game:install", id),
    launch: (id) => ipcRenderer.invoke("game:launch", id),
    stop: (id) => ipcRenderer.invoke("game:stop", id),
    onProgress: (cb) => on<GameProgress>("game:progress", cb),
    onState: (cb) => on<LaunchState>("game:state", cb),
    onLog: (cb) => on<GameLogEvent>("game:log", cb),
  },
  mods: {
    search: (query) => ipcRenderer.invoke("mods:search", query),
    versions: (query) => ipcRenderer.invoke("mods:versions", query),
    install: (input) => ipcRenderer.invoke("mods:install", input),
    uninstall: (instanceId, key) => ipcRenderer.invoke("mods:uninstall", instanceId, key),
    toggle: (instanceId, key) => ipcRenderer.invoke("mods:toggle", instanceId, key),
    installed: (instanceId) => ipcRenderer.invoke("mods:installed", instanceId),
    onProgress: (cb) => on<ModProgress>("mods:progress", cb),
  },
  auth: {
    get: () => ipcRenderer.invoke("auth:get"),
    offline: (name) => ipcRenderer.invoke("auth:offline", name),
    microsoftStart: (clientId) => ipcRenderer.invoke("auth:microsoftStart", clientId),
    logout: () => ipcRenderer.invoke("auth:logout"),
    onDeviceCode: (cb) => on<DeviceCodeInfo>("auth:device-code", cb),
    onAccount: (cb) => on<PublicAccount | null>("auth:account", cb),
    onError: (cb) => on<string>("auth:error", cb),
  },
  updater: {
    status: () => ipcRenderer.invoke("updater:status"),
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    onStatus: (cb) => on<UpdateStatus>("updater:status", cb),
  },
};

contextBridge.exposeInMainWorld("cubelight", api);
