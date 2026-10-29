import { create } from "zustand";
import { DEFAULT_SETTINGS } from "@shared/defaults";
import type {
  AppInfo,
  AppPage,
  CreateInstanceInput,
  DeepPartial,
  DeviceCodeInfo,
  GameProgress,
  Instance,
  InstallModInput,
  JavaInfo,
  LaunchState,
  ModProgress,
  ModSearchResult,
  PublicAccount,
  Settings,
  UpdateStatus,
} from "@shared/types";
import { api, errorMessage } from "@/lib/api";
import { deepMerge } from "@/lib/merge";
import { applyAppearance } from "@/lib/theme";

export type ToastTone = "info" | "success" | "error";
export type SettingsTab = "appearance" | "launch" | "integrations" | "updates" | "about" | "terms" | "privacy";

export interface Toast {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
}

interface AppStore {
  ready: boolean;
  page: AppPage;
  settingsTab: SettingsTab;
  settings: Settings;
  appInfo: AppInfo | null;
  instances: Instance[];
  account: PublicAccount | null;
  java: JavaInfo[];
  javaLoaded: boolean;
  update: UpdateStatus;
  deviceCode: DeviceCodeInfo | null;
  gameProgress: Record<string, GameProgress>;
  launchStates: Record<string, LaunchState>;
  logs: Record<string, string[]>;
  modProgress: ModProgress[];
  toasts: Toast[];
  maximized: boolean;
  accountModalOpen: boolean;
  openMod: ModSearchResult | null;
  modTargetId: string | null;

  init: () => Promise<void>;
  navigate: (page: AppPage) => void;
  openSettings: (tab?: SettingsTab) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  patchSettings: (patch: DeepPartial<Settings>) => void;
  resetSettings: () => Promise<void>;
  toggleSidebar: () => void;
  toast: (input: ToastInput) => void;
  dismissToast: (id: number) => void;

  refreshInstances: () => Promise<void>;
  createInstance: (input: CreateInstanceInput, install?: boolean) => Promise<Instance>;
  updateInstance: (id: string, patch: DeepPartial<Instance>) => Promise<Instance>;
  removeInstance: (id: string) => Promise<void>;
  installInstance: (id: string) => Promise<Instance>;
  launchInstance: (id: string) => Promise<void>;
  stopInstance: (id: string) => Promise<void>;

  installMod: (input: InstallModInput) => Promise<void>;
  uninstallMod: (instanceId: string, key: string) => Promise<void>;
  toggleMod: (instanceId: string, key: string) => Promise<void>;
  clearModProgress: (projectId: string, instanceId: string) => void;

  loadJava: (force?: boolean) => Promise<void>;

  offlineLogin: (name: string) => Promise<void>;
  microsoftLogin: (clientId: string) => Promise<DeviceCodeInfo>;
  logout: () => Promise<void>;
  openAccount: () => void;
  closeAccount: () => void;

  checkUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;

  setOpenMod: (mod: ModSearchResult | null) => void;
  browseMods: (instanceId?: string) => void;
  setModTarget: (instanceId: string | null) => void;
}

let initialized = false;
let toastSeq = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPatch: DeepPartial<Settings> = {};

function upsert(list: Instance[], instance: Instance): Instance[] {
  const index = list.findIndex((item) => item.id === instance.id);
  if (index === -1) return [instance, ...list];
  const next = [...list];
  next[index] = instance;
  return next;
}

function sameMod(a: { projectId: string; provider: string; type: string }, b: { projectId: string; provider: string; type: string }): boolean {
  return a.projectId === b.projectId && a.provider === b.provider && a.type === b.type;
}

export const useApp = create<AppStore>()((set, get) => ({
  ready: false,
  page: "home",
  settingsTab: "appearance",
  settings: structuredClone(DEFAULT_SETTINGS),
  appInfo: null,
  instances: [],
  account: null,
  java: [],
  javaLoaded: false,
  update: { state: "idle" },
  deviceCode: null,
  gameProgress: {},
  launchStates: {},
  logs: {},
  modProgress: [],
  toasts: [],
  maximized: false,
  accountModalOpen: false,
  openMod: null,
  modTargetId: null,

  init: async () => {
    if (initialized) return;
    initialized = true;

    const [settingsResult, infoResult, instancesResult, accountResult, updateResult, maximizedResult] =
      await Promise.allSettled([
        api.settings.get(),
        api.app.info(),
        api.instances.list(),
        api.auth.get(),
        api.updater.status(),
        api.window.isMaximized(),
      ]);

    const settings = settingsResult.status === "fulfilled" ? settingsResult.value : structuredClone(DEFAULT_SETTINGS);
    applyAppearance(settings);

    set({
      settings,
      appInfo: infoResult.status === "fulfilled" ? infoResult.value : null,
      instances: instancesResult.status === "fulfilled" ? instancesResult.value : [],
      account: accountResult.status === "fulfilled" ? accountResult.value : null,
      update: updateResult.status === "fulfilled" ? updateResult.value : { state: "idle" },
      maximized: maximizedResult.status === "fulfilled" ? maximizedResult.value : false,
      ready: true,
    });

    api.game.onProgress((event) => {
      set((state) => ({
        gameProgress: { ...state.gameProgress, [event.instanceId]: event },
      }));
    });

    api.game.onState((event) => {
      const previous = get().launchStates[event.instanceId]?.state;
      set((state) => ({
        launchStates: { ...state.launchStates, [event.instanceId]: event },
      }));

      if (event.state === "launching") {
        set((state) => ({ logs: { ...state.logs, [event.instanceId]: [] } }));
      }

      if (event.state === "running" && previous === "launching") {
        const instance = get().instances.find((item) => item.id === event.instanceId);
        get().toast({
          title: "Minecraft is running",
          message: instance ? `${instance.name} started successfully.` : undefined,
          tone: "success",
        });
      }

      if (event.state === "stopped" || event.state === "crashed") {
        set((state) => {
          const progress = { ...state.gameProgress };
          delete progress[event.instanceId];
          return { gameProgress: progress };
        });
        void get().refreshInstances();
      }

      if (event.state === "crashed" && previous === "running") {
        get().toast({
          title: "Minecraft crashed",
          message: event.message ?? "The game exited unexpectedly.",
          tone: "error",
        });
      }
    });

    api.game.onLog((event) => {
      set((state) => {
        const existing = state.logs[event.instanceId] ?? [];
        const next = [...existing, event.line];
        if (next.length > 3000) next.splice(0, next.length - 3000);
        return { logs: { ...state.logs, [event.instanceId]: next } };
      });
    });

    api.mods.onProgress((event) => {
      set((state) => {
        const index = state.modProgress.findIndex(
          (item) => item.instanceId === event.instanceId && item.projectId === event.projectId,
        );
        const next = [...state.modProgress];
        if (index === -1) next.push(event);
        else next[index] = event;
        return { modProgress: next.slice(-6) };
      });
    });

    api.updater.onStatus((status) => {
      const previous = get().update;
      set({ update: status });
      if (status.state === "downloaded" && previous.state !== "downloaded") {
        get().toast({
          title: "Update ready",
          message: status.version ? `Cubelight ${status.version} is ready to install.` : undefined,
          tone: "success",
        });
      }
    });

    api.auth.onDeviceCode((info) => set({ deviceCode: info }));
    api.auth.onAccount((account) => set({ account }));
    api.auth.onError((message) => {
      get().toast({ title: "Microsoft sign-in failed", message, tone: "error" });
    });

    api.app.onNavigate((page) => set({ page }));
    api.window.onMaximizeChange((maximized) => set({ maximized }));
  },

  navigate: (page) => set({ page }),
  openSettings: (tab) => set({ page: "settings", settingsTab: tab ?? get().settingsTab }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  patchSettings: (patch) => {
    const next = deepMerge(get().settings, patch);
    const previousScale = get().settings.appearance.uiScale;
    set({ settings: next });
    applyAppearance(next);
    if (next.appearance.uiScale !== previousScale) {
      void api.window.setZoom(next.appearance.uiScale).catch(() => undefined);
    }

    pendingPatch = deepMerge(pendingPatch, patch);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const payload = pendingPatch;
      pendingPatch = {};
      saveTimer = null;
      try {
        await api.settings.update(payload);
      } catch (error) {
        get().toast({ title: "Could not save settings", message: errorMessage(error), tone: "error" });
      }
    }, 320);
  },

  resetSettings: async () => {
    try {
      const settings = await api.settings.reset();
      set({ settings });
      applyAppearance(settings);
      get().toast({ title: "Settings reset", message: "Everything is back to the defaults.", tone: "success" });
    } catch (error) {
      get().toast({ title: "Could not reset settings", message: errorMessage(error), tone: "error" });
    }
  },

  toggleSidebar: () => {
    get().patchSettings({ appearance: { sidebarCollapsed: !get().settings.appearance.sidebarCollapsed } });
  },

  toast: (input) => {
    const toast: Toast = {
      id: ++toastSeq,
      title: input.title,
      message: input.message,
      tone: input.tone ?? "info",
    };
    set((state) => ({ toasts: [...state.toasts.slice(-3), toast] }));
    setTimeout(() => get().dismissToast(toast.id), 5200);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),

  refreshInstances: async () => {
    try {
      const instances = await api.instances.list();
      set({ instances });
    } catch (error) {
      get().toast({ title: "Could not load instances", message: errorMessage(error), tone: "error" });
    }
  },

  createInstance: async (input, install = true) => {
    const instance = await api.instances.create(input);
    set((state) => ({ instances: [instance, ...state.instances] }));
    get().toast({ title: "Instance created", message: `${instance.name} is ready.`, tone: "success" });
    if (install && instance.kind === "client") {
      void get()
        .installInstance(instance.id)
        .catch(() => undefined);
    }
    return instance;
  },

  updateInstance: async (id, patch) => {
    const instance = await api.instances.update(id, patch);
    set((state) => ({ instances: upsert(state.instances, instance) }));
    return instance;
  },

  removeInstance: async (id) => {
    const instance = get().instances.find((item) => item.id === id);
    await api.instances.remove(id);
    set((state) => ({ instances: state.instances.filter((item) => item.id !== id) }));
    get().toast({
      title: "Instance deleted",
      message: instance ? `${instance.name} and its files were removed.` : undefined,
      tone: "info",
    });
  },

  installInstance: async (id) => {
    set((state) => ({ launchStates: { ...state.launchStates, [id]: { instanceId: id, state: "installing" } } }));
    try {
      const instance = await api.game.install(id);
      set((state) => ({ instances: upsert(state.instances, instance) }));
      get().toast({ title: "Instance installed", message: `${instance.name} is ready to launch.`, tone: "success" });
      return instance;
    } catch (error) {
      get().toast({ title: "Install failed", message: errorMessage(error), tone: "error" });
      set((state) => ({ launchStates: { ...state.launchStates, [id]: { instanceId: id, state: "stopped" } } }));
      throw error;
    }
  },

  launchInstance: async (id) => {
    const instance = get().instances.find((item) => item.id === id);
    if (!instance) return;
    if (instance.kind === "server") {
      get().toast({ title: "Server instance", message: "Server instances hold plugins and folders only.", tone: "info" });
      return;
    }
    if (!instance.installed) {
      try {
        await get().installInstance(id);
      } catch {
        return;
      }
    }
    try {
      await api.game.launch(id);
    } catch (error) {
      get().toast({ title: "Could not launch", message: errorMessage(error), tone: "error" });
    }
  },

  stopInstance: async (id) => {
    try {
      await api.game.stop(id);
    } catch (error) {
      get().toast({ title: "Could not stop the game", message: errorMessage(error), tone: "error" });
    }
  },

  installMod: async (input) => {
    try {
      const mod = await api.mods.install(input);
      set((state) => ({
        instances: state.instances.map((instance) =>
          instance.id === input.instanceId
            ? {
                ...instance,
                installedMods: [mod, ...instance.installedMods.filter((item) => !sameMod(item, mod))],
              }
            : instance,
        ),
      }));
      get().toast({ title: `${mod.title} installed`, message: `Added to the instance.`, tone: "success" });
    } catch (error) {
      get().toast({ title: "Install failed", message: errorMessage(error), tone: "error" });
      throw error;
    } finally {
      setTimeout(() => get().clearModProgress(input.projectId, input.instanceId), 2400);
    }
  },

  uninstallMod: async (instanceId, key) => {
    try {
      await api.mods.uninstall(instanceId, key);
      set((state) => ({
        instances: state.instances.map((instance) =>
          instance.id === instanceId
            ? { ...instance, installedMods: instance.installedMods.filter((item) => item.key !== key) }
            : instance,
        ),
      }));
      get().toast({ title: "Removed", message: "The file was deleted from the instance.", tone: "info" });
    } catch (error) {
      get().toast({ title: "Could not remove the file", message: errorMessage(error), tone: "error" });
    }
  },

  toggleMod: async (instanceId, key) => {
    try {
      const mod = await api.mods.toggle(instanceId, key);
      set((state) => ({
        instances: state.instances.map((instance) =>
          instance.id === instanceId
            ? { ...instance, installedMods: instance.installedMods.map((item) => (item.key === key ? mod : item)) }
            : instance,
        ),
      }));
    } catch (error) {
      get().toast({ title: "Could not update the file", message: errorMessage(error), tone: "error" });
    }
  },

  clearModProgress: (projectId, instanceId) => {
    set((state) => ({
      modProgress: state.modProgress.filter(
        (item) => !(item.projectId === projectId && item.instanceId === instanceId),
      ),
    }));
  },

  loadJava: async (force = false) => {
    if (get().javaLoaded && !force) return;
    try {
      const java = await api.game.java();
      set({ java, javaLoaded: true });
    } catch {
      set({ javaLoaded: true });
    }
  },

  offlineLogin: async (name) => {
    const account = await api.auth.offline(name);
    set({ account });
    get().toast({ title: "Signed in", message: `Playing as ${account.name}.`, tone: "success" });
  },

  microsoftLogin: async (clientId) => {
    const info = await api.auth.microsoftStart(clientId);
    set({ deviceCode: info });
    return info;
  },

  logout: async () => {
    const account = await api.auth.logout();
    set({ account, deviceCode: null });
    get().toast({ title: "Signed out", message: "Using an offline profile again.", tone: "info" });
  },

  openAccount: () => set({ accountModalOpen: true }),
  closeAccount: () => set({ accountModalOpen: false }),

  checkUpdates: async () => {
    try {
      const status = await api.updater.check();
      set({ update: status });
    } catch (error) {
      get().toast({ title: "Update check failed", message: errorMessage(error), tone: "error" });
    }
  },

  downloadUpdate: async () => {
    try {
      const status = await api.updater.download();
      set({ update: status });
    } catch (error) {
      get().toast({ title: "Download failed", message: errorMessage(error), tone: "error" });
    }
  },

  installUpdate: async () => {
    try {
      await api.updater.install();
    } catch (error) {
      get().toast({ title: "Could not install the update", message: errorMessage(error), tone: "error" });
    }
  },

  setOpenMod: (mod) => set({ openMod: mod }),
  browseMods: (instanceId) => set({ page: "mods", modTargetId: instanceId ?? null }),
  setModTarget: (instanceId) => set({ modTargetId: instanceId }),
}));
